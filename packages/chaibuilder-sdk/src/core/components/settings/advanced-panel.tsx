import { isEmpty } from "lodash-es";
import { useTranslation } from "react-i18next";
import { BlockAttributesEditor } from "~/core/components/settings/new-panel/block-attributes-editor";
import { ManualClasses } from "~/core/components/settings/new-panel/manual-classes";
import { useSelectedStylingBlocks } from "~/hooks/use-selected-styling-blocks";

export const AdvancedPanel = () => {
  const { t } = useTranslation();
  const [stylingBlocks] = useSelectedStylingBlocks();

  return (
    <div className="flex flex-col">
      <ManualClasses />
      {!isEmpty(stylingBlocks) && (
        <>
          <div className="flex items-center justify-between border-t border-border py-3 text-xs font-medium">
            <span>{t("Attributes")}</span>
          </div>
          <BlockAttributesEditor />
        </>
      )}
      <div className="border-t border-border py-3">
        <p className="mb-2 text-xs font-medium">{t("Custom code")}</p>
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          {t("Custom code coming soon")}
        </div>
      </div>
    </div>
  );
};
