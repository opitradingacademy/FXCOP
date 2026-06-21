import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/test/**"],
    environmentMatchGlobs: [
      // Hook and component tests need jsdom
      ["**/__tests__/useWallet*", "jsdom"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
