import { first, get, isEmpty } from "lodash-es";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "~/core/functions/common-functions";
import { STYLES_KEY } from "~/core/constants/STRINGS";
import { getSplitChaiClasses } from "~/hooks/get-split-classes";
import { useAddClassesToBlocks } from "~/hooks/use-add-classes-to-blocks";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";
import type { QuickStyleGroup, QuickStyleOption } from "./quick-styles-config";
import { QUICK_STYLE_GROUPS } from "./quick-styles-config";

const SPACING_BOX = 20;
const SPACING_RANGE = 32;

const GroupPreview = ({ group, option }: { group: QuickStyleGroup; option: QuickStyleOption }) => {
  if (group.kind === "color") {
    const isTransparent = option.color === "transparent";
    return (
      <span
        className={cn(
          "block h-4 w-4 rounded-full border border-black/10",
          isTransparent && "border-dashed bg-transparent",
        )}
        style={isTransparent ? {} : { backgroundColor: option.color }}
      />
    );
  }
  if (group.kind === "radius") {
    return (
      <span
        className="block h-4 w-4 border-[1.5px] border-[#8A8A8A]"
        style={{ borderRadius: `${option.radius}px` }}
      />
    );
  }
  if (group.kind === "spacing") {
    const inset = Math.max(1, Math.round(((option.spacing ?? 0) / SPACING_RANGE) * (SPACING_BOX - 4)));
    return (
      <span className="relative block h-[18px] w-[18px] border-[1.5px] border-[#8A8A8A]">
        <span className="absolute block bg-[#4A4A4A]" style={{ inset: `${inset}px` }} />
      </span>
    );
  }
  if (group.kind === "shadow") {
    return <span className="block h-4 w-4 rounded-sm bg-gray-200" style={{ boxShadow: option.shadow }} />;
  }
  return (
    <span className="block font-semibold leading-4 text-[#4A4A4A]" style={{ fontSize: option.fontSize }}>
      A
    </span>
  );
};

/**
 * Quick, friendly style presets for non-technical users: background color,
 * border radius, padding, margin, shadow and font size. Each option maps to a
 * single Tailwind class; twMerge drops conflicting classes from the same group
 * (e.g. `bg-white` → `bg-gray-900`). Full control stays in the advanced
 * sections below.
 */
export const QuickStyles = memo(() => {
  const { t } = useTranslation();
  const block = useSelectedBlock();
  const [styleBlocks, setStyleBlocks] = useSelectedStylingBlocks();
  const addClasses = useAddClassesToBlocks();

  const prop = first(styleBlocks)?.prop ?? "className";
  const classesString = get(block, prop, `${STYLES_KEY},`) as string;

  const currentClasses = useMemo(() => {
    const { classes } = getSplitChaiClasses(classesString);
    return classes.split(" ").filter((c) => !isEmpty(c));
  }, [classesString]);

  if (!block) return null;

  const apply = (value: string) => {
    if (isEmpty(styleBlocks)) {
      setStyleBlocks([{ id: `quick-${block._id}`, prop: "className", blockId: block._id }]);
    }
    addClasses([block._id], [value], true);
  };

  return (
    <div className="mb-3 flex flex-col gap-3">
      {QUICK_STYLE_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="mb-1 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t(group.labelKey)}
          </div>
          <div className="flex flex-wrap gap-1">
            {group.options.map((option) => {
              const isActive = currentClasses.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.value}
                  aria-label={option.value}
                  aria-pressed={isActive}
                  onClick={() => apply(option.value)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white transition-colors hover:border-[#005BD3] hover:bg-blue-50",
                    isActive && "border-[#005BD3] bg-blue-50 ring-1 ring-[#005BD3]",
                  )}>
                  <GroupPreview group={group} option={option} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});
QuickStyles.displayName = "QuickStyles";