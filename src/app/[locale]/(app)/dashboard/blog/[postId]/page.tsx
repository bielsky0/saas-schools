import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import { Link } from "@/lib/i18n/navigation";
import { getBlogPost } from "@/features/blog/data";
import { PostEditor } from "../components/post-editor";

interface PageProps {
  params: Promise<{ postId: string }>;
}

export default async function BlogPostEditorPage({ params }: PageProps) {
  const { org } = await requireOrgPermission("cms.manage");
  const { postId } = await params;
  const t = await getTranslations("blog");

  let post: Awaited<ReturnType<typeof getBlogPost>> = null;
  if (postId !== "new") {
    post = await withTenant(org.id, (tx) => getBlogPost(tx, org.id, postId));
    if (!post) notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/blog"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {t("backToPosts")}
          </Link>
          <h1 className="text-2xl font-semibold">
            {post ? t("editTitle") : t("newTitle")}
          </h1>
        </div>
        {post?.status === "published" && (
          <Link href={`/blog/${post.slug}`}>
            <Button variant="outline" size="sm">
              {t("viewPost")}
            </Button>
          </Link>
        )}
      </div>

      <PostEditor
        post={
          post
            ? {
                id: post.id,
                title: post.title,
                slug: post.slug,
                status: post.status,
                pageContent: post.pageContent,
                seo: post.seo,
              }
            : null
        }
      />
    </div>
  );
}
