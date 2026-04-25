import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5172,
    host: "0.0.0.0",
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      }
    }
  },
});
