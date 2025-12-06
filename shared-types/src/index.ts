// #region extension to host
interface ToNativeBaseMessage<T extends string> {
  action: T;
}

export interface ToNativeReverseMessage extends ToNativeBaseMessage<"reverse"> {
  text: string;
}

export type ToNativeMessage = ToNativeReverseMessage | never;
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

export type ToExtensionResponse = ToExtensionReverseResponse;
// #endregion
