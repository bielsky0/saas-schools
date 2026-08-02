import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { CmsCollectionItemVm } from "~/types/collections";

const StatusBadge = ({ status }: { status: CmsCollectionItemVm["status"] }) => {
  const { t } = useTranslation();
  if (status === "published") {
    return (
      <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">
        {t("Published")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-700">
      {t("Draft")}
    </Badge>
  );
};

/**
 * A single post row in the posts manager table (blog-templates-cms F3).
 * Clicking the row navigates to the post's content editor (F5).
 */
export const PostsListRow = ({
  post,
  onClick,
}: {
  post: CmsCollectionItemVm;
  onClick: (postId: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <tr
      onClick={() => onClick(post.id)}
      className="cursor-pointer border-t border-border transition-colors duration-200 hover:bg-muted/60">
      <td className="max-w-0 px-4 py-2.5">
        <div className="truncate font-medium text-foreground">{post.title}</div>
      </td>
      <td className="max-w-0 px-4 py-2.5">
        <div className={cn("truncate text-sm", post.templateName ? "text-muted-foreground" : "text-muted-foreground/50")}>
          {post.templateName || t("No template")}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-muted-foreground">
        {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "—"}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={post.status} />
      </td>
    </tr>
  );
};

export default PostsListRow;
