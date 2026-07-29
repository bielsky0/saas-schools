import { WidgetProps } from "@rjsf/utils";
import { find, get } from "lodash-es";
import { COLLECTION_PREFIX } from "~/core/constants/STRINGS";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";

const CollectionFilterSortField = ({ id, value, onChange, onBlur }: WidgetProps) => {
  const collections = useBuilderProp("collections", []);
  const selectedBlock = useSelectedBlock();
  const repeaterItem = get(selectedBlock, "repeaterItems", "")
    .replace(/\{\{(.*)\}\}/g, "$1")
    .replace(COLLECTION_PREFIX, "");
  const collection = find(collections, { id: repeaterItem });

  const key = "root.filter" === id ? "filters" : "sorts";
  const options = get(collection, key, []);

  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => onBlur(id, e.target.value)}>
        <option value="">Select</option>
        {options.map((field: any) => (
          <option key={field.id} value={field.id}>
            {field.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export { CollectionFilterSortField };
