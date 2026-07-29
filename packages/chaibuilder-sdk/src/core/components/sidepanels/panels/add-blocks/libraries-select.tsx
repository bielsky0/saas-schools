import { useTranslation } from "react-i18next";
import ChaiSelect from "~/core/components/chai-select";
import { ChaiLibrary } from "~/types/chaibuilder-editor-props";

export function UILibrariesSelect({
  uiLibraries,
  library,
  setLibrary,
}: {
  library?: string;
  uiLibraries: (ChaiLibrary & { id: string })[];
  setLibrary: (library: string) => void;
}) {
  const { t } = useTranslation();
  if (!library) return null;
  return (
    <div className="h-12">
      <p className="text-xs font-bold text-gray-500">{t("Choose library")}</p>
      <ChaiSelect
        className="mb-1"
        options={uiLibraries.map((uiLibrary) => ({
          value: uiLibrary.id,
          label: uiLibrary.name,
        }))}
        defaultValue={library}
        onValueChange={(v) => setLibrary(v as any)}
      />
    </div>
  );
}
