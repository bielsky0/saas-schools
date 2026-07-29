import { CaretDownIcon, Cross1Icon } from "@radix-ui/react-icons";
import { useDebouncedState } from "@react-hookz/web";
import { useAtom } from "jotai";
import { get, uniq } from "lodash-es";
import { useEffect, useState } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { lsThemeAtom } from "~/atoms/ui";
import { Input } from "~/components/ui/input";
import { cn } from "~/core/utils/cn";
import { useDarkMode } from "~/hooks/use-dark-mode";
import RteDropdownMenu from "./rte-dropdown-menu";

const getActiveClasses = (editor: any, keys: string[] | boolean, from: string) => {
  const isFromSettings = from === "settings";
  const isActive = typeof keys === "boolean" ? keys : keys.some((key) => editor.isActive(key));
  return {
    "rounded p-1": true,
    "hover:bg-blue-900 hover:text-blue-100": !isActive && !isFromSettings,
    "hover:bg-blue-100 hover:text-blue-900": !isActive && isFromSettings,
    "bg-blue-500 text-white": isActive && isFromSettings,
    "bg-white text-blue-500": isActive && !isFromSettings,
  };
};

const Commons = ({ themeColors, onClose, color, onChange, onRemove }: any) => {
  return (
    <>
      <div className="flex w-[180px] flex-wrap gap-1 pb-2">
        {themeColors?.length > 0 &&
          uniq(themeColors).map((hex) => (
            <button
              key={hex as string}
              className={cn(
                "h-4 w-4 cursor-pointer rounded-full border border-gray-900 shadow duration-200 hover:scale-105 hover:shadow-xl",
                {
                  "border-2": hex === color,
                },
              )}
              style={{ backgroundColor: hex as string }}
              onClick={() => {
                onChange(hex as string);
                onClose();
              }}
              title={((hex as string) || "#000000")?.toUpperCase()}
            />
          ))}
      </div>
      <HexAlphaColorPicker color={color} onChange={onChange} style={{ width: "200px", height: "200px" }} />
      <div className="mt-1 flex items-center justify-between gap-1">
        <Input
          type="text"
          value={color || "#000000f2"}
          onChange={(e) => onChange(e.target.value, true)}
          className="!h-5 !w-[105px] rounded-sm !p-0 text-center font-light uppercase text-gray-600 outline-none ring-0 focus:ring-0"
          placeholder="#000000"
        />
        <button
          className="flex h-4 w-max cursor-pointer items-center gap-x-1 rounded-full bg-transparent px-1 text-red-600 shadow-none duration-200 hover:bg-red-100"
          onClick={() => {
            onRemove();
            onClose();
          }}
          title="Remove">
          <Cross1Icon className="h-3 w-3" /> Remove
        </button>
      </div>
    </>
  );
};

// Common Color Picker Component
const ColorPickerContent = ({
  textColor,
  highlightColor,
  onChangeTextColor,
  onChangeHighlightColor,
  onRemoveTextColor,
  onRemoveHighlightColor,
  onClose,
}: {
  textColor: string;
  highlightColor: string;
  onChangeTextColor: (color: string, isInput?: boolean) => void;
  onChangeHighlightColor: (color: string, isInput?: boolean) => void;
  onRemoveTextColor: () => void;
  onRemoveHighlightColor: () => void;
  onClose: () => void;
}) => {
  const [darkMode] = useDarkMode();
  const [theme]: [any, any] = useAtom(lsThemeAtom);
  const colors = theme?.colors || {};
  const themeColors = Object.values(colors).map((color) => get(color, darkMode ? "1" : "0"));
  const [moreColors, setMoreColors] = useState("TEXT");

  return (
    <div id="rte-widget-color-picker" className="px-1">
      <div className="mb-2 flex items-center justify-between rounded-md border bg-muted">
        <div
          className={`w-full cursor-pointer rounded p-0.5 text-center ${
            moreColors === "TEXT" ? "bg-blue-500 text-white" : "hover:bg-blue-100 hover:text-blue-500"
          }`}
          onClick={() => setMoreColors("TEXT")}>
          Text Color
        </div>
        <div
          className={`w-full cursor-pointer rounded p-0.5 text-center ${
            moreColors === "HIGHLIGHT" ? "bg-blue-500 text-white" : "hover:bg-blue-100 hover:text-blue-500"
          }`}
          onClick={() => setMoreColors("HIGHLIGHT")}>
          Highlight Color
        </div>
      </div>
      {moreColors === "TEXT" ? (
        <Commons
          themeColors={themeColors}
          onClose={onClose}
          onChange={onChangeTextColor}
          color={textColor}
          onRemove={onRemoveTextColor}
        />
      ) : (
        <Commons
          themeColors={themeColors}
          onClose={onClose}
          onChange={onChangeHighlightColor}
          color={highlightColor}
          onRemove={onRemoveHighlightColor}
        />
      )}
    </div>
  );
};

