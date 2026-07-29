import { useDebouncedCallback, useResizeObserver } from "@react-hookz/web";
import { useCallback, useEffect, useRef } from "react";
import { useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";

export const ResizableCanvasWrapper = ({ children, onMount, onResize }: any) => {
  const [, setSelected] = useSelectedBlockIds();
  const [, setSelectedStyles] = useSelectedStylingBlocks();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const db = useDebouncedCallback(
    () => {
      const { clientWidth } = mainContentRef.current!;
      onResize(clientWidth);
    },
    [mainContentRef.current],
    100,
  );
  useResizeObserver(mainContentRef.current!, db, mainContentRef.current !== null);
  useEffect(() => {
    const { clientWidth } = mainContentRef.current!;
    onMount(clientWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deselectSelected = useCallback(() => {
    setSelected([]);
    setSelectedStyles([]);
  }, [setSelected, setSelectedStyles]);

  return (
    <div
      id={"main-content"}
      onClick={deselectSelected}
      className="h-full w-full border-l-4 border-r-4 pb-0"
      ref={mainContentRef}>
      {children}
    </div>
  );
};
