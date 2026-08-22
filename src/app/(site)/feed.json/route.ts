import { getFeedPosts, getSiteName } from "@/features/cms/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = request.headers.get("host") || "";
  const baseUrl = "https://" + host;
  const siteName = await getSiteName();
  const posts = await getFeedPosts(50);

  const jsonFeed = {
    version: "https://jsonfeed.org/version/1.1",
    title: siteName,
    home_page_url: baseUrl + "/blog",
    feed_url: baseUrl + "/feed.json",
    description: "Najnowsze wpisy na blogu",
    language: "pl",
    authors: [{ name: siteName }],
    items: posts.map((post) => {
      const url = baseUrl + "/blog/" + post.slug;
      return {
        id: url,
        url: url,
        title: post.title,
        content_html: post.body,
        summary: post.excerpt,
        date_published: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.updatedAt).toISOString(),
        date_modified: new Date(post.updatedAt).toISOString(),
        tags: post.tags,
        authors: [{ name: siteName }],
        attachments: post.image ? [{ url: post.image, mime_type: "image/jpeg" }] : [],
      };
    }),
  };

  return new Response(JSON.stringify(jsonFeed, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
