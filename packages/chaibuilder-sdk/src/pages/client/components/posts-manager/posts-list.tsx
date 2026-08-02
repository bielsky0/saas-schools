import { debounce } from "lodash-es";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FilePlus2, Inbox } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { CmsCollectionVm } from "~/types/collections";
import { useCollectionItems } from "./use-posts-manager";
import PostsListRow from "./posts-list-row";

const LoadingRows = () => (
  <>
    {Array.from({ length: 5 }, (_, i) => (
      <tr key={i} className="border-t border-border">
        <td colSpan={4} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </td>
      </tr>
    ))}
  </>
);

/**
 * Posts list inside the posts manager modal (blog-templates-cms F3): search,
 * drafts-only filter, "X of N" counter and the post table.
 */
export const PostsList = ({
  collection,
  onNewPost,
  onSelectPost,
}: {
  collection: CmsCollectionVm;
  onNewPost: () => void;
  onSelectPost: (pageId: string) => void;
}) => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [draftsOnly, setDraftsOnly] = useState(false);

  // Stable debounce instance — not recreated on every render.
  const debouncedSetSearch = useMemo(() => debounce(setSearch, 300), []);

  const { data: items = [], isPending } = useCollectionItems({
    collectionId: collection.id,
    search,
    draftsOnly,
  });

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSetSearch(value);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("Search posts...")}
            className="pr-8"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
              ✕
            </button>
          )}
        </div>
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-muted-foreground">
          <Checkbox checked={draftsOnly} onCheckedChange={(checked) => setDraftsOnly(Boolean(checked))} />
          {t("Drafts only")}
        </label>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("{{count}} of {{total}}", {
            count: items.length,
            total: collection.postCount ?? items.length,
          })}
        </span>
        <Button size="sm" onClick={onNewPost}>
          <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
          {t("New post")}
        </Button>
      </div>

      <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">{t("Title")}</th>
              <th className="px-4 py-2 font-medium">{t("Template")}</th>
              <th className="px-4 py-2 font-medium">{t("Date")}</th>
              <th className="px-4 py-2 font-medium">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <LoadingRows />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <Inbox className="mx-auto mb-2 h-6 w-6 stroke-[1] text-muted-foreground" />
                  <div className="text-sm font-medium text-muted-foreground">{t("No posts in this collection")}</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={onNewPost}>
                    <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                    {t("New post")}
                  </Button>
                </td>
              </tr>
            ) : (
              items.map((post) => <PostsListRow key={post.id} post={post} onClick={onSelectPost} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PostsList;
