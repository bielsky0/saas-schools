import { useThrottledCallback } from "@react-hookz/web";
import { get, isEmpty, startsWith } from "lodash-es";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion } from "~/components/ui/accordion";
import { BlockStylingProps } from "~/core/components/settings/block-styling-props";
import { StylingGroup } from "~/core/components/settings/new-panel/setting-section";
import { BlockSettingsContext } from "~/core/components/settings/settings-context";
import { FLEX_CHILD_SECTION, GRID_CHILD_SECTION, SETTINGS_SECTIONS } from "~/core/constants/STYLING_GROUPS";
import { useSelectedBlocksDisplayChild } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { AiStyleBar } from "~/pages/client/layouts/left-panel/ai-style-bar";
import { QuickStyles } from "~/pages/client/layouts/left-panel/quick-styles";
import { StylingSearchInput } from "~/pages/client/layouts/left-panel/styling-search-input";
import { filterStylingSections } from "~/pages/client/layouts/left-panel/styling-search";

const MAPPER: { [key: string]: number } = {
  px: 1,
  "%": 1,
  em: 100,
  rem: 100,
  ch: 1,
  vw: 1,
  vh: 1,
  "-": 1,
  deg: 1,
  ms: 0.1,
};

export default function BlockStyling() {
  const { t } = useTranslation();
  const { flexChild, gridChild } = useSelectedBlocksDisplayChild();
  const [stylingBlocks] = useSelectedStylingBlocks();
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedVal, setDraggedVal] = React.useState<any>("");
  const [dragData, setDragData] = React.useState({
    onDrag: (value: string) => value,
    onDragEnd: (value: string) => value,
    dragStartY: 0,
    dragging: false,
    dragStartValue: 0,
    dragUnit: "",
    negative: false,
    cssProperty: "",
  });

  const filteredSections = useMemo(
    () => filterStylingSections(SETTINGS_SECTIONS, searchQuery, t),
    [searchQuery, t],
  );
  const showNoResults = isEmpty(filteredSections) && isEmpty(searchQuery) === false;

  const updateStyle = useThrottledCallback(
    (e: any) => {
      const onlyPositive = !get(dragData, "negative", false);
      const property = get(dragData, "cssProperty", "");
      let currentValue = parseFloat(dragData.dragStartValue as any);
      currentValue = isNaN(currentValue) ? 0 : currentValue;

      let divider = MAPPER[dragData.dragUnit];
      if (startsWith(property, "scale") || property === "opacity") {
        divider = 10;
      }

      const draggedPx = dragData.dragStartY - e.pageY;
      let value = draggedPx / divider + currentValue;
      if (onlyPositive && value < 0) {
        value = 0;
      }

      if (property === "opacity" && value > 1) {
        value = 1;
      }

      dragData.onDrag(`${value}`);
      setDraggedVal(`${value}`);
    },
    [dragData],
    50,
  );

  const dragStopped = useCallback(() => {
    setTimeout(() => dragData.onDragEnd(`${draggedVal}`), 100);
    setDragData({
      onDrag: (value) => value,
      onDragEnd: (value) => value,
      dragStartY: 0,
      dragging: false,
      dragStartValue: 0,
      dragUnit: "",
      negative: false,
      cssProperty: "",
    });
  }, [dragData, draggedVal, setDragData]);
  const hasStylingBlock = !isEmpty(stylingBlocks);

  return (
    <BlockSettingsContext.Provider value={{ setDragData }}>
      {dragData.dragging ? (
        <div
          onMouseMove={updateStyle}
          onMouseUp={() => dragStopped()}
          className="absolute inset-0 z-30 cursor-row-resize bg-gray-300/10"
        />
      ) : null}
      <div className="flex flex-col">
        <AiStyleBar />
        <QuickStyles />
        {hasStylingBlock && (
          <>
            <StylingSearchInput value={searchQuery} onChange={setSearchQuery} />
            <BlockStylingProps />
            <Accordion defaultValue={["Styles"]} type="multiple" className="w-full">
              {flexChild && <StylingGroup section={FLEX_CHILD_SECTION} showAccordian={flexChild || gridChild} />}
              {gridChild && <StylingGroup section={GRID_CHILD_SECTION} showAccordian={flexChild || gridChild} />}
              {filteredSections.map((section) => (
                <StylingGroup key={section.heading} section={section} showAccordian={flexChild || gridChild} />
              ))}
            </Accordion>
            {showNoResults && (
              <p className="py-4 text-center text-xs text-muted-foreground">{t("No style properties found")}</p>
            )}
          </>
        )}
      </div>
    </BlockSettingsContext.Provider>
  );
}
