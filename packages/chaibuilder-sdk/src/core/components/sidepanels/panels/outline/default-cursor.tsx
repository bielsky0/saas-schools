import React, { CSSProperties } from "react";
import { CursorProps } from "react-arborist";

const placeholderStyle = {
  display: "flex",
  alignItems: "center",
  zIndex: 1,
};

export const DefaultCursor = React.memo(function DefaultCursor({ top, left, indent }: CursorProps) {
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
      <div className="h-1 w-1 rounded-full bg-green-500"></div>
      <div className="h-[1px] flex-1 rounded-[1px] border-t border-green-500"></div>
    </div>
  );
});
