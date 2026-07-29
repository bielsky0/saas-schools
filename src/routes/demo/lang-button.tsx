import { ChatBubbleIcon, ChevronDownIcon, StarIcon } from "@radix-ui/react-icons";
import { get, isEmpty, map } from "lodash-es";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { LANGUAGES } from "~/core/constants/LANGUAGES";
import { mergeClasses } from "~/core/main";
import { useLanguages } from "~/hooks/use-languages";

export const LanguageButton = () => {
  const { fallbackLang, selectedLang, setSelectedLang } = useLanguages();
  const currentLang = !isEmpty(selectedLang) ? selectedLang : fallbackLang;

  const languageOptions = [
    { key: "en", value: "English" },
    { key: "fr", value: "French" },
  ];
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="focus:outline-none">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChatBubbleIcon className="h-4 w-4" />
            {get(LANGUAGES, currentLang, currentLang)}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="space-y-1 border-border">
          {map(languageOptions, (option: any) => (
            <DropdownMenuItem
              key={option.value}
              className={mergeClasses(
                "flex cursor-pointer items-center justify-between text-xs font-medium text-gray-800",
                option.key === currentLang && "!bg-gray-200 text-gray-700",
              )}
              onClick={() => setSelectedLang(option.key)}>
              <div className="text-slate-600">{option.value}</div>
              {option.key === fallbackLang && (
                <small className={`flex items-center gap-x-1 text-[9px] leading-none text-orange-500`}>
                  <StarIcon fill="orange" className="h-2 w-2" />
                  Primary
                </small>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
