import { atom, useAtom } from "jotai";

/**
 * Blog post preview data shared between the template editor right panel
 * (F5.3 dropdown) and the dedicated blog blocks rendered on the canvas.
 * Set to `null` outside blog templates or when no post is selected —
 * blog blocks then render placeholders.
 */
export type BlogPostPreview = {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  image: string;
  author: string;
  datePublished: string;
  tags: string[];
  categories: string[];
  slug: string;
};

export const blogPostPreviewAtom = atom<BlogPostPreview | null>(null);
blogPostPreviewAtom.debugLabel = "blogPostPreviewAtom";

export const useBlogPostPreview = () => {
  const [preview, setPreview] = useAtom(blogPostPreviewAtom);
  return { preview, setPreview };
};
