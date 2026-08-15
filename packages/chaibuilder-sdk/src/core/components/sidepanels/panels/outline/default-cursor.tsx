import React, { CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { CursorProps } from "react-arborist";
import { dropCursorInvalidAtom } from "~/atoms/ui";
import { cn } from "~/core/utils/cn";

const placeholderStyle = {
  display: "flex",
  alignItems: "center",
  zIndex: 1,
};

export const DefaultCursor = React.memo(function DefaultCursor({ top, left, indent }: CursorProps) {
  const isInvalid = useAtomValue(dropCursorInvalidAtom);
  const style: CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    top: top - 1 + "px",
    left: "0px",
    right: 0,
    paddingLeft: left + indent + "px",
  };

  return (
    <div style={{ ...placeholderStyle, ...style }}>
      <div
        className={cn(
          "h-[2px] w-[6px] rounded-full",
          isInvalid ? "bg-red-500" : "bg-primary",
        )}
      />
      <div
        className={cn(
          "h-[2px] flex-1 rounded-full",
          isInvalid ? "bg-red-500" : "bg-primary",
        )}
      />
      <div
        className={cn(
          "h-[2px] w-[6px] rounded-full",
          isInvalid ? "bg-red-500" : "bg-primary",
        )}
      />
    </div>
  );
});