const RteColorPicker = ({ editor, from, menuRef }: { editor: any; from?: "settings" | "canvas"; menuRef: any }) => {
  const currentTextColor = editor?.getAttributes("textStyle")?.color;
  const currentHighlightColor = editor?.getAttributes("highlight")?.color;

  const [textColor, setTextColor] = useState(currentTextColor || "#000000F2");
  const [highlightColor, setHighlightColor] = useState(currentHighlightColor || "#00000057");
  const [debouncedTextColor, setDebouncedTextColor] = useDebouncedState(textColor, 150);
  const [debouncedHighlightColor, setDebouncedHighlightColor] = useDebouncedState(highlightColor, 150);

  const handleTextColorChange = (color: string, isInput?: boolean) => {
    if (isInput) {
      setTextColor(color);
      setDebouncedTextColor(color);
    } else {
      editor?.chain().setColor(color).run();
      setTextColor(color);
    }
  };

  const handleHighlightColorChange = (color: string, isInput?: boolean) => {
    if (isInput) {
      setHighlightColor(color);
      setDebouncedHighlightColor(color);
    } else {
      editor?.chain().setHighlight({ color }).run();
      setHighlightColor(color);
    }
  };

  const handleRemoveTextColor = () => {
    editor?.chain().unsetColor().run();
    setTextColor("#000000F2");
  };

  const handleRemoveHighlightColor = () => {
    editor?.chain().unsetHighlight().run();
  };

  useEffect(() => {
    if (currentHighlightColor) setHighlightColor(currentHighlightColor);
  }, [currentHighlightColor]);

  useEffect(() => {
    if (debouncedHighlightColor?.includes("#") && debouncedHighlightColor?.length >= 3) {
      editor?.chain().setHighlight({ color: debouncedHighlightColor }).run();
    }
  }, [debouncedHighlightColor]);

  useEffect(() => {
    if (debouncedTextColor?.includes("#") && debouncedTextColor?.length >= 3) {
      editor?.chain().setColor(debouncedTextColor).run();
    }
  }, [debouncedTextColor]);

  const isActive = Boolean(currentTextColor);
  return (
    <RteDropdownMenu
      editor={editor}
      from={from!}
      menuRef={menuRef}
      trigger={
        <div className={cn("relative flex items-center", getActiveClasses(editor, isActive, from!))} title="Text Color">
          <div
            className="h-4 w-4 rounded-full"
            style={{
              backgroundColor: currentTextColor ? currentTextColor : from === "canvas" ? "#FFFFFF" : "#000000",
            }}
          />
          <CaretDownIcon className="h-3 w-3 opacity-50" />
        </div>
      }
      content={(onClose) => (
        <ColorPickerContent
          textColor={textColor}
          highlightColor={highlightColor}
          onChangeTextColor={handleTextColorChange}
          onChangeHighlightColor={handleHighlightColorChange}
          onRemoveTextColor={handleRemoveTextColor}
          onRemoveHighlightColor={handleRemoveHighlightColor}
          onClose={onClose}
        />
      )}
    />
  );
};

export default RteColorPicker;
