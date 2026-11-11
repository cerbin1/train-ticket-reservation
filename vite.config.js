import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "~/domains/portfolio.skr.smallhost.pl/public_html/train-ticket-reservation",
    emptyOutDir: true,
  },
});
