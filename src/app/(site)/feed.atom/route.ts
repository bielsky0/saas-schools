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

  let atom = '<?xml version="1.0" encoding="UTF-8"?>\n';
  atom += '<feed xmlns="http://www.w3.org/2005/Atom">\n';
  atom += "  <title>" + escapeXml(siteName) + "</title>\n";
  atom += "  <subtitle>Najnowsze wpisy na blogu</subtitle>\n";
  atom += "  <link href=\"" + baseUrl + "/blog\" rel=\"alternate\" type=\"text/html\" />\n";
  atom += "  <link href=\"" + baseUrl + "/feed.atom\" rel=\"self\" type=\"application/atom+xml\" />\n";
  atom += "  <id>" + baseUrl + "/blog</id>\n";
  atom += "  <updated>" + new Date().toISOString() + "</updated>\n";
  atom += "  <author>\n    <name>" + escapeXml(siteName) + "</name>\n  </author>\n";
  atom += '  <generator uri="https://langlion.pl" version="1.0">langlion</generator>\n';

  for (const post of posts) {
    const url = baseUrl + "/blog/" + post.slug;
    const updated = post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.updatedAt).toISOString();
    const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.updatedAt).toISOString();

    atom += "  <entry>\n";
    atom += "    <title>" + escapeXml(post.title) + "</title>\n";
    atom += "    <link href=\"" + url + "\" rel=\"alternate\" type=\"text/html\" />\n";
    atom += "    <id>" + url + "</id>\n";
    atom += "    <updated>" + updated + "</updated>\n";
    atom += "    <published>" + published + "</published>\n";
    atom += "    <summary type=\"html\">" + escapeXml(post.excerpt) + "</summary>\n";
    atom += "    <content type=\"html\"><![CDATA[" + post.body + "]]></content>\n";
    atom += "    <author>\n      <name>" + escapeXml(siteName) + "</name>\n    </author>\n";
    for (const tag of post.tags) {
      atom += "    <category term=\"" + escapeXml(tag) + "\" />\n";
    }
    if (post.image) {
      atom += '    <link href="' + post.image + '" rel="enclosure" type="image/jpeg" />\n';
    }
    atom += "  </entry>\n";
  }

  atom += "</feed>";

  return new Response(atom, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
