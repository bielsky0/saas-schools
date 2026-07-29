import { first, get, isEmpty, startsWith } from "lodash-es";
import { useCallback, useMemo } from "react";
import { usePageExternalData } from "~/atoms/builder";
import { NestedPathSelector } from "~/core/components/nested-path-selector";
import { COLLECTION_PREFIX, REPEATER_PREFIX } from "~/core/constants/STRINGS";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useSelectedBlock, useSelectedBlockHierarchy } from "~/hooks/use-selected-blockIds";

export const DataBindingSelector = ({
  schema,
  onChange,
  id,
  formData,
}: {
  schema: any;
  onChange: (value: any, formData: any, id: string) => void;
  id: string;
  formData: any;
}) => {
  const pageExternalData = usePageExternalData();
  const dataBindingEnabled = useBuilderProp("flags.dataBinding", true);
  const hierarchy = useSelectedBlockHierarchy();
  const selectedBlock = useSelectedBlock();
  const repeaterKey = useMemo(() => {
    if (hierarchy.length === 1) return "";
    const repeaterBlock = hierarchy.find((block) => block._type === "Repeater");
    const repeaterKey = get(repeaterBlock, "repeaterItems", "");
    const key = repeaterKey.replace(/\{\{(.*)\}\}/g, "$1");
    return `${REPEATER_PREFIX}${startsWith(key, COLLECTION_PREFIX) ? `${key}/${repeaterBlock?._id}` : key}`;
  }, [hierarchy]);

  const repeaterData = useMemo(() => {
    return first(get(pageExternalData, repeaterKey.replace(REPEATER_PREFIX, ""), []));
  }, [repeaterKey, pageExternalData]);

  const handlePathSelect = useCallback(
    (path: string, type: "value" | "array" | "object") => {
      path = !isEmpty(repeaterKey) ? path.replace(`${repeaterKey}`, "$index") : path;
      // if type is array or object, replace the current value with the new value
      if (type === "array" || type === "object") {
        onChange(`{{${path}}}`, {}, id);
        return;
      }

      // Helper function to check if character is punctuation
      const isPunctuation = (char: string) => /[.,!?;:]/.test(char);

      // Helper function to add smart spacing around a placeholder
      const addSmartSpacing = (text: string, position: number, placeholder: string) => {
        // Determine if we need spacing
        let prefix = "";
        let suffix = "";

        // Get characters before and after cursor
        const charBefore = position > 0 ? text[position - 1] : "";
        const charAfter = position < text.length ? text[position] : "";

        // Handle spacing before placeholder
        if (position > 0) {
          // Always add space after a period/full stop
          if (charBefore === ".") {
            prefix = " ";
          }
          // For other cases, add space if not punctuation and not already a space
          else if (!isPunctuation(charBefore) && charBefore !== " ") {
            prefix = " ";
          }
        }

        // Handle spacing after placeholder
        if (position < text.length && !isPunctuation(charAfter) && charAfter !== " ") {
          suffix = " ";
        }

        return {
          text: prefix + placeholder + suffix,
          prefixLength: prefix.length,
          suffixLength: suffix.length,
        };
      };

      // Get the element by ID
      const element = document.getElementById(id);
      if (!element) return;

      // Check if this is a Tiptap editor by looking for the chai-rte container
      const rteContainer = document.getElementById(`chai-rte-${id}`) || document.getElementById(`chai-rte-modal-${id}`);

      if (rteContainer && (rteContainer.querySelector(".ProseMirror") || (rteContainer as any).__chaiRTE)) {
        // Handle Tiptap editor
        // Access the Tiptap instance that was attached in the RTEField component
        const editor = (rteContainer as any).__chaiRTE;

        if (editor) {
          // Create the placeholder
          const basePlaceholder = `{{${path}}}`;

          // Focus the editor first to ensure we can get/set selection
          editor.commands.focus();

          // Check if there's a selection
          const { from, to } = editor.state.selection;
          const hasSelection = from !== to;

          if (hasSelection) {
            // If there's a selection, replace it with the placeholder
            editor.chain().deleteSelection().insertContent(basePlaceholder).run();
          } else {
            // No selection, just insert at cursor position
            // Get the text around the cursor to determine spacing
            const { state } = editor;
            const cursorPos = state.selection.from;

            // Get text before and after cursor for smart spacing
            const textBefore = state.doc.textBetween(Math.max(0, cursorPos - 1), cursorPos);
            const textAfter = state.doc.textBetween(cursorPos, Math.min(cursorPos + 1, state.doc.content.size));

            // Determine if we need spacing before the placeholder
            let prefix = "";
            if (cursorPos > 0 && textBefore !== " " && !isPunctuation(textBefore)) {
              prefix = " ";
            }

            // Determine if we need spacing after the placeholder
            let suffix = "";
            if (textAfter && textAfter !== " " && !isPunctuation(textAfter)) {
              suffix = " ";
            }

            // Insert the placeholder with smart spacing
            editor
              .chain()
              .insertContent(prefix + basePlaceholder + suffix)
              .run();
          }

          // Update the form data with the new content
          // Use setTimeout to ensure the state has been updated
          setTimeout(() => onChange(editor.getHTML(), {}, id), 100);
          return;
        }
      } else {
        // Handle regular input field
        const input = element as HTMLInputElement;
        const cursorPos = input.selectionStart || 0;
        const currentValue = input.value || "";

        // Check if there's any text selection
        const selectionEnd = input.selectionEnd || cursorPos;
        const hasSelection = selectionEnd > cursorPos;

        // If text is selected, replace it with the shortcode
        if (hasSelection) {
          const basePlaceholder = `{{${path}}}`;
          const { text: placeholderWithSpacing } = addSmartSpacing(currentValue, cursorPos, basePlaceholder);

          const newValue = currentValue.slice(0, cursorPos) + placeholderWithSpacing + currentValue.slice(selectionEnd);

          // Call onChange with the new formData
          onChange(newValue, {}, id);
          return;
        }

        // No selection, just insert at cursor position with smart spacing
        const basePlaceholder = `{{${path}}}`;
        const { text: placeholderWithSpacing } = addSmartSpacing(currentValue, cursorPos, basePlaceholder);

        // Create the new value with smart spacing
        const newValue = currentValue.slice(0, cursorPos) + placeholderWithSpacing + currentValue.slice(cursorPos);

        // Call onChange with the new formData
        onChange(newValue, {}, id);
      }
    },
    [id, onChange, formData, selectedBlock?._id, repeaterKey],
  );

  if (!dataBindingEnabled) {
    return null;
  }
  return (
    <NestedPathSelector
      data={{
        ...((repeaterData && { [repeaterKey]: repeaterData }) as any),
        ...pageExternalData,
      }}
      onSelect={handlePathSelect}
      dataType={schema.binding === "array" ? "array" : "value"}
    />
  );
};
