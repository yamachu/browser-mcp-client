import {
  readMessage,
  toBufferedMessage,
  writeMessage,
} from "native-messaging/src/index.js";
import type {
  ToExtensionChatResponse,
  ToExtensionResponse,
  ToNativeChatMessage,
  ToNativeMessage,
} from "shared-types";
import { runAgent } from "./agent.mjs";

function generateMessageId(): string {
  return crypto.randomUUID();
}

function sendChatResponse(response: ToExtensionChatResponse): void {
  writeMessage(toBufferedMessage(response));
}

async function handleChatMessage(message: ToNativeChatMessage): Promise<void> {
  const messageId = generateMessageId();

  try {
    // Start signal
    sendChatResponse({
      type: "thinking",
      messageId,
    });

    const config = {
      provider: message.provider,
      apiBaseUrl: message.apiBaseUrl,
      jwt: message.jwt,
      model: message.model,
    };

    const tools = message.tools;

    for await (const event of runAgent(config, message.prompt, tools)) {
      switch (event.type) {
        case "tool_call":
          sendChatResponse({
            type: "tool_call",
            messageId,
            toolName: event.toolName,
            toolArgs: event.toolArgs,
          });
          break;
        case "tool_result":
          sendChatResponse({
            type: "tool_result",
            messageId,
            toolName: event.toolName,
            result: event.result,
          });
          break;
        case "token":
          sendChatResponse({
            type: "token",
            messageId,
            token: event.token,
          });
          break;
        case "final":
          break;
        default: {
          const _ = event satisfies never;
        }
      }
    }

    sendChatResponse({
      type: "final",
      messageId,
    });
  } catch (error) {
    sendChatResponse({
      type: "error",
      messageId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleMessage(
  message: ToNativeMessage
): Promise<ToExtensionResponse | null> {
  switch (message.action) {
    case "reverse":
      const reversed = reverseString(message.text);
      return { reversed };

    case "chat":
      await handleChatMessage(message);
      return null;

    default:
      return { error: "Invalid action or missing text" };
  }
}

function reverseString(str: string): string {
  return str.split("").reverse().join("");
}

async function main(): Promise<void> {
  while (true) {
    try {
      const message = await readMessage<ToNativeMessage>();

      if (message === null) {
        break;
      }

      const response = await handleMessage(message);

      // TODO: 1MB以内かどうかチェック、長かった場合は分割して送れるようにメッセージ型を変えたいけれども………
      if (response !== null) {
        writeMessage(toBufferedMessage(response));
      }
    } catch (error) {
      writeMessage(
        toBufferedMessage({
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }
}

main();
