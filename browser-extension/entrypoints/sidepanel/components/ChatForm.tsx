import { type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";

type FormValues = { message: string };

type Props = {
  disabled: boolean;
  onSubmit: (message: string) => void;
};

export default function ChatForm({ disabled, onSubmit }: Props) {
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const submit = (data: FormValues, e?: BaseSyntheticEvent) => {
    const text = data.message.trim();
    if (!text) return;
    onSubmit(text);
    reset({ message: "" });

    // Reset height
    const target = e?.target as HTMLElement;
    if (target) {
      const textarea =
        target.tagName === "TEXTAREA"
          ? (target as HTMLTextAreaElement)
          : target.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(submit)(e);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="chat-form">
      <textarea
        {...register("message")}
        placeholder="メッセージを入力..."
        className="input chat-input"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={1}
      />
      <button
        type="submit"
        className="button"
        disabled={disabled}
        title="Ctrl + Enter で送信"
      >
        送信
      </button>
    </form>
  );
}
