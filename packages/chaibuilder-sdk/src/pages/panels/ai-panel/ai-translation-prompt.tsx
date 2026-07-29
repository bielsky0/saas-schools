"use client";

import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";

const TranslationPrompts = ({
  selectedLang,
  isLoading,
  selectedBlock,
  onClick,
}: {
  selectedLang: string;
  isLoading?: boolean;
  selectedBlock?: any;
  onClick: (prompt: string, content?: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-col gap-2 ${isLoading ? "pointer-events-none opacity-50" : ""}`}>
        {selectedBlock ? (
          <Button variant="outline" className="h-auto" onClick={() => onClick("TRANSLATE")}>
            <div className="flex flex-col">
              <p className="text-left text-xs font-thin">{t("Quick Action:")}</p>
              <span className="flex items-center gap-x-2 text-sm font-medium">
                {t("Translate Content")} {t("to")} {LANGUAGES[selectedLang]} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default TranslationPrompts;
