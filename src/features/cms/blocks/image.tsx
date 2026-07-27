import type { Block } from "payload";

export const imageBlock: Block = {
  slug: "image",
  admin: { group: "Treść" },
  fields: [
    {
      name: "media",
      type: "relationship",
      relationTo: "media",
      required: true,
    },
    {
      name: "alt",
      type: "text",
    },
    {
      name: "caption",
      type: "text",
    },
  ],
};

type ImageBlockProps = {
  alt?: string | null;
  caption?: string | null;
  media?: { url?: string; alt?: string } | string;
};

export function ImageBlock({ alt, caption, media }: ImageBlockProps) {
  const mediaUrl = typeof media === "object" && media ? media.url : null;
  const mediaAlt = alt ?? (typeof media === "object" && media ? media.alt : null);

  if (!mediaUrl) return null;

  return (
    <figure className="my-4">
      {/* Dynamic CMS image — unknown dimensions, cannot use next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl} alt={mediaAlt ?? ""} className="h-auto max-w-full rounded-md" />
      {caption && <figcaption className="mt-1 text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}


