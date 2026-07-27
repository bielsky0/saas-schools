// Re-export the auto-generated import map (importMap.js), which contains ALL
// component references including Payload internal ones (e.g. CollectionCards).
// The .ts file exists so TypeScript resolves it; the actual map lives in .js
// so `payload generate:importmap` can rewrite it without TS compilation.
export { importMap } from "./importMap.js";
