import { WidgetProps } from "@rjsf/utils";
import { EditorContent } from "@tiptap/react";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRTEditor } from "~/core/rjsf-widgets/rte-widget/use-rte-editor";
import { useInlineEditing } from "~/hooks/use-inline-editing";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { ChaiBlock } from "~/types/common";
import RteMenubar from "./rte-menu-bar";
const RTEModal = React.lazy(() => import("./rte-widget-modal"));

/**
 * Rich Text Editor Field Component
 */
const RichTextEditorFieldComp = ({ blockId, id, placeholder, value, onChange, onBlur }: WidgetProps) => {
  const rteRef = useRef<HTMLDivElement & { __chaiRTE?: any }>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const editor = useRTEditor({
    blockId,
    value,
    placeholder,
    onBlur: ({ editor }) => {
      const html = editor?.getHTML();
      onBlur(id, html);
    },
    onUpdate: ({ editor }) => {
      const html = editor?.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    // This is critical for data binding to work - JSONForm.tsx looks for this property
    // to access the editor instance and insert data binding placeholders
    if (rteRef.current && editor) {
      rteRef.current.__chaiRTE = editor;
    }
  }, [blockId, editor]);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const rteElement = (
    <div id={`chai-rte-${id}`} ref={rteRef} className="mt-1 rounded-md border border-input">
      <RteMenubar editor={editor} onExpand={() => setIsModalOpen(true)} />
      <EditorContent
        key={id}
        editor={editor}
        id={id}
        placeholder={placeholder}
        className={`overflow-auto ${isModalOpen ? "max-h-[500px] min-h-[400px]" : "max-h-[200px] min-h-[100px]"}`}
      />
    </div>
  );

  return (
    <>
      {isModalOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <RTEModal isOpen={isModalOpen} onClose={handleModalClose} editor={editor!} rteElement={rteElement} />
        </Suspense>
      )}
      {!isModalOpen ? <div className="relative">{rteElement}</div> : <div>Open in modal</div>}
    </>
  );
};

const RichTextEditorField = (props: WidgetProps) => {
  const { editingBlockId } = useInlineEditing();
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const selectedBlock = useSelectedBlock() as ChaiBlock;
  const blockId = selectedBlock?._id;

  useEffect(() => {
    setCurrentBlockId(blockId);
  }, [blockId]);

  return currentBlockId && currentBlockId !== editingBlockId ? (
    <RichTextEditorFieldComp key={currentBlockId} {...props} blockId={currentBlockId} />
  ) : null;
};

export { RichTextEditorField as RTEField };
