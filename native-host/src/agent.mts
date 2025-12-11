import { createAnthropic } from "@ai-sdk/anthropic";
import {
  experimental_createMCPClient,
  experimental_MCPClient,
} from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";

function debug(...args: unknown[]): void {
  // NOTE: stdoutに出すとNativeMessagingの通信が壊れるのでstderrに出す
  // console.error("[DEBUG]", ...args);
}

export interface AgentConfig {
  provider: "openai" | "anthropic";
  apiBaseUrl: string;
  jwt: string;
  model: string;
}

export type AgentEvent =
  | { type: "tool_call"; toolName: string; toolArgs: string }
  | { type: "tool_result"; toolName: string; result: unknown }
  | { type: "token"; token: string }
  | { type: "final" };

// とりあえず実験用のツールを2つ用意
const reverseTool = tool({
  description: "Reverse a given string",
  inputSchema: z.object({
    targetString: z.string().describe("The string to reverse"),
  }),
  execute: async ({ targetString }: { targetString: string }) => {
    return targetString.split("").reverse().join("");
  },
});

const calculatorTool = tool({
  description: "Perform mathematical calculations",
  inputSchema: z.object({
    expression: z.string().describe("The mathematical expression to evaluate"),
  }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      // 本当は危険なやつなので…実験が終わったら消す
      const result = Function(`"use strict"; return (${expression})`)();
      return `Result: ${result}`;
    } catch {
      return "Error: Invalid expression";
    }
  },
});

const localTools = {
  reverse: reverseTool,
  calculator: calculatorTool,
};

async function loadMcpTools(userDefinedTools: Array<any> = []) {
  const mcpClients: experimental_MCPClient[] = [];
  const mcpTools: Awaited<ReturnType<experimental_MCPClient["tools"]>> = {};

  for (const toolConfig of userDefinedTools) {
    try {
      if (
        !(
          toolConfig.transport === undefined || toolConfig.transport === "stdio"
        )
      ) {
        debug("Unsupported transport:", toolConfig.transport);
        continue;
      }
      const transport = new Experimental_StdioMCPTransport({
        command: toolConfig.command,
        args: toolConfig.args,
      });

      const client = await experimental_createMCPClient({
        name: "browser-mcp-client",
        version: "1.0.0",
        capabilities: {},
        transport,
      });

      mcpClients.push(client);

      const toolsResult = await client.tools();

      debug("Loaded MCP tools:", Object.keys(toolsResult));

      for (const [toolName, mcpTool] of Object.entries(toolsResult)) {
        mcpTools[toolName] = mcpTool;
      }
    } catch (error) {
      debug("Failed to load MCP tool:", error);
    }
  }

  return { mcpTools, mcpClients };
}

function createLLM(config: AgentConfig) {
  const { provider, apiBaseUrl, jwt, model } = config;

  switch (provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: jwt,
        baseURL: apiBaseUrl,
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      })(model);
    case "openai":
      return createOpenAI({
        apiKey: jwt,
        baseURL: apiBaseUrl,
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      })(model);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// TODO: Agentを生成する箇所と、実行する箇所を分けるたい
// 目的は以下
// - 同一セッションを引き継いで実行できるようにするため
// - AbortControllerを挟みやすくするため
// そのため、呼び出し元にAgentインスタンスを管理させる必要があるため、Class化した方が見通し良くなるかもしれない
export async function* runAgent(
  config: AgentConfig,
  prompt: string,
  userDefinedTools?: Array<Record<string, unknown>>
): AsyncGenerator<AgentEvent> {
  const model = createLLM(config);

  const { mcpTools, mcpClients } = await loadMcpTools(userDefinedTools);

  try {
    const result = streamText({
      model,
      tools: {
        ...localTools,
        ...mcpTools,
      },
      stopWhen: stepCountIs(10), // 一旦10ステップで止める
      messages: [{ role: "user", content: prompt }],
      // TODO: abortSignal
    });

    for await (const part of result.fullStream) {
      debug("Received part:", part);
      switch (part.type) {
        // text-start, text-endは無視してtext-deltaだけ処理
        case "text-delta":
          yield { type: "token", token: part.text };
          break;

        case "tool-call":
          yield {
            type: "tool_call",
            toolName: part.toolName,
            toolArgs: JSON.stringify(part.input),
          };
          break;

        case "tool-result":
          yield {
            type: "tool_result",
            toolName: part.toolName,
            result: part.output,
          };
          break;

        case "error":
          debug("Stream error:", part.error);
          break;
      }
    }

    yield { type: "final" };
  } finally {
    for (const client of mcpClients) {
      try {
        await client.close();
      } catch (e) {
        debug("Error closing MCP client:", e);
      }
    }
  }
}
