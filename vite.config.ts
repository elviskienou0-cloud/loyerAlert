import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },

  css: {
    transformer: "lightningcss",
  },

  resolve: {
    tsconfigPaths: true,

    alias: {
      "@": "/src",
    },

    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },

  plugins: [
    tailwindcss(),

    tanstackStart({
      server: {
        entry: "server",
      },

      importProtection: {
        behavior: "error",

        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),

    viteReact(),

    // Nécessaire pour déployer sur Vercel (ou tout hébergeur basé sur Nitro).
    // Sans preset explicite : Vercel détecte automatiquement son environnement
    // au moment du build et applique le bon adaptateur.
    nitro(),
  ],
});