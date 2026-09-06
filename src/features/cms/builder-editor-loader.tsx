"use client";

import dynamic from "next/dynamic";

// ChaiBuilder is a heavy client (web blocks, framer-motion) — never render it
// server-side. This loader is the single dynamic/ssr:false entry point for both
// the tenant editor and the apex panel's builder route.
const BuilderEditor = dynamic(
  () => import("@/features/cms/builder-editor"),
  { ssr: false },
);

export default function BuilderEditorLoader({ apiUrl }: { apiUrl: string }) {
  return <BuilderEditor apiUrl={apiUrl} />;
}