import { ChevronDownIcon, ChevronRightIcon, InfoCircledIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { FieldTemplateProps } from "@rjsf/utils";
import { get, isEmpty } from "lodash-es";
import { useMemo, useState } from "react";
import { usePageExternalData } from "~/atoms/builder";
import { Badge } from "~/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { LANGUAGES } from "~/core/constants/LANGUAGES";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useRegisteredChaiBlocks } from "~/runtime";
import { DataBindingSelector } from "./data-binding-selector";

const JSONFormFieldTemplate = (props: FieldTemplateProps) => {
  const { id, classNames, label, children, errors, help, hidden, required, schema, formData, onChange } = props;
  const { selectedLang, fallbackLang, languages } = useLanguages();
  const lang = useMemo(
    () => (isEmpty(languages) ? "" : isEmpty(selectedLang) ? fallbackLang : selectedLang),
    [languages, selectedLang, fallbackLang],
  );
  const currentLanguage = useMemo(() => get(LANGUAGES, lang, lang), [lang]);
  const pageExternalData = usePageExternalData();

  const selectedBlock = useSelectedBlock();
  const registeredBlocks = useRegisteredChaiBlocks();
  const i18nProps = useMemo(
    () => get(registeredBlocks, [selectedBlock?._type!, "i18nProps"], []),
    [registeredBlocks, selectedBlock?._type],
  );
  const [openedList, setOpenedList] = useState<null | string>(null);

  if (hidden) {
    return null;
  }

  const isCheckboxOrRadio = schema.type === "boolean";
  if (isCheckboxOrRadio) return <div className={classNames}>{children}</div>;

  const showLangSuffix = i18nProps?.includes(id.replace("root.", "") as never);

  if (schema.type === "array") {
    const isListOpen = openedList === id;

    return (
      <div className={`${classNames} relative`}>
        {schema.title && (
          <div className="flex items-center justify-between gap-1">
            <label
              htmlFor={id}
              onClick={() => setOpenedList(isListOpen ? null : id)}
              className="flex cursor-pointer items-center gap-x-1 py-1 leading-tight duration-200 hover:bg-slate-100">
              {isListOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
              <ListBulletIcon className="h-3 w-3" />
              <span className="leading-tight">{label}</span>&nbsp;
              <Badge className="m-0 bg-gray-200 px-2 leading-tight text-gray-500 hover:bg-gray-200 hover:text-gray-500">
                <span className="text-[9px] font-medium text-slate-600">{formData?.length}</span>
              </Badge>
              {schema.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Prevent toggling list when clicking the info icon */}
                      <InfoCircledIcon
                        className="h-3 w-3 text-muted-foreground/70"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{schema.description}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </label>
          </div>
        )}
        {formData?.length === 0 ? (
          <div className="h-0 overflow-hidden">{children}</div>
        ) : (
          <div className={`${!isListOpen ? "h-0 overflow-hidden" : "pt-0.5"}`}>
            {children}
            {errors}
            {help}
          </div>
        )}
      </div>
    );
  }

  const field = id.replace("root.", "");
  const showMissingWarning = i18nProps.includes(field as never) && !isEmpty(selectedLang) && isEmpty(formData);
  return (
    <div className={classNames}>
      {schema.title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor={id} className={schema.type === "object" ? "pb-2" : ""}>
              {label} {showLangSuffix && <small className="text-[9px] text-zinc-400"> {currentLanguage}</small>}
              {required && schema.type !== "object" ? " *" : null}
            </label>
            {schema.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircledIcon className="h-3 w-3 text-muted-foreground/70" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{schema.description}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {!schema.enum && !schema.oneOf && pageExternalData && (
            <span className="flex items-center space-x-1">
              {showMissingWarning ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-triangle-alert-icon lucide-triangle-alert h-3 w-3 text-orange-400">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </svg>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    No translation provided. <br />
                    Using default language value.
                  </TooltipContent>
                </Tooltip>
              ) : null}
              <DataBindingSelector
                schema={schema}
                onChange={(value) => {
                  onChange(value, formData, id);
                }}
                id={id}
                formData={formData}
              />
            </span>
          )}
        </div>
      )}
      {children}
      {errors}
      {help}
    </div>
  );
};

export default JSONFormFieldTemplate;
