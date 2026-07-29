import { copyFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "actions.ts",
    "web-blocks.ts",
    "rsc/index.tsx",
    "core.ts",
    "supabase-actions.ts",
    "runtime.ts",
    "runtime-client.ts",
    "render.ts",
    "utils.ts",
    "types.ts",
  ],
  target: "es2018",
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      ".tsx": "tsx",
    };
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  skipNodeModulesBundle: true,
  external: [
    "react",
    "react-dom",
    "next",
    "@chaibuilder/sdk",
    "@ai-sdk/openai",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@tailwindcss/aspect-ratio",
    "@tailwindcss/container-queries",
    "@tailwindcss/forms",
    "@tailwindcss/typography",
    "ai",
    "chalk",
    "date-fns",
    "lodash",
    "postcss",
    "raw-loader",
    "tailwindcss",
    "zod",
  ],
  minify: true,
  sourcemap: false,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
  onSuccess: async () => {
    const cssSource = resolve("node_modules/@chaibuilder/sdk/dist/sdk.css");
    const cssDest = resolve("dist/styles.css");
    copyFileSync(cssSource, cssDest);
    console.log("✓ Copied sdk.css to dist/styles.css");

    // copy webblocks for tailwind css extraction
    const webBlocksJsSource = resolve("node_modules/@chaibuilder/sdk/dist/web-blocks.js");
    const webBlocksJsDest = resolve("dist/web-blocks-tailwind.js");
    copyFileSync(webBlocksJsSource, webBlocksJsDest);
    console.log("✓ Copied web-blocks.js to dist/web-blocks-tailwind.js");

    const webBlocksCjsSource = resolve("node_modules/@chaibuilder/sdk/dist/web-blocks.cjs");
    const webBlocksCjsDest = resolve("dist/web-blocks-tailwind.cjs");
    copyFileSync(webBlocksCjsSource, webBlocksCjsDest);
    console.log("✓ Copied web-blocks.cjs to dist/web-blocks-tailwind.cjs");
  },
});
