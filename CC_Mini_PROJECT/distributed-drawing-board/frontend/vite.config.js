import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // same as "0.0.0.0" — binds to all interfaces and prints Network URL
    port: 5173,
    strictPort: true, // fail fast if 5173 is already taken
  },
});
