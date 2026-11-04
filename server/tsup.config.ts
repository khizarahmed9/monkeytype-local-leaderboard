import { defineConfig } from "tsup";

// one self-contained file, so a deployment needs no node_modules
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node24",
  noExternal: [/.*/],
  clean: true,
});
