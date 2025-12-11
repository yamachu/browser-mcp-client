import type { ToExtensionChatResponse } from "shared-types";

// #region: frontend to background
interface BaseMessageType<T extends string> {
  type: T;
}

interface ReverseStringMessage extends BaseMessageType<"REVERSE_STRING"> {
  text: string;
}

interface ChatMessage extends BaseMessageType<"CHAT"> {
  prompt: string;
  jwt: string;
  apiBaseUrl: string;
  provider: "openai" | "anthropic";
  model: string;
  tools?: Array<Record<string, unknown>>;
}

export type ExtensionMessage = ReverseStringMessage | ChatMessage;
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

interface ChatStartedResponse {
  success: true;
  messageId: string;
}

interface ChatErrorResponse {
  success: false;
  error: string;
}

type ChatResponse = ChatStartedResponse | ChatErrorResponse;
// #endregion

export interface MessageResponseMap {
  REVERSE_STRING: ReverseStringResponse;
  CHAT: ChatResponse;
}

export async function sendTypedMessage<T extends ExtensionMessage>(
  message: T
): Promise<MessageResponseMap[T["type"]]> {
  return browser.runtime.sendMessage(message);
}

// For streaming chat events from background to sidepanel
export type ChatStreamEvent = ToExtensionChatResponse;
