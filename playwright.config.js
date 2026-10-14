import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  testMatch: "*.spec.js",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_EXECUTABLE,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
});
