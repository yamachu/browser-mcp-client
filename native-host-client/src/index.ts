import { NativeHostClient } from "native-messaging/dist/node.js";
import { stdin, stdout } from "node:process";
import { createInterface, type Interface } from "node:readline";
import type { ToExtensionResponse, ToNativeMessage } from "shared-types";

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
        } else if (trimmed.startsWith("raw ")) {
          const json = trimmed.slice("raw ".length);
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
  const client = new NativeHostClient(
    (res: ToExtensionResponse) => {
      console.log(
        "Received message from native host:",
        JSON.stringify(res, null, 2)
      );
    },
    () => true
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

        default:
          console.error(`Unknown command: ${command}`);
          console.log("Available commands: reverse");
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
