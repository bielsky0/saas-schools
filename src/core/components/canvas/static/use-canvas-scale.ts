import { useCallback, useEffect, useState } from "react";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useCanvasZoom } from "~/hooks/use-canvas-zoom";
import { useCanvasDisplayWidth } from "~/hooks/use-screen-size-width";

export const useCanvasScale = (dimension: { height: number; width: number }) => {
  const [canvasWidth] = useCanvasDisplayWidth();
  const [, setZoom] = useCanvasZoom();
  const htmlDir = useBuilderProp("htmlDir", "ltr") as "ltr" | "rtl";
  const [scale, setScale] = useState({});
  const updateScale = useCallback(() => {
    const { width, height } = dimension;
    if (width < canvasWidth) {
      const newScale: number = parseFloat((width / canvasWidth).toFixed(2).toString());
      let heightObj = {};
      const scaledHeight = height * newScale;
      const scaledWidth = width * newScale;
      if (height) {
        heightObj = {
          // Eureka! This is the formula to calculate the height of the scaled element. Thank you ChatGPT 4
          height: 100 + ((height - scaledHeight) / scaledHeight) * 100 + "%",
          width: 100 + ((width - scaledWidth) / scaledWidth) * 100 + "%",
        };
      }
      setScale({
        position: "relative",
        top: 0,
        transform: `scale(${newScale})`,
        transformOrigin: htmlDir === "rtl" ? "top right" : "top left",
        ...heightObj,
        maxWidth: "none", // TODO: Add max-width to the wrapper
      });

      setZoom(newScale * 100);
    } else {
      setScale({});
      setZoom(100);
    }
  }, [canvasWidth, dimension, htmlDir, setZoom]);

  useEffect(() => {
    updateScale();
  }, [canvasWidth, dimension, setZoom, updateScale]);

  return scale;
};
