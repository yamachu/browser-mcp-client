import { JWT_SNIFFER_URI, NATIVE_HOST_NAME } from "@/src/Contract";
import { saveJwt } from "@/src/utils/storage";
import type { ExtensionMessage, MessageResponseMap } from "@/types/messaging";
import {
  type ToExtensionReverseResponse,
  type ToNativeReverseMessage,
} from "shared-types";

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
    }
  );
});
