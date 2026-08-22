import { getFeedPosts, getSiteName } from "@/features/cms/feeds";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .split("&").join("&")
    .split("<").join("<")
    .split(">").join(">")
    .split('"').join('"')
    .split("'").join("&apos;");
}

export async function GET(request: Request) {
  const host = request.headers.get("host") || "";
  const baseUrl = "https://" + host;
  const siteName = await getSiteName();
  const posts = await getFeedPosts(50);

  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n';
  rss += "  <channel>\n";
  rss += "    <title>" + escapeXml(siteName) + "</title>\n";
  rss += "    <link>" + baseUrl + "/blog</link>\n";
  rss += "    <description>Najnowsze wpisy na blogu</description>\n";
  rss += "    <language>pl</language>\n";
  rss += "    <lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>\n";
  rss += '    <atom:link href="' + baseUrl + '/feed.xml" rel="self" type="application/rss+xml" />\n';

  for (const post of posts) {
    const url = baseUrl + "/blog/" + post.slug;
    const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date(post.updatedAt).toUTCString();

    rss += "    <item>\n";
    rss += "      <title>" + escapeXml(post.title) + "</title>\n";
    rss += "      <link>" + url + "</link>\n";
    rss += "      <guid isPermaLink=\"true\">" + url + "</guid>\n";
    rss += "      <pubDate>" + pubDate + "</pubDate>\n";
    rss += "      <description>" + escapeXml(post.excerpt) + "</description>\n";
    rss += "      <content:encoded><![CDATA[" + post.body + "]]></content:encoded>\n";
    rss += "      <dc:language>pl</dc:language>\n";
    for (const tag of post.tags) {
      rss += "      <category>" + escapeXml(tag) + "</category>\n";
    }
    if (post.image) {
      rss += '      <enclosure url="' + post.image + '" type="image/jpeg" />\n';
    }
    rss += "    </item>\n";
  }

  rss += "  </channel>\n";
  rss += "</rss>";

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
