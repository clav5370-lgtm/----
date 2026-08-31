import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "itch",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../itch-dist-v6.2",
    emptyOutDir: true,
  },
});
