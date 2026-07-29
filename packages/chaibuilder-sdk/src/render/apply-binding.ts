import { cloneDeep, forEach, isArray, isEmpty, isString, keys, startsWith } from "lodash-es";
import { COLLECTION_PREFIX } from "~/core/constants/STRINGS";
import { resolveStringBinding } from "~/render/binding-engine";
import { ChaiBlock } from "~/types/common";

const applyBindingToValue = (
  value: any,
  pageExternalData: Record<string, any>,
  { index, key: repeaterKey }: { index: number; key: string },
  propertyKey?: string,
): any => {
  if (isString(value)) {
    return resolveStringBinding(value, pageExternalData, index, repeaterKey, propertyKey);
  }

  if (isArray(value)) {
    return value.map((item) => applyBindingToValue(item, pageExternalData, { index, key: repeaterKey }, propertyKey));
  }

  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    forEach(keys(value), (key) => {
      if (!startsWith(key, "_") && key !== "$repeaterItemsKey") {
        result[key] = applyBindingToValue(
          (value as Record<string, any>)[key],
          pageExternalData,
          { index, key: repeaterKey },
          key,
        );
      } else {
        result[key] = (value as Record<string, any>)[key];
      }
    });
    return result;
  }

  return value;
};

export const applyBindingToBlockProps = (
  blockChai: ChaiBlock,
  pageExternalData: Record<string, any>,
  { index, key: repeaterKey }: { index: number; key: string },
) => {
  let clonedBlock = cloneDeep(blockChai);
  if (clonedBlock.repeaterItems) {
    clonedBlock.$repeaterItemsKey = clonedBlock.repeaterItems;
    if (startsWith(clonedBlock.repeaterItems, `{{${COLLECTION_PREFIX}`)) {
      clonedBlock.$repeaterItemsKey =
        clonedBlock.repeaterItems = `${clonedBlock.repeaterItems.replace("}}", `/${clonedBlock._id}}}`)}`;
    }
    if (!isEmpty(clonedBlock.repeaterItems) && clonedBlock.pagination) {
      clonedBlock.repeaterTotalItems = `${clonedBlock.repeaterItems.replace("}}", `/${clonedBlock._id}/totalItems}}`)}`;
    }
  }
  return applyBindingToValue(clonedBlock, pageExternalData, { index, key: repeaterKey });
};
