"use client";

import { UseMutateFunction } from "@tanstack/react-query";
import { find, first, isEmpty, merge, pick } from "lodash-es";
import {
  AlertTriangle,
  Archive,
  Check,
  Copy,
  Edit,
  Film,
  ImageIcon,
  Loader,
  RefreshCwIcon,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { mergeClasses } from "~/core/main";
import { compressImageIfNeeded, formatFileSize } from "~/pages/utils/image-compression";
import { useDeleteAsset, useUpdateAsset, useUploadAsset } from "./mutations";
import { Pagination } from "./pagination";
import { SingleAssetDetail } from "./single-asset-detail";
import type { Asset } from "./types";
import { useAssets } from "./use-assets";
const ImageEditor = React.lazy(() => import("./image-editor"));

const MAX_SIZE = 25 * 1024 * 1024;

export type MediaManagerProps = {
  assetId?: string;
  close: () => void;
  onSelect: (assets: Partial<any>[] | Partial<any>) => void;
  mode?: "image" | "video" | "audio";
};

type UploaderProps = {
  isUpdatingAsset: boolean;
  allowedTypes: string[];
  maxFileSize: number;
  uploadAssets: UseMutateFunction<
    any,
    Error,
    Array<{
      file: string;
      folderId?: string | undefined;
      name: string;
      optimize?: boolean;
    }>,
    unknown
  >;
  isUploadingAsset: boolean;
  onUploaded: (asset: Asset) => void;
};

const Uploader = ({ isUpdatingAsset, allowedTypes, uploadAssets, isUploadingAsset, onUploaded }: UploaderProps) => {
  const { t } = useTranslation();
  // Get optimize preference from localStorage, default to true if not set
  const [optimizeImages, setOptimizeImages] = useState<boolean>(() => {
    const savedPreference = localStorage.getItem("chai_optimize_images");
    return savedPreference !== null ? savedPreference === "true" : true;
  });

  // Save preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("chai_optimize_images", optimizeImages.toString());
  }, [optimizeImages]);
  const isLoading = isUpdatingAsset || isUploadingAsset;

  // * onDrop is used to handle the drop of a file
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        const files = acceptedFiles;
        // if file is not image type throw error
        if (!files.every((file) => file.type.startsWith("image/"))) {
          toast.error(t("Invalid file type. Please upload a valid file."));
          return Promise.reject(new Error("Invalid file type"));
        }
        const promises = files.map(async (file) => {
          let processedFile: File | Blob = file;
          if (file.type.startsWith("image/") && optimizeImages) {
            processedFile = await compressImageIfNeeded(file);
          }

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(processedFile);
            reader.onload = async () => {
              resolve({
                file: reader.result as string,
                folderId: undefined,
                name: file.name,
                optimize: optimizeImages,
              });
            };
            reader.onerror = () => reject(null);
          });
        });

        const sanitizedFiles = await Promise.all(promises);
        const uploadedAssets = (await uploadAssets(sanitizedFiles as any)) as any;
        if (uploadedAssets?.length === 1) {
          onUploaded(uploadedAssets[0]);
        }
        return uploadedAssets;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    [uploadAssets, optimizeImages, onUploaded, t],
  );

  const onDropWithValidation = (files: File[]) => {
    const valid: File[] = [];
    let fileLimitExceedCount = 0;

    files.forEach((file) => {
      if (file.size > MAX_SIZE) {
        fileLimitExceedCount++;
      } else {
        valid.push(file);
      }
    });

    if (fileLimitExceedCount > 0) {
      toast.error(
        `${fileLimitExceedCount === 1 && files.length === 1 ? t("File") : fileLimitExceedCount + (fileLimitExceedCount === 1 ? t(" file") : t(" files"))} ${t("exceed the maximum size limit of 10MB.")}`,
      );
    }
    return isEmpty(valid) ? [] : onDrop(valid);
  };

  // * useDropzone is used to handle the drop of a file
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropWithValidation,
    accept: {
      "image/*": allowedTypes.includes("image") ? [] : [],
    },
    disabled: isUpdatingAsset || isUploadingAsset,
    multiple: true,
  });

  return (
    <div
      className={`flex h-[60px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-0 py-2 hover:border-black/50 ${isLoading ? "pointer-events-none bg-gray-100 opacity-90" : "bg-gray-100 hover:border-black/50 hover:bg-gray-100"}`}>
      <div
        {...getRootProps()}
        className={mergeClasses(
          "flex h-max w-full cursor-pointer flex-col justify-center rounded-lg text-center",
          isLoading ? "items-start" : "items-center",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20",
        )}>
        <input {...getInputProps()} />
        {isLoading ? (
          <div className="flex flex-col items-center px-6">
            <div className={`flex items-center justify-center gap-2 leading-tight`}>
              <div className={`flex items-center justify-center rounded-full bg-indigo-100 p-2`}>
                <Loader className="h-4 w-4 animate-spin text-indigo-500" />
              </div>
              <div className="text-left">
                <div className="font-medium">{isUpdatingAsset ? t("Updating file...") : t("Uploading file...")}</div>
                <div className="text-xs font-light text-muted-foreground">
                  {t("Please wait while we")} {isUpdatingAsset ? t("update") : t("upload")} {t("your file...")}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between px-6">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-between gap-2 leading-tight`}>
                <div
                  className={`flex items-center justify-center rounded-full border border-indigo-500 bg-indigo-100 p-2`}>
                  <Upload className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">
                    {t("Drop your file here or")}{" "}
                    <span className="cursor-pointer text-indigo-500 hover:underline">{t("browse")}</span>
                  </div>
                  <div className="text-xs font-light text-muted-foreground">
                    <span className="">
                      {t("Accepted file types:")}{" "}
                      <span className="capitalize text-indigo-400">{allowedTypes.join(", ")}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {t("Optimization:")}{" "}
                  <span className={optimizeImages ? "text-indigo-600" : "text-gray-400"}>
                    {optimizeImages ? t("On") : t("Off")}
                  </span>
                </span>
                <Switch
                  checked={optimizeImages}
                  onCheckedChange={(checked) => {
                    setOptimizeImages(checked);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`flex cursor-help items-center text-amber-500 ${optimizeImages ? "invisible" : ""}`}>
                      <AlertTriangle className="mr-1 h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs text-white">
                      {t("Warning: Unoptimized images may affect performance and page load times")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DigitalAssetManager({ close, onSelect, mode = "image", assetId }: MediaManagerProps) {
  const { t } = useTranslation();
  const multiple = false;
  const maxFileSize = 10;
  const allowedTypes = useMemo(() => [mode], [mode]);
  const [singleAssetId, setSingleAssetId] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState<string | null>(null);
  const [imageEditor, setImageEditor] = useState<{
    show: boolean;
    file: string;
    id?: string;
    name?: string;
  }>({ show: false, file: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<"grid" | "details">(assetId ? "details" : "grid");

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(30);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (assetId) {
      setSingleAssetId(assetId);
      setView("details");
    }
  }, [assetId]);

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInputValue);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInputValue]);

  // Fetch assets using the query directly
  const {
    data,
    isLoading: isLoadingAssets,
    refetch,
  } = useAssets({
    search: searchQuery.toLowerCase().trim(),
    page: currentPage,
    limit: limit,
  });

  const assets = (data?.assets || []) as Asset[];

  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / limit);

  useEffect(() => {
    if (isLoadingAssets) return;
    if (totalPages <= 0) return;
    setCurrentPage((prevPage) => {
      if (prevPage > totalPages) return totalPages;
      if (prevPage < 1) return 1;
      return prevPage;
    });
  }, [isLoadingAssets, totalPages]);

  const hasAssets = assets?.length > 0;

  // Mutations
  const { mutate: deleteAsset } = useDeleteAsset();
  const { mutateAsync: uploadAssets, isPending: isUploadingAsset } = useUploadAsset();
  const { mutateAsync: updateAsset, isPending: isUpdatingAsset } = useUpdateAsset();

  // Pagination handlers
  const goToPage = useCallback(
    (page: number) => {
      const clampedPage = Math.min(Math.max(1, page), Math.max(1, totalPages));
      if (clampedPage !== currentPage) {
        setCurrentPage(clampedPage);
      }
    },
    [totalPages, currentPage],
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  };

  // Update selected assets
  const updateSelectedAssets = useCallback(
    (asset: Asset) => {
      setSelectedAssets((prev) => {
        if (multiple) {
          const isSelected = find(prev, { id: asset.id });
          if (isSelected) {
            return prev.filter((a) => a.id !== asset.id);
          } else {
            return [...prev, asset];
          }
        } else {
          const isSelected = find(prev, { id: asset.id });
          return isSelected ? [] : [asset];
        }
      });
    },
    [multiple],
  );

  const clearSelectedAssets = useCallback(() => {
    setSelectedAssets([]);
  }, []);

  const handleConfirmSelection = (assets?: Asset[]) => {
    if (assets?.length === 0) return;
    onSelect(pick(first(assets || selectedAssets), ["id", "url", "width", "height", "description"]));
    close();
  };

  const handleDeleteAsset = async (asset: Asset) => {
    setAssetToDelete(asset);
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeletingAsset(assetToDelete?.id);
    await deleteAsset(assetToDelete.id, {
      onSuccess: () => {
        setIsDeletingAsset(null);
        setAssetToDelete(null);
      },
      onError: () => {
        setIsDeletingAsset(null);
      },
    });
    setAssetToDelete(null);
  };

  const handleEditMetadata = (asset: Asset) => {
    setSingleAssetId(asset.id);
    setView("details");
  };

  const handleImageEditorSave = async (editedImageBase64: Base64URLString, isCopy: boolean) => {
    try {
      // Get current optimization preference
      const optimizeImages = localStorage.getItem("chai_optimize_images") !== "false";

      if (isCopy) {
        // Add a new file if isCopy is true
        const uploadedAssets = await uploadAssets([
          {
            file: editedImageBase64,
            folderId: undefined,
            name: imageEditor.name || "",
            optimize: optimizeImages,
          },
        ]);
        if (uploadedAssets?.length > 0) {
          const newAsset = uploadedAssets[0];
          onSelect({
            ...pick(newAsset, ["id", "width", "height", "description"]),
            url: newAsset.url,
          });
        }
      } else {
        const updatedAsset = await updateAsset({
          id: imageEditor.id || "",
          file: editedImageBase64,
        });
        if (updatedAsset) {
          onSelect({
            ...pick(updatedAsset, ["id", "width", "height", "description"]),
            url: updatedAsset.url,
          });
        }
      }
      setImageEditor({ show: false, file: "" });
      close();
    } catch (error) {
      console.error(t("Error saving edited image:"), error);
    }
  };

  const onUploaded = useCallback((asset: Asset) => {
    setSelectedAssets([asset]);
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      goToPage(page);
    },
    [goToPage],
  );

  return (
    <>
      <div className="flex h-[80vh] max-h-[1232px] w-[80vw] max-w-[1232px] flex-col space-y-4">
        <h1 className="text-lg font-medium">{t("Digital Asset Manager")}</h1>

        {view === "grid" ? (
          <>
            <Uploader
              maxFileSize={maxFileSize}
              allowedTypes={allowedTypes}
              uploadAssets={uploadAssets}
              isUpdatingAsset={isUpdatingAsset}
              isUploadingAsset={isUploadingAsset}
              onUploaded={onUploaded}
            />

            <div className="relative flex flex-1 flex-col gap-y-3 overflow-hidden rounded-lg border p-2">
              {/* Search and sort controls in a single row */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-1/2">
                  <Search
                    strokeWidth={3}
                    className={`absolute left-2 top-2.5 h-4 w-4 text-muted-foreground ${searchInputValue.length > 0 ? "text-indigo-800" : ""}`}
                  />
                  <Input
                    placeholder={t("Search assets...")}
                    onChange={handleSearchChange}
                    value={searchInputValue}
                    className={`pl-8`}
                  />
                </div>
                <div className="flex items-center gap-x-2">
                  {selectedAssets.length > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedAssets.length > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => clearSelectedAssets()}
                              title={t("Clear selection")}>
                              {t("Clear")}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleConfirmSelection(selectedAssets)}
                          disabled={selectedAssets.length === 0}>
                          {multiple
                            ? t("Select {{count}} Assets", { count: selectedAssets.length })
                            : t("Select Asset")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <Button variant="ghost" size="icon" onClick={() => refetch()}>
                    <RefreshCwIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pb-[66px]">
                {isLoadingAssets ? (
                  <div className="columns-1 gap-3 space-y-3 sm:columns-3 md:columns-5">
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
                  </div>
                ) : !isLoadingAssets && !hasAssets ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border">
                    <div className="text-muted-foreground">
                      <Archive className="h-9 w-9 text-indigo-500" />
                    </div>
                    <div className="text-lg text-muted-foreground">{t("No assets found")}</div>
                    <div className="text-sm text-muted-foreground">
                      {searchQuery.length > 0
                        ? t("No assets found for your search: {{query}}", { query: searchQuery })
                        : t("Start uploading assets to get started")}
                    </div>
                    <br />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 p-1">
                    {/* Render assets */}
                    {assets?.map((asset) => (
                      <div
                        key={asset.id}
                        className={mergeClasses(
                          "group relative flex max-h-[180px] max-w-[180px] cursor-pointer flex-col justify-between overflow-hidden rounded-lg border-2 transition-all",
                          selectedAssets.some((a) => a.id === asset.id) ? "border-blue-500" : "hover:border-black/90",
                          isDeletingAsset && assetToDelete?.id === asset.id ? "pointer-events-none opacity-50" : "",
                          isDeletingAsset === asset.id ? "pointer-events-none opacity-50" : "",
                        )}
                        onClick={() => updateSelectedAssets(asset)}
                        onDoubleClick={() => handleConfirmSelection([asset])}>
                        <div className="aspect-square relative overflow-hidden">
                          {isDeletingAsset === asset.id ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Loader className="h-8 w-8 animate-spin text-white" />
                            </div>
                          ) : null}
                          {asset.type === "image" ? (
                            <img
                              src={`${asset.thumbnailUrl || "/placeholder.svg"}?v=${asset?.updatedAt || asset.createdAt}`}
                              alt={asset.name}
                              className={`h-full min-h-[80px] w-full object-contain ${selectedAssets.some((a) => a.id === asset.id) ? "" : "group-hover:blur group-hover:contrast-50"}`}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Film className="h-12 w-12 text-muted-foreground" />
                              {asset.thumbnailUrl && (
                                <img
                                  src={`${asset.thumbnailUrl || "/placeholder.svg"}?v=${asset?.updatedAt || asset.createdAt}`}
                                  alt={asset.name}
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-end justify-between border-t-[1px] border-black/10 bg-white px-2 py-1">
                          <div className="truncate text-xs leading-tight" title={asset.name}>
                            {asset.name}
                          </div>
                          <div className="flex items-center justify-between whitespace-nowrap text-[9px] font-light text-muted-foreground">
                            <span>{formatFileSize(asset?.size || 0)}</span>
                          </div>
                        </div>

                        {!selectedAssets.some((a) => a.id === asset.id) && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="grid grid-cols-4 gap-2 p-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditMetadata(asset);
                                      }}>
                                      <ImageIcon className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("View Details")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(asset.url);
                                        toast.success(t("Asset URL copied to clipboard"));
                                      }}>
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("Copy URL")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setImageEditor({
                                          id: asset.id,
                                          show: true,
                                          file: asset.url,
                                          name: asset.name,
                                        });
                                      }}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("Edit Image")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAsset(asset);
                                      }}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("Delete Asset")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        )}

                        {selectedAssets.some((a) => a.id === asset.id) && (
                          <div className="absolute right-1 top-1 h-max rounded-full border border-white bg-blue-500 p-1">
                            <Check className="h-3 w-3 text-white" strokeWidth={5} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed Pagination */}
              {totalPages > 1 && (
                <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
                  <ErrorBoundary fallback={<div className="text-red-500">{t("Error loading pagination")}</div>}>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      pageRangeDisplayed={3}
                      showPageInput={true}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </>
        ) : (
          <SingleAssetDetail
            assetId={singleAssetId || assetId || ""}
            onBack={() => {
              setView("grid");
              setSingleAssetId(null);
            }}
            onEdit={(asset) => {
              setImageEditor({
                id: asset.id,
                show: true,
                file: asset.url,
                name: asset.name,
              });
            }}
            onSave={async (description) => {
              if (!singleAssetId) return;
              setIsSaving(true);
              try {
                const asset = assets.find((a) => a.id === singleAssetId);
                if (asset) {
                  await updateAsset(merge(asset, { description }));
                }
              } finally {
                setIsSaving(false);
              }
            }}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Image Editor Dialog */}
      {imageEditor.show && (
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          }>
          <ImageEditor
            imageUrl={imageEditor.file}
            onSave={handleImageEditorSave}
            onClose={() => setImageEditor({ show: false, file: "" })}
            defaultSavedImageName={imageEditor.name}
            isEditing={Boolean(imageEditor.id)}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      {assetToDelete && (
        <Dialog open={Boolean(assetToDelete)} onOpenChange={() => setAssetToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Delete Asset")}</DialogTitle>
              <DialogDescription>
                {t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', {
                  name: assetToDelete.name,
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAssetToDelete(null)}>
                {t("Cancel")}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                {t("Delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
