// #region extension to host
interface ToNativeBaseMessage<T extends string> {
  action: T;
}

export interface ToNativeReverseMessage extends ToNativeBaseMessage<"reverse"> {
  text: string;
}

export interface ToNativeChatMessage extends ToNativeBaseMessage<"chat"> {
  prompt: string;
  jwt: string;
  apiBaseUrl: string;
  provider: "openai" | "anthropic";
  model: string;
}

export type ToNativeMessage = ToNativeReverseMessage | ToNativeChatMessage;
// #endregion

// #region host to extension
type ToExtensionReverseSuccessResponse = {
  reversed: string;
};

type ToExtensionErrorResponse = {
  error: string;
};

export type ToExtensionReverseResponse =
  | ToExtensionReverseSuccessResponse
  | ToExtensionErrorResponse;

interface ToExtensionChatBaseResponse<T extends string> {
  type: T;
  messageId: string;
}

export interface ToExtensionChatThinkingResponse
  extends ToExtensionChatBaseResponse<"thinking"> {}

export interface ToExtensionChatToolCallResponse
  extends ToExtensionChatBaseResponse<"tool_call"> {
  toolName: string;
  toolArgs: string; // JSON stringified arguments
}

export interface ToExtensionChatToolResultResponse
  extends ToExtensionChatBaseResponse<"tool_result"> {
  toolName: string;
  result: unknown;
}

export interface ToExtensionChatTokenResponse
  extends ToExtensionChatBaseResponse<"token"> {
  token: string;
}

export interface ToExtensionChatFinalResponse
  extends ToExtensionChatBaseResponse<"final"> {}

export interface ToExtensionChatErrorResponse
  extends ToExtensionChatBaseResponse<"error"> {
  error: string;
}

export type ToExtensionChatResponse =
  | ToExtensionChatThinkingResponse
  | ToExtensionChatToolCallResponse
  | ToExtensionChatToolResultResponse
  | ToExtensionChatTokenResponse
  | ToExtensionChatFinalResponse
  | ToExtensionChatErrorResponse;

export type ToExtensionResponse =
  | ToExtensionReverseResponse
  | ToExtensionChatResponse;
// #endregion
