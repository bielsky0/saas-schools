import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Cross1Icon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { Dialog, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from "~/components/ui/dialog";
import { usePostsManager } from "./use-posts-manager";
import PostsList from "./posts-list";
import TemplateSelector from "./template-selector";

/**
 * Posts manager modal (blog-templates-cms F3). Rendered once in BuilderLayout —
 * it reads its open state from the shared postsModalAtom, so the Pages tab can
 * open it via usePostsManager().open(collectionId). The DialogOverlay dims the
 * canvas (bg-black/40); the builder itself stays untouched underneath.
 */
export const PostsManagerModal = () => {
  const { t } = useTranslation();
  const { state, collection, close, goToChoose, goToList, navigateToPost } = usePostsManager();

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && close()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          {state.open && collection && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">
                  {t("Manage posts: {{name}}", { name: collection.name })}
                </DialogTitle>
              </DialogHeader>

              {state.step === "list" ? (
                <PostsList collection={collection} onNewPost={goToChoose} onSelectPost={navigateToPost} />
              ) : (
                <TemplateSelector collection={collection} onBack={goToList} />
              )}

              <div className="text-xs text-muted-foreground">
                {t("Click a row to edit post content. The builder stays in the background.")}
              </div>
            </>
          )}

          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <Cross1Icon className="h-4 w-4" />
            <span className="sr-only">{t("Close")}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default PostsManagerModal;
