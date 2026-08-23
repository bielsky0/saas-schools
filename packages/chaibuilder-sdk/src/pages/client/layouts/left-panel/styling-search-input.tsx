import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";

export const StylingSearchInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="relative mb-3">
      <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("Search style properties")}
        className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-7 text-xs outline-none transition-shadow focus:ring-1 focus:ring-blue-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("Clear search")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:bg-black/[.06] hover:text-foreground">
          <Cross2Icon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};