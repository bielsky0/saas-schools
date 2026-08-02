import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { CmsCollectionVm } from "~/types/collections";
import { useCreateCollectionItem, usePostsManager } from "./use-posts-manager";

/**
 * Template chooser step of the posts manager modal (blog-templates-cms F3):
 * 2-column card grid with the collection's layout templates. Clicking a card
 * creates a post from that template and navigates to its editor. On error the
 * modal stays open and the message renders inline.
 */
export const TemplateSelector = ({
  collection,
  onBack,
}: {
  collection: CmsCollectionVm;
  onBack: () => void;
}) => {
  const { t } = useTranslation();
  const { navigateToPost } = usePostsManager();
  const createCollectionItem = useCreateCollectionItem();

  const handleSelect = (templateId: string) => {
    createCollectionItem.mutate(
      { collectionId: collection.id, templateId },
      {
        onSuccess: (page) => navigateToPost(page.id),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          disabled={createCollectionItem.isPending}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("Back to posts list")}
        </button>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground">{t("Choose a template")}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("You can change the template later in post settings")}
        </p>
      </div>

      {collection.templates.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("No templates available")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {collection.templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template.id)}
              disabled={createCollectionItem.isPending}
              className={cn(
                "group flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors duration-200",
                "hover:border-primary hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
              )}>
              <div className="flex h-16 w-full items-center justify-center rounded-md bg-muted/60 transition-colors group-hover:bg-muted">
                <LayoutTemplate className="h-6 w-6 stroke-[1] text-muted-foreground" />
              </div>
              <div className="w-full">
                <div className="truncate font-medium text-foreground">{template.name}</div>
                {template.layout && (
                  <div className="truncate font-mono text-xs text-muted-foreground">{template.layout}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {createCollectionItem.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("Could not create post")}: {createCollectionItem.error?.message ?? ""}
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
