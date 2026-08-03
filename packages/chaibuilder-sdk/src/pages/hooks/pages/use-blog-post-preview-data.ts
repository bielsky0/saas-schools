import { useQuery } from "@tanstack/react-query";
import { BlogPostPreview } from "~/hooks/use-blog-preview";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";

/**
 * Fetch the full preview data of a single blog post (GET_BLOG_POST_PREVIEW,
 * blog-templates-cms F5.3). The result is pushed into `blogPostPreviewAtom` by
 * the template editor's right panel so blog blocks render real post content.
 */
export const useBlogPostPreviewData = (postId?: string) => {
  const fetchApi = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<BlogPostPreview | null>({
    queryKey: [ACTIONS.GET_BLOG_POST_PREVIEW, postId],
    enabled: Boolean(postId),
    staleTime: 1000 * 30,
    queryFn: async () => {
      const data = await fetchApi(apiUrl, {
        action: ACTIONS.GET_BLOG_POST_PREVIEW,
        data: { postId },
      });
      return data?.preview ?? null;
    },
  });
};
