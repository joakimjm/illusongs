import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const setupEnv = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), "");

  for (const [key, value] of Object.entries(env)) {
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
  return env;
};

export default defineConfig(({ mode }) => {
  const env = setupEnv(mode);

  return {
    plugins: [tsconfigPaths(), react()],
    test: {
      environment: "jsdom",
      env,
      globalSetup: ["src/features/testing/setup.ts"],
    },
  };
});
