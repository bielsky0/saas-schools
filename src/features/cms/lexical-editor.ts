import { lexicalEditor } from "@payloadcms/richtext-lexical"

/**
 * Shared Lexical editor config for richText fields inside blocks.
 *
 * Payload 3.x requires an explicit `editor` prop on richText fields defined
 * within blocks or arrays (otherwise it throws MissingEditorProp). Every
 * block that needs rich text should import this constant rather than creating
 * its own instance — same pattern as style-dictionary.ts, href-validator.ts
 * and the rest of the CMS module.
 */
export const CMS_LEXICAL_EDITOR = lexicalEditor({})
