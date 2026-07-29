import { UseMutateFunction } from "@tanstack/react-query";

export type AssetType = "image" | "video";

export interface Asset {
  id: string;
  name: string;
  description?: string;
  type: AssetType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // for videos
  format?: string;
  tags?: string[];
  folderId: string | null;
  createdAt: string;
  updatedAt?: string;
  usedOnCount?: number;
  usedOn?: Array<{ name: string; slug: string }>;
}

export type AssetsManagerResponseProps = {
  query: string;
  selectedAssets: Asset[];
  assets: Asset[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Mutations
  uploadAsset: UseMutateFunction<
    any,
    Error,
    { file: Base64URLString; folderId: string | null; name: string },
    unknown
  >;
  updateAsset: UseMutateFunction<
    any,
    Error,
    { id: string; description?: string; file?: Base64URLString },
    unknown
  >;
  deleteAsset: UseMutateFunction<any, Error, string, unknown>;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  updateSearchQuery: (query: string) => void;
  clearSelectedAssets: () => void;
  updateSelectedAssets: (asset: Asset) => void;

  // Loading
  isLoadingAssets: boolean;
  isUploadingAsset: boolean;
  isUpdatingAsset: boolean;
  isDeletingAsset: boolean;
};
