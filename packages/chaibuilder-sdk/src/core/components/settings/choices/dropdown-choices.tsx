import { InfoCircledIcon } from "@radix-ui/react-icons";
import { get } from "lodash-es";
import { useContext, useMemo } from "react";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useCurrentClassByProperty } from "~/core/components/settings/choices/block-style";
import { StyleContext } from "~/core/components/settings/choices/style-context";
import { useTailwindClassList } from "~/core/constants/CLASSES_LIST";
import { useUndoManager } from "~/hooks/history/use-undo-manager";

export const DropDownChoices = ({ label, property, onChange }: any) => {
  const { getClasses } = useTailwindClassList();
  const classes = getClasses(property);
  const currentClass = useCurrentClassByProperty(property);
  const pureClsName = useMemo(() => get(currentClass, "cls", ""), [currentClass]);
  const { canChange } = useContext(StyleContext);
  const isArbitraryClassUsed = /\[.*\]/g.test(pureClsName);
  return (
    <div className={label ? "w-full rounded" : "grow"}>
      {isArbitraryClassUsed ? (
        <div className="flex items-center">
          <Input className="w-[70%] rounded py-1" readOnly value={pureClsName} />
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button type="button" className="invisible ml-3 mt-1 text-blue-600 group-hover:visible">
                <InfoCircledIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent>Current value is using a Tailwind arbitrary value.</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <DropDown
          rounded={label}
          onChange={(newClsName: string) => onChange(newClsName, property)}
          selected={pureClsName}
          options={classes}
          disabled={!canChange}
        />
      )}
    </div>
  );
};

export function DropDown({ selected, onChange, rounded = false, options, disabled = false }: any) {
  const currentClassName = selected.replace(/.*:/g, "").trim();
  const { undo, redo } = useUndoManager();

  return (
    <select
      disabled={!options.length || disabled}
      className={`${
        rounded ? "rounded-md border border-border" : "border-0"
      } disable:bg-gray-500 h-full w-full truncate rounded bg-background px-2 py-1 text-xs outline-none disabled:cursor-not-allowed`}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(evt) => {
        if (evt.ctrlKey) {
          if (evt.key === "z") undo();
          if (evt.key === "y") {
            redo();
          }
        }
      }}
      value={currentClassName}>
      {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
      <option className="bg-transparent" value="" />
      {options.map((clsName: string, index: number) => (
        <option key={`option-${index}`} className="bg-transparent" value={clsName}>
          {clsName}
        </option>
      ))}
    </select>
  );
}
