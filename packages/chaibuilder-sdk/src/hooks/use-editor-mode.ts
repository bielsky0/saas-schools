import { atom, useAtom } from "jotai";

export const editorModeAtom = atom<'edit' | 'view'>('edit');

export const useEditorMode = () => {
    const [mode, setMode] = useAtom(editorModeAtom);
    return { mode, setMode };
};

/**
 * Editor context for CMS layout/content editing (blog-templates-cms F4+).
 * Unlike `editorModeAtom` (edit/view preview), this describes WHAT is being
 * edited: a regular page, a collection layout template, or a post item.
 */
export type EditorContext =
  | { type: "page"; pageId: string }
  | { type: "template"; templateId: string; collectionId: string }
  | { type: "post"; postId: string; templateId: string; collectionId: string };

export const editorContextAtom = atom<EditorContext>({ type: "page", pageId: "" });

export const useEditorContext = () => {
  const [context, setContext] = useAtom(editorContextAtom);
  return { context, setContext };
};
