"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useBlocksHtmlForAi } from "~/hooks/use-blocks-html-for-ai";
import { useHtmlToBlocks } from "~/hooks/use-html-to-blocks";
import { useI18nBlocks } from "~/hooks/use-i18n-blocks";
import { useReplaceBlock } from "~/hooks/use-replace-block";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";

export default function AIChatPanel() {
  const selectedBlock = useSelectedBlock();
  const blocksHtmlForAi = useBlocksHtmlForAi();
  const htmlToBlocks = useHtmlToBlocks();
  const i18nBlocks = useI18nBlocks();
  const [html, setHtml] = useState("");
  const replaceBlock = useReplaceBlock();
  const add = () => {
    const blocks = htmlToBlocks(html);
    replaceBlock(selectedBlock?._id, blocks);
  };
  return (
    <div>
      <textarea className="mt-10" rows={5} value={html} onChange={(e) => setHtml(e.target.value)}></textarea>
      <Button onClick={add}>Import HTML</Button>
      <Button onClick={() => console.log(blocksHtmlForAi({ blockId: selectedBlock?._id }))}>Get Blocks HTML</Button>
      <Button onClick={() => console.log(i18nBlocks("fr"))}>Get I18n Blocks</Button>
    </div>
  );
}
