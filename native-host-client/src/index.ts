import { NativeHostClient } from "native-messaging/dist/node.js";
import { stdin, stdout } from "node:process";
import { createInterface, type Interface } from "node:readline";
import type {
  ToExtensionChatResponse,
  ToExtensionResponse,
  ToNativeMessage,
} from "shared-types";
import { z } from "zod";

const ChatEnv = z.object({
  API_KEY: z.string(),
  API_BASE_URL: z.string(),
  PROVIDER: z.enum(["openai", "anthropic"]),
  MODEL: z.string(),
});

function displayChatResponse(response: ToExtensionChatResponse): void {
  switch (response.type) {
    case "thinking":
      console.log(`\n💭 Start thinking...`);
      break;
    case "tool_call":
      console.log(
        `\n🔧 Tool: ${response.toolName}(${JSON.stringify(response.toolArgs)})`
      );
      break;
    case "tool_result":
      console.log(`   ↳ Result: ${JSON.stringify(response.result)}`);
      break;
    case "token":
      stdout.write(response.token);
      break;
    case "final":
      console.log(`\n\n✅ Finite response\n`);
      break;
    case "error":
      console.error(`\n❌ Error: ${response.error}`);
      break;
    default:
      const _ = response satisfies never;
  }
}

function isNonStreamingResponse(response: ToExtensionResponse): boolean {
  return !("type" in response && "messageId" in response);
}

async function interactiveMode(
  client: NativeHostClient<ToNativeMessage, ToExtensionResponse>
): Promise<void> {
  const rl: Interface = createInterface({
    input: stdin,
    output: stdout,
  });

  console.log("\n=== Native Host Debug Client ===");
  console.log("Commands:");
  console.log("  reverse <text>    - Reverse a string");
  console.log("  chat <prompt>     - Send a chat message (requires env vars)");
  console.log("  raw <json>        - Send raw JSON message");
  console.log("  exit              - Exit the client");
  console.log("");

  const prompt = (): void => {
    rl.question("> ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "exit" || trimmed === "quit") {
        rl.close();
        client.stop();
        return;
      }

      try {
        if (trimmed.startsWith("reverse ")) {
          const text = trimmed.slice("reverse ".length);
          const response = await client.sendAndWait({
            action: "reverse",
            text,
          });
          console.log("Response:", JSON.stringify(response, null, 2));
        } else if (trimmed.startsWith("chat ")) {
          const promptText = trimmed.slice("chat ".length);

          const env = ChatEnv.safeParse(process.env);
          if (!env.success) {
            console.error(
              "⚠️  Missing or invalid environment variables for chat. Please set API_KEY, API_BASE_URL, PROVIDER, and MODEL.",
              env.error.format()
            );
            prompt();
            return;
          }
          const jwt = env.data.API_KEY;
          const apiBaseUrl = env.data.API_BASE_URL;
          const provider = env.data.PROVIDER;
          const model = env.data.MODEL;

          console.log(
            `\nSending chat with provider: ${provider}, model: ${
              model || "default"
            }`
          );
          client.sendMessage({
            action: "chat",
            prompt: promptText,
            jwt,
            apiBaseUrl,
            provider,
            model: model!,
          });
        } else if (trimmed.startsWith("raw ")) {
          const json = trimmed.slice(4);
          try {
            const message = JSON.parse(json) as ToNativeMessage;
            client.sendMessage(message);
            console.log("Message sent.");
          } catch {
            console.error("Invalid JSON");
          }
        } else {
          console.log("Unknown command. Type 'exit' to quit.");
        }
      } catch (err) {
        console.error("Error:", err);
      }

      prompt();
    });
  };

  prompt();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const client = new NativeHostClient<ToNativeMessage, ToExtensionResponse>(
    (res: ToExtensionResponse) => {
      if ("type" in res && "messageId" in res) {
        displayChatResponse(res as ToExtensionChatResponse);
      } else {
        console.log(
          "Received message from native host:",
          JSON.stringify(res, null, 2)
        );
      }
    },
    isNonStreamingResponse
  );

  try {
    console.log("Starting native-host...");
    const nativeHostPath = args[0];
    await client.start(nativeHostPath!);
    console.log("Native-host started successfully.\n");

    if (args.length === 1) {
      // Interactive mode
      await interactiveMode(client);
    } else {
      // One-shot mode
      const [_, command, ...rest] = args;
      const arg = rest.join(" ");

      switch (command) {
        case "reverse":
          if (!arg) {
            console.error("Usage: debug reverse <text>");
            process.exit(1);
          }
          const response = await client.sendAndWait({
            action: "reverse",
            text: arg,
          });
          console.log("Response:", JSON.stringify(response, null, 2));
          client.stop();
          break;

        case "chat":
          if (!arg) {
            console.error("Usage: debug chat <prompt>");
            process.exit(1);
          }
          const env = ChatEnv.safeParse(process.env);
          if (!env.success) {
            console.error(
              "⚠️  Missing or invalid environment variables for chat. Please set API_KEY, API_BASE_URL, PROVIDER, and MODEL.",
              env.error.format()
            );
            process.exit(1);
          }
          const jwt = env.data.API_KEY;
          const apiBaseUrl = env.data.API_BASE_URL;
          const provider = env.data.PROVIDER;
          const model = env.data.MODEL;

          console.log(`Provider: ${provider}, Model: ${model || "default"}`);
          client.sendMessage({
            action: "chat",
            prompt: arg,
            jwt,
            apiBaseUrl,
            provider,
            model: model!,
          });

          // Wait for streaming to complete
          await new Promise((resolve) => setTimeout(resolve, 60000));
          client.stop();
          break;

        default:
          console.error(`Unknown command: ${command}`);
          console.log("Available commands: reverse, chat");
          process.exit(1);
      }
    }
  } catch (err) {
    console.error("Failed to run debug client:", err);
    client.stop();
    process.exit(1);
  }
}

main();
