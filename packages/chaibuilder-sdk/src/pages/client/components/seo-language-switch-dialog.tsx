import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";

interface SeoLanguageSwitchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
  fromLanguage: string;
  toLanguage: string;
}

/**
 * Simple dialog to warn users about unsaved SEO changes when switching languages
 */
export const SeoLanguageSwitchDialog = ({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  isSaving = false,
  fromLanguage,
  toLanguage,
}: SeoLanguageSwitchDialogProps) => {
  const fromLangName = LANGUAGES[fromLanguage] || fromLanguage;
  const toLangName = LANGUAGES[toLanguage] || toLanguage;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unsaved SEO Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes in the SEO for "{fromLangName}" version. Do you want to save these changes before
            switching to "{toLangName}" version?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
            Discard Changes
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save & Switch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
