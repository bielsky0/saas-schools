import { useAtom } from "jotai";
import { ChaiBuilderEditor } from "~/core/main";
import "~/index.css";
import { lsBlocksAtom } from "~/routes/demo/atoms-dev";
import CustomLayout from "~/routes/demo/custom-layout";
import PreviewWeb from "~/routes/demo/preview/web-preview";
import { ChaiBlock } from "~/types/common";
import { loadWebBlocks } from "~/web-blocks";

loadWebBlocks();

function ChaiBuilderCustom() {
  const [blocks] = useAtom(lsBlocksAtom);
  return (
    <ChaiBuilderEditor
      flags={{
        gotoSettings: true,
      }}
      locale={"pt-BR"}
      // translations={{ "pt-BR": ptBR, es: es }}
      layout={CustomLayout}
      debugLogs={true}
      autoSave={false}
      previewComponent={PreviewWeb}
      blocks={blocks}
      onSave={async ({ blocks, providers, brandingOptions }: any) => {
        localStorage.setItem("chai-builder-blocks", JSON.stringify(blocks));
        localStorage.setItem("chai-builder-providers", JSON.stringify(providers));
        localStorage.setItem("chai-builder-branding-options", JSON.stringify(brandingOptions));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return true;
      }}
      askAiCallBack={async (type: "styles" | "content", prompt: string, blocks: ChaiBlock[]) => {
        console.log("askAiCallBack", type, prompt, blocks);
        return new Promise((resolve) => resolve({ error: new Error("Not implemented") }));
      }}
    />
  );
}

export default ChaiBuilderCustom;
