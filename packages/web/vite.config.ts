import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendPort = process.env.TOKEN_FLOOR_PORT ?? "10214";
const httpTarget = `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/events": { target: httpTarget, ws: true },
      "/health": httpTarget,
      "/snapshot": httpTarget,
      "/memos": httpTarget
    }
  },
  build: { outDir: "../../dist/web", emptyOutDir: true }
});
