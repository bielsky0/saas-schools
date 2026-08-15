import { TrashIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { useRemoveBlocks } from "~/hooks/use-remove-blocks";

/**
 * Faza 2 (§3.2): kosz na hover węzła z potwierdzeniem. Reużywa istniejący
 * `useRemoveBlocks` (gated PERMISSIONS.DELETE_BLOCK, wchodzi do historii undo).
 * Uwaga (ryzyko #8): `useRemoveBlocks` czyści selekcję po 200ms — trzymamy
 * `blockId` lokalnie (zamiast czytać aktualną selekcję w momencie potwierdzenia).
 */
export const ConfirmDeleteSectionDialog = ({
  blockId,
  blockName,
  trigger,
}: {
  blockId: string;
  blockName?: string;
  trigger?: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const removeBlocks = useRemoveBlocks();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <span className="cursor-pointer rounded p-px hover:bg-primary/10" aria-label={t("Delete")}>
            <TrashIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{t("Delete section?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {blockName
              ? t("Are you sure you want to delete “{{name}}”? This cannot be undone.", { name: blockName })
              : t("Are you sure you want to delete this section? This cannot be undone.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-foreground">{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => removeBlocks([blockId])}>
            {t("Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
