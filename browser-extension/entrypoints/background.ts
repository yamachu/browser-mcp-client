import { JWT_SNIFFER_URI, NATIVE_HOST_NAME } from "@/src/Contract";
import { saveJwt } from "@/src/utils/storage";
import type { ExtensionMessage, MessageResponseMap } from "@/types/messaging";
import type {
  ToExtensionChatResponse,
  ToExtensionReverseResponse,
  ToNativeChatMessage,
  ToNativeReverseMessage,
} from "shared-types";

// 繋ぎっぱにするため、Portを使ってみる
let nativePort: ReturnType<typeof browser.runtime.connectNative> | null = null;

function getNativePort(): ReturnType<typeof browser.runtime.connectNative> {
  if (nativePort === null) {
    nativePort = browser.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((message: unknown) => {
      console.log("Native host message:", message);

      const chatResponse = message as ToExtensionChatResponse;
      if (
        chatResponse &&
        "type" in chatResponse &&
        "messageId" in chatResponse
      ) {
        browser.runtime.sendMessage({
          type: "CHAT_STREAM_EVENT",
          data: chatResponse,
        });
      }
    });

    nativePort.onDisconnect.addListener(() => {
      console.log("Native host disconnected");
      nativePort = null;
    });
  }

  return nativePort;
}

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const host = new URL(details.url).host;
      const authHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "authorization"
      );

      if (authHeader?.value?.startsWith("Bearer ")) {
        const token = authHeader.value.slice("Bearer ".length);
        saveJwt(host, token);
      }

      return {};
    },
    {
      urls: JWT_SNIFFER_URI.map((uri) => `${uri}/*`),
    },
    ["requestHeaders"]
  );

  // https://developer.mozilla.org/ja/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#sendresponse
  browser.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender,
      sendResponse: (response: MessageResponseMap[typeof message.type]) => void
    ) => {
      console.log("Background received message:", message);

      if (message.type === "REVERSE_STRING") {
        browser.runtime
          .sendNativeMessage(NATIVE_HOST_NAME, {
            action: "reverse",
            text: message.text,
          } satisfies ToNativeReverseMessage)
          .then((response: ToExtensionReverseResponse) => {
            console.log("Native host response:", response);
            if ("reversed" in response)
              sendResponse({ success: true, reversed: response.reversed });
            else sendResponse({ success: false, error: response.error });
          })
          .catch((error: Error) => {
            console.error("Native messaging error:", error);
            sendResponse({ success: false, error: error.message });
          });

        return true;
      }

      if (message.type === "CHAT") {
        try {
          const port = getNativePort();
          const messageId = crypto.randomUUID();

          port.postMessage({
            action: "chat",
            prompt: message.prompt,
            jwt: message.jwt,
            apiBaseUrl: message.apiBaseUrl,
            provider: message.provider,
            model: message.model,
          } satisfies ToNativeChatMessage);

          sendResponse({ success: true, messageId });
        } catch (error) {
          console.error("Chat error:", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        return true;
      }
    }
  );
});
