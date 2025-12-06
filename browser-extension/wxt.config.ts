import { execSync } from "node:child_process";
// @ts-expect-error pnpm の場合、deps にいないので型定義が見つからないが、wxt の deps として存在するので実際は使える
import { loadEnv } from "vite";
import { defineConfig } from "wxt";

const config = loadEnv("", __dirname, "VITE_");
const snifferUris = config.VITE_JWT_SNIFFER_URI as string;
if (!snifferUris) {
  throw new Error("VITE_JWT_SNIFFER_URI is not defined");
}
const hostPermissions = snifferUris.split(",").map((host) => {
  return `${host}/*`;
});

const key = execSync("make key", {
  encoding: "utf-8",
}).toString();

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: ["nativeMessaging", "sidePanel", "webRequest", "storage"],
    key,
    host_permissions: hostPermissions,
  },
});
