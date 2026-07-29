import { initial, isEmpty } from "lodash-es";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useDuplicatePage } from "~/pages/hooks/pages/use-duplicate-page";
import { useChangePage } from "~/pages/hooks/use-change-page";
import { SlugInput } from "./slug-input";

const DuplicatePage = ({
  page,
  onClose,
  closePanel = () => {},
}: {
  page: any;
  onClose: () => void;
  closePanel: () => void;
}) => {
  const { t } = useTranslation();
  const { mutate: duplicatePage, isPending } = useDuplicatePage();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(`${page.name} (Copy)`);
  const changePage = useChangePage();

  // Check if it's a partial (empty slug)
  const isPartial = isEmpty(page.slug);

  // Only set slug state if it's not a partial
  const [slug, setSlug] = useState(isPartial ? "" : `${page.slug.split("/").pop()}-copy`);

  // Only calculate baseSlug if it's not a partial
  const baseSlug = isPartial ? "" : initial(page.slug.split("/")).join("/");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!name.trim()) {
      setError(t("Name is required"));
      return;
    }

    // Only validate slug if it's not a partial
    if (!isPartial && !slug.trim()) {
      setError(t("Slug is required"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Create payload based on whether it's a partial or not
    const payload: { pageId: string; name: string; slug?: string } = {
      pageId: page.id,
      name,
    };

    // Only include slug in the payload if it's not a partial
    if (!isPartial) {
      payload.slug = `${baseSlug}/${slug}`;
    }

    duplicatePage(payload, {
      onSuccess: (response) => {
        setIsSubmitting(false);
        onClose();
        changePage(response.id, closePanel);
      },
      onError: (error: any) => {
        setIsSubmitting(false);

        // Handle specific error cases
        if (error.code === "SLUG_EXISTS") {
          setError(t("A page with this slug already exists. Please choose a different slug."));
        } else if (error.code === "INVALID_SLUG") {
          setError(t("The slug format is invalid. Please use only lowercase letters, numbers, and hyphens."));
        } else if (error.code === "PERMISSION_DENIED") {
          setError(t("You don't have permission to duplicate this page."));
        } else {
          setError(error.message || t("Failed to duplicate page. Please try again later."));
        }
      },
    });
  };

  return (
    <Dialog open={!!page} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Duplicate Page")}</DialogTitle>
          <DialogDescription>{t("Create a copy of the page with a new name and slug")}</DialogDescription>
        </DialogHeader>

        <div className="mb-4 rounded-md bg-gray-50 p-3">
          <h3 className="mb-1 text-sm font-medium">{t("Duplicating:")}:</h3>
          <div className="flex flex-col gap-1 text-sm text-gray-700">
            <div>
              <span className="font-medium">{t("Name")}:</span> {page.name}
            </div>
            {!isPartial && (
              <div>
                <span className="font-medium">{t("Slug")}:</span> {page.slug}
              </div>
            )}
            <div>
              <span className="font-medium">{t("Type")}:</span> {page.pageType}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm">
              {t("Name")}
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {/* Only show slug input if it's not a partial */}
          {!isPartial && (
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm">
                {t("Slug")}
              </Label>
              <SlugInput
                value={slug}
                onChange={(value) => setSlug(value)}
                parentSlug={baseSlug}
                onValidationChange={(isValid) => {
                  if (!isValid) {
                    setError(t("Invalid slug"));
                  } else {
                    setError(null);
                  }
                }}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || (!isPartial && !slug.trim()) || isPending || isSubmitting}>
              {isPending || isSubmitting ? t("Duplicating...") : t("Duplicate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicatePage;
