import { spawn, type ChildProcess } from "node:child_process";
import { stderr } from "node:process";
import { toBufferedMessage, writeMessage } from "./index.js";

export class NativeHostClient<I, O> {
  private process: ChildProcess | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private messageQueue: Array<(response: O) => void> = [];

  constructor(
    private responseHandler: (response: O) => void,
    private isNonStreamingResponse: (response: O) => boolean = () => true
  ) {}

  async start(command: string, args?: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.on("error", (err) => {
        console.error("Failed to start native-host:", err);
        reject(err);
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        stderr.write(`[native-host stderr] ${data.toString()}`);
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.handleData(data);
      });

      this.process.on("close", (code) => {
        console.log(`\nnative-host process exited with code ${code}`);
        this.process = null;
      });

      resolve();
    });
  }

  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length >= 4) {
      const messageLength = this.buffer.readUInt32LE(0);

      if (this.buffer.length < 4 + messageLength) {
        // 足りないので待つ
        break;
      }

      const messageData = this.buffer.subarray(4, 4 + messageLength);
      this.buffer = this.buffer.subarray(4 + messageLength);

      try {
        const response = JSON.parse(messageData.toString("utf8")) as O;
        if (this.isNonStreamingResponse(response)) {
          const resolver = this.messageQueue.shift();
          if (resolver) {
            resolver(response);
          }
        } else {
          this.responseHandler(response);
        }
      } catch (err) {
        console.error("Failed to parse response:", err);
      }
    }
  }

  sendMessage(message: I): void {
    if (!this.process?.stdin) {
      throw new Error("Native host not started");
    }

    writeMessage(toBufferedMessage(message), this.process.stdin);
  }

  async sendAndWait(message: I): Promise<O> {
    return new Promise((resolve) => {
      this.messageQueue.push(resolve);
      this.sendMessage(message);
    });
  }

  stop(): void {
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill();
      this.process = null;
    }
  }
}
