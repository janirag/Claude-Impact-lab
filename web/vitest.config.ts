import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", env: { CLAWD_OFFLINE: "1", CLAWD_DATA_DIR: ".data-test" } },
});
