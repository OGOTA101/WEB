import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5179,
    strictPort: false
  },
  preview: {
    port: 4179,
    strictPort: false
  }
});
