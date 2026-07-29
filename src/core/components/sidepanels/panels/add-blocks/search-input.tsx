import { Cross1Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";

export default function SearchInput({ value, setValue }: { value: string; setValue: (query: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex py-2">
      <div className="relative flex w-full max-w-md items-center rounded border px-2">
        <div className="flex w-full items-center gap-x-2">
          <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 stroke-[1px] text-muted-foreground" />
          <Input
            placeholder={t("Search blocks...")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full flex-1 border-none p-0 leading-tight outline-none"
          />
        </div>
        {value && (
          <button
            onClick={() => setValue("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
            <Cross1Icon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
