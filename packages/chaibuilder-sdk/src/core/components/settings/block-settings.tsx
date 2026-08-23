import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { IChangeEvent } from "@rjsf/core";
import { cloneDeep, debounce, forEach, get, includes, isEmpty, keys, set, startCase, startsWith } from "lodash-es";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { JSONForm } from "~/core/components/settings/json-form";
import { COLLECTION_PREFIX } from "~/core/constants/STRINGS";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useUpdateBlocksProps, useUpdateBlocksPropsRealtime } from "~/hooks/use-update-blocks-props";
import { useWrapperBlock } from "~/hooks/use-wrapper-block";
import { getBlockFormSchemas, getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlockConfig } from "~/types/blocks";
import { ChaiBlock } from "~/types/common";
import { AiContentBar } from "~/pages/client/layouts/left-panel/ai-content-bar";
import { getFieldPriority, hideFieldsInUiSchema } from "./field-priority";
import { VisibilitySettings } from "./visibility-setting";

const formDataWithSelectedLang = (formData: Record<string, any>, selectedLang: string, coreBlock: ChaiBlockConfig) => {
  const updatedFormData = cloneDeep(formData);
  forEach(keys(formData), (key) => {
    if (includes(get(coreBlock, "i18nProps", []), key) && !isEmpty(selectedLang)) {
      updatedFormData[key] = get(formData, `${key}-${selectedLang}`);
    }
  });

  return updatedFormData;
};
/**
 *
 * @returns Block Setting
 */
export default function BlockSettings() {
  const { t } = useTranslation();
  const { selectedLang } = useLanguages();
  const selectedBlock = useSelectedBlock() as any;
  const updateBlockPropsRealtime = useUpdateBlocksPropsRealtime();
  const updateBlockProps = useUpdateBlocksProps();
  const registeredBlock = getRegisteredChaiBlock(selectedBlock?._type) as ChaiBlockConfig;
  const formData = formDataWithSelectedLang(selectedBlock, selectedLang, registeredBlock);
  const [prevFormData, setPrevFormData] = useState(formData);

  const [showWrapperSetting, setShowWrapperSetting] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const wrapperBlock = useWrapperBlock() as ChaiBlock;
  const registeredWrapperBlock = getRegisteredChaiBlock(wrapperBlock?._type) as ChaiBlockConfig;
  const wrapperFormData = formDataWithSelectedLang(wrapperBlock, selectedLang, registeredWrapperBlock);

  const updateProps = ({ formData: newData }: IChangeEvent, prop?: string, oldState?: any) => {
    if (prop && prevFormData?._id === selectedBlock._id) {
      updateBlockProps([selectedBlock._id], { [prop]: get(newData, prop) } as any, oldState);
    }
  };

  const debouncedCall = useCallback(
    debounce(({ formData }, prop, oldPropState) => {
      updateProps({ formData } as IChangeEvent, prop, oldPropState);
      setPrevFormData(formData);
    }, 1500),
    [selectedBlock?._id, selectedLang],
  );

  const updateRealtime = ({ formData: newData }: IChangeEvent, prop?: string) => {
    if (prop) {
      updateBlockPropsRealtime([selectedBlock._id], { [prop]: get(newData, prop) } as any);
      debouncedCall({ formData: newData }, prop, { [prop]: get(prevFormData, prop) });
    }
  };

  const updateWrapperRealtime = ({ formData: newData }: IChangeEvent, prop?: string) => {
    if (prop) {
      updateBlockPropsRealtime([wrapperBlock._id], { [prop]: get(newData, prop) } as any);
      debouncedCall({ formData: newData }, prop, { [prop]: get(prevFormData, prop) });
    }
  };

  const { schema, uiSchema } = useMemo(() => {
    const type = selectedBlock?._type;
    if (!type) {
      return { schema: {}, uiSchema: {} };
    }
    try {
      const { schema, uiSchema } = getBlockFormSchemas(type) as { schema: any; uiSchema: any };
      //NOTE: This is special case for collection based repeater block
      if (type === "Repeater") {
        const repeaterItems = get(selectedBlock, "repeaterItems", "");
        if (!startsWith(repeaterItems, `{{${COLLECTION_PREFIX}`)) {
          set(uiSchema, "filter", { "ui:widget": "hidden" });
          set(uiSchema, "sort", { "ui:widget": "hidden" });
        } else {
          set(uiSchema, "filter", { "ui:widget": "collectionSelect" });
          set(uiSchema, "sort", { "ui:widget": "collectionSelect" });
        }
      }
      return { schema, uiSchema };
    } catch {
      return { schema: {}, uiSchema: {} };
    }
  }, [selectedBlock]);

  const { wrapperSchema, wrapperUiSchema } = useMemo(() => {
    if (!wrapperBlock || !wrapperBlock?._type) {
      return { wrapperSchema: {}, wrapperUiSchema: {} };
    }
    const type = wrapperBlock?._type;
    const { schema: wrapperSchema = {}, uiSchema: wrapperUiSchema = {} } = getBlockFormSchemas(type) as {
      schema: any;
      uiSchema: any;
    };
    return { wrapperSchema, wrapperUiSchema };
  }, [wrapperBlock]);

  const { extra: extraFields } = useMemo(
    () => getFieldPriority(schema?.properties, formData, schema?.required ?? []),
    [schema, formData],
  );

  const effectiveUiSchema = useMemo(
    () => (showMoreFields ? uiSchema : hideFieldsInUiSchema(uiSchema, extraFields)),
    [uiSchema, showMoreFields, extraFields],
  );

  return (
    <div className="no-scrollbar overflow-x-hidden px-px">
      <AiContentBar />
      <VisibilitySettings />
      {!isEmpty(wrapperBlock) && (
        <div className="mb-4 rounded border bg-zinc-100 px-1">
          <div
            onClick={() => setShowWrapperSetting((prev) => !prev)}
            className="flex cursor-pointer items-center gap-x-1 py-2 text-xs font-medium leading-tight hover:bg-slate-100">
            {showWrapperSetting ? (
              <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            )}
            {startCase(wrapperBlock._type)} settings{" "}
            {wrapperBlock._name && (
              <span className="text-[11px] font-light text-slate-400">({wrapperBlock._name})</span>
            )}
          </div>
          <div className={showWrapperSetting ? "h-auto" : "invisible h-0"}>
            <JSONForm
              blockId={wrapperBlock?._id}
              onChange={updateWrapperRealtime}
              formData={wrapperFormData}
              schema={wrapperSchema}
              uiSchema={wrapperUiSchema}
            />
          </div>
        </div>
      )}
      {!isEmpty(schema) ? (
        <JSONForm
          blockId={selectedBlock?._id}
          onChange={updateRealtime}
          formData={formData}
          schema={schema}
          uiSchema={effectiveUiSchema}
        />
      ) : null}
      {extraFields.length > 0 && (
        <button
          type="button"
          onClick={() => setShowMoreFields((prev) => !prev)}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-x-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-slate-100">
          {showMoreFields ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          )}
          {showMoreFields ? t("Show less") : t("More fields")} ({extraFields.length})
        </button>
      )}
    </div>
  );
}
