import { useDebouncedCallback } from "@react-hookz/web";
import { useEffect } from "react";
import { useBlocksStoreManager } from "~/hooks/history/use-blocks-store-manager";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBuilderProp } from "~/hooks/use-builder-prop";

const broadcastChannel = new BroadcastChannel("chaibuilder");
export const useBroadcastChannel = () => {
  const pageId = useBuilderProp("pageId", "chaibuilder_page");
  const postMessage = useDebouncedCallback(
    (message: any) => broadcastChannel.postMessage({ ...message, pageId }),
    [pageId],
    200,
  );

  return { postMessage };
};

export const useUnmountBroadcastChannel = () => {
  const [, setBlocks] = useBlocksStore();
  const pageId = useBuilderProp("pageId", "chaibuilder_page");
  const { updateBlocksProps } = useBlocksStoreManager();
  useEffect(() => {
    broadcastChannel.onmessageerror = (event) => {
      console.log("error", event);
    };
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === "blocks-updated" && event.data.pageId === pageId) {
        setBlocks(event.data.blocks);
      }
      if (event.data.type === "blocks-props-updated" && event.data.pageId === pageId) {
        updateBlocksProps(event.data.blocks);
      }
    };
    return () => {
      broadcastChannel.onmessage = null;
      broadcastChannel.onmessageerror = null;
      //broadcastChannel.close();
    };
  }, [setBlocks, pageId, updateBlocksProps]);
};
