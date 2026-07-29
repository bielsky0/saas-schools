import "@/routes/demo/panels/panel";
import { lazy } from "react";
import { AiButton, DEFAULT_PANEL_WIDTH } from "~/core/components/layout/root-layout";
import { default as AIChatPanel } from "~/routes/demo/ai-chat-panel";
import registerCustomBlocks from "~/routes/demo/blocks";
import { registerChaiFont } from "~/runtime";
import {
  registerChaiLibrary,
  registerChaiPreImportHTMLHook,
  registerChaiSaveToLibrary,
  registerChaiSidebarPanel,
  registerChaiTopBar,
} from "~/runtime/client";
import { ChaiLibraryBlock } from "~/types/chaibuilder-editor-props";
const TopBar = lazy(() => import("~/routes/demo/top-bar"));

export const extendChaiBuilder = () => {
  registerCustomBlocks();
  registerChaiPreImportHTMLHook(async (html) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(html.replace(/bg-yellow-light-4/g, "bg-destructive"));
      }, 1000);
    });
  });

  registerChaiFont("Geist", {
    fallback: `"Geist Fallback", Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol`,
    src: [{ url: "/fonts/Geist.woff", format: "woff" }],
  });

  registerChaiSaveToLibrary(() => {
    return <div className="h-96 w-96">Save to Lib</div>;
  });

  registerChaiSidebarPanel("chai-chat-panel", {
    button: AiButton,
    label: "Ask AI",
    position: "top",
    isInternal: true,
    width: DEFAULT_PANEL_WIDTH,
    panel: () => (
      <div className="-mt-8 h-full max-h-full">
        <AIChatPanel />
      </div>
    ),
  });
  registerChaiTopBar(TopBar);

  // registerChaiAddBlockTab("add-block-ai", {
  //   tab: () => "With AI",
  //   tabContent: AddBlockAi,
  // });

  const url = "https://chai-ui-blocks.vercel.app";
  registerChaiLibrary("meraki-ui", {
    name: "Meraki UI",
    description: "Meraki UI",
    getBlocksList: async () => {
      try {
        const response = await fetch(url + "/blocks.json");
        const blocks = await response.json();
        return blocks.map((b: any) => ({ ...b, preview: url + b.preview }));
      } catch {
        return [];
      }
    },
    getBlock: async ({ block }: { block: ChaiLibraryBlock }) => {
      try {
        const response = await fetch(url + (!block.path ? "/" + block.uuid + ".html" : "/blocks/" + block.path));
        const html = await response.text();
        return html.replace(/---([\s\S]*?)---/g, "");
      } catch (error) {
        console.log(error);
        return "<p>Something went wrong. Please try again</p>";
      }
    },
  });
};
