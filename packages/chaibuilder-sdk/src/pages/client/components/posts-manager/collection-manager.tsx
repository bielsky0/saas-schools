import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutTemplate, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useCollectionActions } from "~/pages/hooks/pages/use-collection-actions";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { CmsCollectionVm } from "~/types/collections";

const emptyDraft = {
  key: "",
  name: "",
  pageType: "",
  templatePageType: "",
};

const CollectionForm = ({
  initial,
  isEditing,
  onClose,
}: {
  initial: CmsCollectionVm | null;
  isEditing: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { createCollection, updateCollection } = useCollectionActions();
  const [draft, setDraft] = useState(initial ? {
    key: initial.id,
    name: initial.name,
    pageType: initial.pageType,
    templatePageType: initial.templatePageType,
  } : emptyDraft);

  const handleSubmit = () => {
    if (isEditing && initial) {
      updateCollection.mutate(
        {
          collectionId: initial.id,
          data: {
            name: draft.name.trim(),
            pageType: draft.pageType.trim(),
            templatePageType: draft.templatePageType.trim(),
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createCollection.mutate(
        {
          key: draft.key.trim(),
          name: draft.name.trim(),
          pageType: draft.pageType.trim() || "blog_post",
          templatePageType: draft.templatePageType.trim() || "blog_post_template",
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Settings className="h-4 w-4 stroke-[1] text-muted-foreground" />
        <span className="text-sm font-medium">
          {isEditing ? t("Edit collection") : t("Add collection")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="col-name">{t("Collection name")}</Label>
          <Input
            id="col-name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder={t("Collection name")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="col-key">{t("Collection key")}</Label>
          <Input
            id="col-key"
            value={draft.key}
            disabled={isEditing}
            onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
            placeholder="blog"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="col-page-type">{t("Page type")}</Label>
          <Input
            id="col-page-type"
            value={draft.pageType}
            onChange={(e) => setDraft((d) => ({ ...d, pageType: e.target.value }))}
            placeholder="blog_post"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("Template page type")}</Label>
          <Input
            value={draft.templatePageType}
            onChange={(e) => setDraft((d) => ({ ...d, templatePageType: e.target.value }))}
            placeholder="blog_post_template"
          />
        </div>
      </div>
      <Button
        className="mt-3"
        size="sm"
        disabled={!draft.name || createCollection.isPending || updateCollection.isPending}
        onClick={handleSubmit}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {isEditing ? t("Save") : t("Add collection")}
      </Button>
    </div>
  );
};

/**
 * CMS collection management panel (blog-templates-cms F2.5). Opened from the
 * Pages tab's "CMS Collections" header. Lets the tenant create/edit/delete
 * their own collections and their layout template variants.
 */
export const CollectionManager = ({
  open,
  onClose,
  editCollection,
}: {
  open: boolean;
  onClose: () => void;
  editCollection?: CmsCollectionVm | null;
}) => {
  const { t } = useTranslation();
  const { data: collections = [] } = useCollections();
  const { deleteCollection, addTemplate, deleteTemplate } = useCollectionActions();
  const templateCounter = useRef(1);

  const isEditing = Boolean(editCollection);

  const handleDelete = (collection: CmsCollectionVm) => {
    deleteCollection.mutate(collection.id);
  };

  const handleAddTemplate = (collection: CmsCollectionVm) => {
    addTemplate.mutate({
      collectionId: collection.id,
      template: {
        id: `tpl-${collection.id}-${templateCounter.current++}`,
        name: `${collection.name} Template`,
        layout: "single",
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("Edit collection") : t("Manage collections")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {collections.map((collection) => (
            <div key={collection.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black">{collection.name}</span>
                    <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                      {collection.id}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    pageType: <span className="font-mono">{collection.pageType}</span>
                    <span className="mx-1">·</span>
                    {collection.postCount} {t("All posts").toLowerCase()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleAddTemplate(collection)} title={t("Add template")}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(collection)}
                    title={t("Delete collection")}
                    className="text-destructive hover:text-destructive"
                    disabled={collection.postCount > 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 space-y-1 pl-1">
                {collection.templates.map((template) => (
                  <div key={template.id} className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-xs">
                    <LayoutTemplate className="h-3 w-3 shrink-0 stroke-[1] text-slate-500" />
                    <span className="min-w-0 flex-1 truncate">{template.name}</span>
                    <span className="rounded bg-muted px-1 py-px font-mono text-[10px] text-muted-foreground">
                      {template.layout}
                    </span>
                    <button
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      title={t("Delete template")}
                      onClick={() => deleteTemplate.mutate({ collectionId: collection.id, templateId: template.id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <CollectionForm
            key={isEditing && editCollection ? editCollection.id : "new-collection"}
            initial={isEditing && editCollection ? editCollection : null}
            isEditing={isEditing}
            onClose={onClose}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionManager;
