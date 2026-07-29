import { forEach, get, isEmpty, map, set } from "lodash-es";
import * as React from "react";
import { useState } from "react";
import AttrsEditor from "~/core/components/settings/new-panel/attributes-editor";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import { useUpdateBlocksProps } from "~/hooks/use-update-blocks-props";

export const BlockAttributesEditor = React.memo(() => {
  const block = useSelectedBlock();
  const [attributes, setAttributes] = useState([] as Array<{ key: string; value: string }>);
  const [selectedStylingBlock] = useSelectedStylingBlocks();
  const updateBlockProps = useUpdateBlocksProps();

  const attrKey = `${get(selectedStylingBlock, "0.prop")}_attrs`;

  React.useEffect(() => {
    const _attributes = map(get(block, attrKey), (value, key) => ({ key, value }));
    if (!isEmpty(_attributes)) setAttributes(_attributes as any);
    else setAttributes([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [get(block, attrKey)]);

  const updateAttributes = React.useCallback(
    (updatedAttributes: any = []) => {
      if (!block) return;
      const _attrs = {};
      forEach(updatedAttributes, (item) => {
        if (!isEmpty(item.key)) {
          set(_attrs, item.key, item.value);
        }
      });
      updateBlockProps([get(block, "_id")], { [attrKey]: _attrs });
    },
    [block, updateBlockProps, attrKey],
  );

  return (
    <div className="flex-col gap-y-2">
      <div className="flex flex-col">
        <div>
          <AttrsEditor preloadedAttributes={attributes} onAttributesChange={updateAttributes} />
        </div>
      </div>
    </div>
  );
});
