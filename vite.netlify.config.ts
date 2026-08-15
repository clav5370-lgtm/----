import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "next/image": fileURLToPath(
        new URL("./netlify-src/next-image.tsx", import.meta.url),
      ),
    },
  },
  build: {
    outDir: "netlify-dist",
    emptyOutDir: true,
  },
});
