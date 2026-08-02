import { useAtom } from "jotai";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { usePageLockStatus } from "~/pages/client/components/page-lock/page-lock-hook";
import { PublishButton } from "~/pages/client/components/topbar-right";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { SaveStateLabel } from "../topbar/builder-top-bar";
import { mobileSheetAtom } from "./mobile-sheet-states";

export const MobileTopBar = () => {
  const { t } = useTranslation();
  const [, setMobileSheet] = useAtom(mobileSheetAtom);
  const { isLocked } = usePageLockStatus();
  const { data: currentPage } = usePrimaryPage();

  return (
    <div className="flex h-11 w-full shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-50 px-1.5 text-gray-900">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-md"
        aria-label={t("Back")}
        onClick={() => setMobileSheet("collapsed")}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-1">
        <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-400" />
        <span className="min-w-0 truncate text-[13px] font-medium">{currentPage?.name || t("Editor")}</span>
      </div>

      {isLocked ? null : (
        <div className="flex shrink-0 items-center gap-1">
          <SaveStateLabel />
          <PublishButton />
        </div>
      )}
    </div>
  );
};

export default MobileTopBar;
