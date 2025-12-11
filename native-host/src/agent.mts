import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  HumanMessage,
  isAIMessageChunk,
  isBaseMessageChunk,
  isToolMessage,
  type BaseMessageChunk,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
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
const reverseTool = tool(
  async ({ targetString }): Promise<string> => {
    return targetString.split("").reverse().join("");
  },
  {
    name: "reverse",
    description: "Reverse a given string",
    schema: z.object({
      targetString: z.string().describe("The string to reverse"),
    }),
  }
);

const calculatorTool = tool(
  async ({ expression }): Promise<string> => {
    try {
      // 本当は危険なやつなので…実験が終わったら消す
      const result = Function(`"use strict"; return (${expression})`)();
      return `Result: ${result}`;
    } catch {
      return "Error: Invalid expression";
    }
  },
  {
    name: "calculator",
    description: "Perform mathematical calculations",
    schema: z.object({
      expression: z
        .string()
        .describe("The mathematical expression to evaluate"),
    }),
  }
);

const tools = [reverseTool, calculatorTool];

function createLLM(config: AgentConfig): BaseChatModel {
  const { provider, apiBaseUrl, jwt, model } = config;

  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({
        modelName: model,
        anthropicApiKey: jwt,
        anthropicApiUrl: apiBaseUrl,
        streaming: true,
        clientOptions: {
          defaultHeaders: {
            Authorization: `Bearer ${jwt}`,
          },
        },
      });
    case "openai":
      return new ChatOpenAI({
        modelName: model,
        openAIApiKey: jwt,
        configuration: {
          baseURL: apiBaseUrl,
          defaultHeaders: {
            Authorization: `Bearer ${jwt}`,
          },
        },
        streaming: true,
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
function extractToolCallEvents(
  msg: BaseMessageChunk
): Array<{ toolName: string; toolArgs: string }> {
  const events: Array<{ toolName: string; toolArgs: string }> = [];

  if (!isAIMessageChunk(msg)) return events;

  const toolCalls = msg.tool_calls ?? [];
  for (const [i, toolCall] of toolCalls.entries()) {
    let args = "";
    // TODO: もうちょいいい感じに…
    const maybeChunkArgs = JSON.stringify(toolCall.args) === "{}";
    if (maybeChunkArgs) {
      const chunkArgs = msg.tool_call_chunks?.at(i)?.args || "";
      if (chunkArgs) args = chunkArgs;
    } else {
      args = JSON.stringify(toolCall.args || {});
    }

    events.push({ toolName: toolCall.name || "unknown", toolArgs: args });
  }

  return events;
}

function extractTokensFromContent(content: unknown): string[] {
  const tokens: string[] = [];
  if (!content) return tokens;

  if (typeof content === "string") {
    tokens.push(content);
    return tokens;
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && "type" in block) {
        if (
          block.type === "text" &&
          "text" in block &&
          typeof block.text === "string"
        ) {
          tokens.push(block.text);
        }
      }
    }
  }

  return tokens;
}

// TODO: Agentを生成する箇所と、実行する箇所を分けるたい
// 目的は以下
// - 同一セッションを引き継いで実行できるようにするため
// - AbortControllerを挟みやすくするため
// そのため、呼び出し元にAgentインスタンスを管理させる必要があるため、Class化した方が見通し良くなるかもしれない
export async function* runAgent(
  config: AgentConfig,
  prompt: string
): AsyncGenerator<AgentEvent> {
  const llm = createLLM(config);

  const agent = createReactAgent({
    llm,
    tools,
    prompt:
      "You are a helpful assistant. Use the available tools to help answer the user's questions.",
  });

  const stream = await agent.stream(
    { messages: [new HumanMessage(prompt)] },
    { streamMode: "messages" }
  );

  let currentMessage: BaseMessageChunk | undefined = undefined;
  let currentMessageId: string | undefined = undefined;

  for await (const chunk of stream) {
    const [message] = chunk;
    if (!message) continue;

    // TODO: debug起動用のOptionを何かしらつける、今はdebugの実装をコメントアウトしている
    debug(message);

    if (currentMessageId !== message.id) {
      if (
        currentMessage &&
        isAIMessageChunk(currentMessage) &&
        (currentMessage.tool_calls?.length ?? 0) > 0
      ) {
        const toolEvents = extractToolCallEvents(currentMessage);
        for (const ev of toolEvents) {
          yield {
            type: "tool_call",
            toolName: ev.toolName,
            toolArgs: ev.toolArgs,
          };
        }
      }

      currentMessageId = undefined;
      currentMessage = undefined;
    }

    if (isBaseMessageChunk(message) && isAIMessageChunk(message)) {
      if (currentMessageId !== message.id) {
        currentMessageId = message.id;
        currentMessage = message;
      } else {
        currentMessage = currentMessage!.concat(message);
      }

      const aiMessage = message;
      const tokens = extractTokensFromContent(aiMessage.content);
      for (const t of tokens) {
        yield { type: "token", token: t };
      }
    }

    if (isToolMessage(message)) {
      const toolMessage = message;
      yield {
        type: "tool_result",
        toolName: toolMessage.name || "unknown",
        result: toolMessage.content,
      };
    }
  }

  yield { type: "final" };
}
