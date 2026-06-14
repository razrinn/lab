import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["coverage/**"],
  },
  lint: {
    ignorePatterns: ["coverage/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    coverage: {
      reporter: ["text", "html"],
    },
  },
  plugins: [tailwindcss(), cloudflare()],
});
