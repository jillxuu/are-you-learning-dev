import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { compression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".");
  const isProd = mode === "production";

  return {
    plugins: [
      react(),
      isProd &&
        compression({
          algorithm: "gzip",
          exclude: [/\.(br)$/, /\.(gz)$/],
        }),
    ],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL || "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: !isProd,
      minify: isProd,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "monaco-vendor": ["monaco-editor"],
            "aptos-vendor": ["@aptos-labs/ts-sdk"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@monaco-editor/react",
      ],
    },
  };
});
