import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";
import { ACTIONS } from "~/pages/constants/ACTIONS";
import { useCollections } from "~/pages/hooks/pages/use-collections";
import { useApiUrl } from "~/pages/hooks/project/use-builder-prop";
import { useFetch } from "~/pages/hooks/utils/use-fetch";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { navigateToPage } from "~/pages/utils/navigation";
import { CmsCollectionItemVm } from "~/types/collections";

export type PostsModalState =
  | { open: false }
  | { open: true; collectionId: string; step: "list" | "choose" };

/**
 * Modal state for the posts manager (blog-templates-cms F3). Lives in a global
 * Jotai atom so the Pages tab trigger (`onOpenPosts`) and the modal rendered in
 * BuilderLayout can communicate without prop drilling.
 */
export const postsModalAtom = atom<PostsModalState>({ open: false });

export const usePostsManager = () => {
  const [state, setState] = useAtom(postsModalAtom);
  const { data: collections = [] } = useCollections();
  const [, setQueryParams] = useSearchParams();

  const collection = state.open
    ? collections.find((c) => c.id === state.collectionId) ?? null
    : null;

  const open = (collectionId: string) => setState({ open: true, collectionId, step: "list" });
  const close = () => setState({ open: false });
  const goToChoose = () => setState((prev) => (prev.open ? { ...prev, step: "choose" } : prev));
  const goToList = () => setState((prev) => (prev.open ? { ...prev, step: "list" } : prev));

  // Navigate to a post's editor without keeping the modal open — the URL change
  // drives the canvas; the modal layer is torn down first to avoid a flash.
  const navigateToPost = (pageId: string) => {
    close();
    navigateToPage(new URLSearchParams({ page: pageId }), setQueryParams);
  };

  return { state, collection, open, close, goToChoose, goToList, navigateToPost };
};

/**
 * Query a collection's post items. `search` and `draftsOnly` are forwarded to the
 * backend (both are part of the LIST_COLLECTION_ITEMS contract since F1); they are
 * part of the query key, so React Query refetches on filter change.
 */
export const useCollectionItems = ({
  collectionId,
  search,
  draftsOnly,
}: {
  collectionId?: string;
  search?: string;
  draftsOnly?: boolean;
}) => {
  const fetchAPI = useFetch();
  const apiUrl = useApiUrl();

  return useQuery<CmsCollectionItemVm[]>({
    queryKey: [ACTIONS.LIST_COLLECTION_ITEMS, collectionId, search, draftsOnly],
    enabled: Boolean(collectionId),
    queryFn: async () => {
      const data = await fetchAPI(apiUrl, {
        action: ACTIONS.LIST_COLLECTION_ITEMS,
        data: {
          collectionId,
          search: search?.trim() || undefined,
          draftsOnly: draftsOnly || undefined,
        },
      });
      return data?.items || [];
    },
    placeholderData: (prev) => prev || [],
  });
};

/**
 * Create a new post in a collection from a chosen template. On success the API
 * returns the created page; the modal keeps the created page id to navigate to
 * the post editor (F5). Errors surface inline in the template selector — the
 * modal stays open so the tenant can pick another template or fix the input.
 */
export const useCreateCollectionItem = () => {
  const fetchAPI = useFetch();
  const apiUrl = useApiUrl();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, templateId }: { collectionId: string; templateId: string }) => {
      const response = await fetchAPI(apiUrl, {
        action: ACTIONS.CREATE_COLLECTION_ITEM,
        data: { collectionId, templateId },
      });
      return response?.page as { id: string };
    },
    onSuccess: (_page, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_COLLECTIONS] });
      queryClient.invalidateQueries({ queryKey: [ACTIONS.LIST_COLLECTION_ITEMS, collectionId] });
    },
  });
};
