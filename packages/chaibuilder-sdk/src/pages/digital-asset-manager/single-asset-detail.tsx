"use client";

import { AlertCircle, ChevronLeft, Copy, Link, Loader, Pencil } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { Asset } from "./use-assets";
import { useAsset } from "./use-assets";

// Helper functions
function formatFileSize(_bytes: number): string {
  const bytes = isNaN(_bytes) ? 0 : typeof _bytes === "number" ? _bytes : parseInt(_bytes);
  if (!bytes) return "0 B";
  if (bytes < 1024) {
    return `${bytes.toFixed(2)} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// * Check if the description is not the same as the previous description
function isNotSameDescription(description: string, asset: Asset) {
  let currentDescription = description;
  let previousDescription = asset?.description;
  if (!previousDescription || typeof previousDescription !== "string") previousDescription = "";
  if (!currentDescription || typeof currentDescription !== "string") currentDescription = "";

  return currentDescription !== previousDescription;
}

export type SingleAssetDetailProps = {
  assetId?: string;
  onBack: () => void;
  onEdit: (asset: Asset) => void;
  onSave: (description: string) => Promise<void>;
  isSaving: boolean;
};

export const SingleAssetDetail = ({ assetId, onBack, onEdit, onSave, isSaving }: SingleAssetDetailProps) => {
  const { t } = useTranslation();
  const { data: asset, isLoading, isError } = useAsset(assetId || "");
  const [description, setDescription] = useState("");
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = asset?.url || "";
    img.onload = () => setIsImageLoaded(true);
    return () => {
      img.onload = null;
    };
  }, [asset]);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("{{type}} copied to clipboard", { type }));
    } catch (error: any) {
      toast.error(t("Failed to copy {{type}}", { type }), {
        description: error?.message,
      });
    }
  };

  // Update description when asset changes
  React.useEffect(() => {
    if (asset?.description) {
      setDescription(asset.description);
    }
  }, [asset]);

  if (isLoading || !isImageLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !asset?.id) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto max-w-md p-6 text-center">
          <div className="mb-4 flex justify-center">
            <AlertCircle className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">{t("No Asset Found")}</h3>
          <p className="mb-6 text-sm text-gray-500">
            {isError
              ? t("There was an error loading the asset. Please try again later.")
              : t("The asset you're looking for doesn't exist or has been removed.")}
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={onBack}>
              {t("Back to Assets")}
            </Button>
            {isError && (
              <Button variant="default" onClick={() => window.location.reload()}>
                {t("Try Again")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isSaving}>
          <ChevronLeft className="h-4 w-4" />
          {t("Back to Assets")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={isSaving}>
            {t("Cancel")}
          </Button>
          <Button variant="outline" onClick={() => handleCopy(asset.url, t("Asset URL"))} disabled={isSaving}>
            <Copy className="mr-2 h-4 w-4" />
            {t("Copy URL")}
          </Button>
          <Button variant="default" onClick={() => onEdit(asset)} disabled={isSaving}>
            <Pencil className="h-4 w-4" />
            {t("Edit Image")}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 items-start gap-6 overflow-hidden">
        <div className="relative flex h-[calc(80vh-200px)] w-full items-start justify-center">
          <img
            src={asset.url}
            alt={asset.name}
            className="h-full max-h-max w-full max-w-max rounded-lg object-contain"
          />
        </div>

        <div className="space-y-6">
          <div className="grid gap-3 rounded-md border bg-gray-100 pt-2">
            <Label className="w-full text-center">{t("Details")}</Label>
            <div className="grid grid-cols-1 gap-2 rounded-md border bg-white p-2 text-sm">
              {[
                { label: t("File Name"), value: asset.name },
                { label: t("Type"), value: asset.type, capitalize: true },
                {
                  label: t("Format"),
                  value: asset.metadata?.format || asset.type,
                  capitalize: true,
                },
                {
                  label: t("Size"),
                  value: formatFileSize(asset.size),
                },
                {
                  label: t("Dimensions"),
                  value: `${asset.width || 0} × ${asset.height || 0}`,
                },
                {
                  label: t("Created"),
                  value: formatDate(asset.createdAt),
                },
                {
                  label: t("Updated"),
                  value: formatDate(asset.metadata?.updatedAt || asset?.updatedAt || asset.createdAt),
                },
                {
                  label: t("URL"),
                  value: asset.url,
                  copyable: true,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <Label className="w-1/4 w-max px-2 text-left font-normal text-gray-700">{item.label}</Label>:
                  <div className="flex items-center gap-2">
                    <div
                      className={"w-max text-left font-medium text-gray-900" + (item.capitalize ? " capitalize" : "")}>
                      {item.value}
                    </div>
                    {item.copyable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(item.value, item.label)}>
                        <Link className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {asset.usedOn && asset.usedOn.length > 0 && (
            <div className="grid gap-3">
              <Label>{t("Used On")}</Label>
              <div className="grid grid-cols-1 gap-2 rounded-md border p-2 text-sm">
                {asset.usedOn.map((page, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-max text-left font-medium text-gray-900">{page.name}</div>
                    <div className="text-gray-500">({page.slug})</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative grid gap-3 rounded-md border bg-gray-100 pt-2">
            <Label className="w-full text-center">{t("Description")}</Label>
            <Textarea
              id="description"
              value={description}
              placeholder={t("Enter a description for the asset")}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isSaving}
              className="bg-white hover:border-black/40"
            />
            <div className="absolute right-2 top-1.5 flex items-start justify-end">
              <button
                type="button"
                onClick={() => onSave(description)}
                disabled={isSaving || !isNotSameDescription(description, asset)}
                className={`rounded-md bg-blue-500 px-3 py-0 py-0.5 text-sm text-white ${
                  isSaving || !isNotSameDescription(description, asset) ? "cursor-not-allowed opacity-50" : ""
                }`}>
                {isSaving ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    {t("Saving...")}
                  </>
                ) : (
                  t("Save")
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
