import { defineConfig } from "wxt";
import { execSync } from "node:child_process";

const key = execSync("make key", {
  encoding: "utf-8",
}).toString();

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: ["nativeMessaging", "sidePanel"],
    key,
  },
});
