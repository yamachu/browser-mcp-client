import { stdin, stdout } from "node:process";
import type { ToExtensionResponse, ToNativeMessage } from "shared-types";

export function writeMessage(response: Buffer): void {
  if (response.length > 1024 * 1024) {
    throw new Error("Message size exceeds 1MB");
  }
  stdout.write(response);
}

export function toBufferedMessage(response: ToExtensionResponse): Buffer {
  const messageText = JSON.stringify(response);
  const messageBuffer = Buffer.from(messageText, "utf-8");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  return Buffer.concat([lengthBuffer, messageBuffer]);
}

// https://developer.mozilla.org/ja/docs/Mozilla/Add-ons/WebExtensions/Native_messaging
export function readMessage(): Promise<ToNativeMessage | null> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const onErrorOrClose = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    };

    const onError = (err: Error) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(err);
      }
    };

    stdin.once("close", onErrorOrClose);
    stdin.once("end", onErrorOrClose);
    stdin.once("error", onError);

    const cleanup = () => {
      stdin.removeListener("close", onErrorOrClose);
      stdin.removeListener("end", onErrorOrClose);
      stdin.removeListener("error", onError);
    };

    const lengthBuffer = Buffer.alloc(4);
    let bytesRead = 0;

    const readLength = () => {
      if (resolved) return;

      const chunk = stdin.read(4 - bytesRead) as Buffer | null;
      if (chunk === null) {
        stdin.once("readable", readLength);
        return;
      }
      chunk.copy(lengthBuffer, bytesRead);
      bytesRead += chunk.length;

      if (bytesRead < 4) {
        stdin.once("readable", readLength);
        return;
      }

      const messageLength = lengthBuffer.readUInt32LE(0);

      // Chrome は最大64MBまで許容しているっぽい
      // https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging?hl=ja#native-messaging-host-protocol
      if (messageLength > 64 * 1024 * 1024) {
        resolved = true;
        cleanup();
        reject(new Error(`Message size ${messageLength} exceeds 64MB limit`));
        return;
      }

      readMessageBody(messageLength);
    };

    const readMessageBody = (length: number) => {
      const messageBuffer = Buffer.alloc(length);
      let messageBytesRead = 0;

      const readBody = () => {
        if (resolved) return;

        const chunk = stdin.read(length - messageBytesRead) as Buffer | null;
        if (chunk === null) {
          stdin.once("readable", readBody);
          return;
        }
        chunk.copy(messageBuffer, messageBytesRead);
        messageBytesRead += chunk.length;

        if (messageBytesRead < length) {
          stdin.once("readable", readBody);
          return;
        }

        resolved = true;
        cleanup();

        try {
          const message = JSON.parse(
            messageBuffer.toString("utf8")
          ) as ToNativeMessage;
          resolve(message);
        } catch (err) {
          reject(new Error(`Failed to parse message: ${err}`));
        }
      };

      readBody();
    };

    readLength();
  });
}
