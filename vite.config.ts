import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const root = fileURLToPath(new URL(".", import.meta.url));
const devServiceWorkerReset = (): Plugin => ({
  name: "dev-service-worker-reset",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/sw.js", (_request, response) => {
      response.setHeader("Content-Type", "application/javascript");
      response.setHeader("Cache-Control", "no-store");
      response.end(`self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: "window" });
  await Promise.all(clients.map((client) => client.navigate(client.url)));
})()));`);
    });
  }
});

export default defineConfig({
  root,
  server: {
    host: "0.0.0.0",
    proxy: { "/api": "http://127.0.0.1:8080" }
  },
  plugins: [
    react(),
    devServiceWorkerReset(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-maskable.svg"],
      manifest: {
        name: "AI PWA Starter",
        short_name: "PWA Starter",
        description: "AIが新しいオフラインPWAを作るためのスターター",
        theme_color: "#173f3a",
        background_color: "#f3f5ef",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,ico,webmanifest}"]
      }
    })
  ],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    setupFiles: [fileURLToPath(new URL("./src/test/setup.ts", import.meta.url))],
    restoreMocks: true
  }
});
