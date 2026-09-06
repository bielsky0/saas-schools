"use client";

import BuilderEditorLoader from "@/features/cms/builder-editor-loader";

export default function EditorPage() {
  return <BuilderEditorLoader apiUrl="/editor/api" />;
}