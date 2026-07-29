import { useFrame } from "~/core/frame";
import { useKeyEventWatcher } from "~/hooks/use-key-event-watcher";

export const KeyboardHandler = () => {
  const { document: iframeDoc } = useFrame();
  useKeyEventWatcher(iframeDoc);
  return null;
};
