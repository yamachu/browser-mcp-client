import type { ToExtensionResponse, ToNativeMessage } from "shared-types";
import {
  readMessage,
  toBufferedMessage,
  writeMessage,
} from "./native-messaging.mjs";

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
  try {
    const message = await readMessage();

    if (message === null) {
      return;
    }

    const response = await handleMessage(message);

    // TODO: 1MB以内かどうかチェック、長かった場合は分割して送れるようにメッセージ型を変えたいけれども………
    writeMessage(toBufferedMessage(response));
  } catch (error) {
    writeMessage(
      toBufferedMessage({
        error: error instanceof Error ? error.message : "Unknown error",
      })
    );
  }
}

main();
