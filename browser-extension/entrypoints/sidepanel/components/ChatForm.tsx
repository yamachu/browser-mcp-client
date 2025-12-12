import { useForm } from "react-hook-form";

type FormValues = { message: string };

type Props = {
  disabled: boolean;
  onSubmit: (message: string) => void;
};

export default function ChatForm({ disabled, onSubmit }: Props) {
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const submit = (data: FormValues) => {
    const text = data.message.trim();
    if (!text) return;
    onSubmit(text);
    reset({ message: "" });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="chat-form">
      <input
        {...register("message")}
        type="text"
        placeholder="メッセージを入力..."
        className="input chat-input"
        disabled={disabled}
      />
      <button type="submit" className="button" disabled={disabled}>
        送信
      </button>
    </form>
  );
}
