import {
  readMessage,
  toBufferedMessage,
  writeMessage,
} from "native-messaging/src/index.js";
import type { ToExtensionResponse, ToNativeMessage } from "shared-types";

async function handleMessage(
  message: ToNativeMessage
): Promise<ToExtensionResponse> {
  switch (message.action) {
    case "reverse":
      const reversed = reverseString(message.text);
      return { reversed };

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
