// #region: frontend to background
interface BaseMessageType<T extends string> {
  type: T;
}

interface ReverseStringMessage extends BaseMessageType<"REVERSE_STRING"> {
  text: string;
}

export type ExtensionMessage = ReverseStringMessage | never;
// #endregion

// #region: background to frontend
interface ReverseStringSuccessResponse {
  success: true;
  reversed: string;
}

interface ReverseStringErrorResponse {
  success: false;
  error: string;
}

type ReverseStringResponse =
  | ReverseStringSuccessResponse
  | ReverseStringErrorResponse;
// #endregion

export interface MessageResponseMap {
  REVERSE_STRING: ReverseStringResponse;
}

export async function sendTypedMessage<T extends ExtensionMessage>(
  message: T
): Promise<MessageResponseMap[T["type"]]> {
  return browser.runtime.sendMessage(message);
}
