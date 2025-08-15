import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  // Add the tailwindcss() plugin after the react() plugin
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // This line solves the page reloading issue
      ignored: ["repos/**"],
    },
  },
});
