import Link from "next/link";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  blocks: ChaiBlock[];
  seo: Record<string, unknown> | null;
  publishedAt: Date | null;
};

function extractText(blocks: ChaiBlock[]): string {
  const texts: string[] = [];
  const walk = (nodes: ChaiBlock[]) => {
    for (const node of nodes) {
      if (typeof node.content === "string" && node.content) {
        texts.push(node.content);
      }
      if (typeof node.text === "string" && node.text) {
        texts.push(node.text);
      }
      if (Array.isArray(node.children)) {
        walk(node.children as ChaiBlock[]);
      }
    }
  };
  walk(blocks);
  return texts.join(" ");
}

function excerpt(blocks: ChaiBlock[], max = 150): string {
  const text = extractText(blocks);
  if (text.length <= max) return text;
  const trimmed = text.slice(0, max).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + "…";
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(d));
}

export async function BlogList({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-10 text-4xl font-bold">Blog</h1>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const seo = (post.seo ?? {}) as {
            ogImage?: string;
          };
          const imgSrc = seo.ogImage;
          return (
            <Link
              key={post.id}
              href={post.slug}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {imgSrc && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={imgSrc}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-5">
                <time className="text-sm text-muted-foreground">
                  {formatDate(post.publishedAt)}
                </time>
                <h2 className="text-xl font-semibold leading-tight text-foreground group-hover:underline">
                  {post.title}
                </h2>
                <p className="mt-auto line-clamp-3 text-sm text-muted-foreground">
                  {excerpt(post.blocks)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {posts.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          Brak opublikowanych wpisów.
        </p>
      )}
    </div>
  );
}
