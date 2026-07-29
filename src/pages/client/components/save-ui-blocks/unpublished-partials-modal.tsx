import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { PartialBlockInfo } from "~/pages/hooks/pages/use-get-unpublished-partial-blocks";

interface UnpublishedPartialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onViewChanges?: (partialId: string, partialName: string) => void;
  isPending?: boolean;
  partialBlocksInfo?: PartialBlockInfo[];
}

const UnpublishedPartialsModal = ({
  isOpen,
  onClose,
  onContinue,
  onViewChanges,
  isPending = false,
  partialBlocksInfo = [],
}: UnpublishedPartialsModalProps) => {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("You have some unpublished changes")}</DialogTitle>
            <DialogDescription>
              {t("The following partials are either unpublished or have unpublished changes.")}
            </DialogDescription>
          </DialogHeader>
          {partialBlocksInfo?.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2">
              <ul className="space-y-1 text-sm">
                {partialBlocksInfo.map((info) => (
                  <li key={info?.id} className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <p
                        className={`h-2 w-2 rounded-full ${info?.status === "unpublished_changes" ? "bg-green-400" : "bg-gray-300"}`}></p>{" "}
                      {info?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      {info?.status === "unpublished_changes" && (
                        <>
                          <Badge className="border-green-200 bg-green-100 px-1.5 py-0 text-[10px] text-green-600 hover:bg-green-100">
                            {t("Published")}
                          </Badge>
                          {onViewChanges && (
                            <Button
                              variant="ghost"
                              title={t("View Changes")}
                              className="p-0 text-[10px] text-blue-600 hover:bg-transparent hover:text-blue-600 hover:underline"
                              onClick={() => onViewChanges(info.id, info.name)}>
                              {t("View Changes")}
                            </Button>
                          )}
                        </>
                      )}
                      {info?.status === "unpublished" && (
                        <Badge className="border-orange-200 bg-orange-100 px-1.5 py-0 text-[10px] text-orange-600 hover:bg-orange-100">
                          {t("Unpublished")}
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button onClick={onContinue} disabled={isPending}>
              {isPending ? t("Publishing...") : t("Publish Partials & Page")}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default UnpublishedPartialsModal;
