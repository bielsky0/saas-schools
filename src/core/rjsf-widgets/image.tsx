import { Cross1Icon, Pencil2Icon } from "@radix-ui/react-icons";
import { WidgetProps } from "@rjsf/utils";
import { first, get, has, isArray, isEmpty, set, startsWith } from "lodash-es";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageExternalData } from "~/atoms/builder";
import MediaManagerModal from "~/core/components/sidepanels/panels/images/media-manager-modal";
import { removeSizeClasses } from "~/core/utils/remove-size-classes";
import { useLanguages } from "~/hooks/use-languages";
import { useSelectedBlock } from "~/hooks/use-selected-blockIds";
import { applyBindingToBlockProps } from "~/render/apply-binding";
import { getBlockDefaultProps } from "~/runtime";
import { ChaiAsset } from "~/types";
import { useUpdateBlocksProps } from "../../hooks/use-update-blocks-props";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2Q1ZDdkYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==";

const getFileName = (value: string) => {
  // Return empty for data URLs or empty values
  if (!value || startsWith(value, "data")) return "";

  // Extract filename from URL (remove query params)
  const name = value.split("/").pop()?.split("?")[0] || "";

  // Valid image extensions
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"];

  // Check if filename has a valid image extension
  const hasValidExtension = imageExtensions.some((ext) => name.toLowerCase().endsWith(ext));

  return hasValidExtension ? name : "";
};

const ImagePickerField = ({ value, onChange, id, onBlur, uiSchema }: WidgetProps) => {
  const { t } = useTranslation();
  const { selectedLang } = useLanguages();
  const selectedBlock = useSelectedBlock();
  const updateBlockProps = useUpdateBlocksProps();
  const pageExternalData = usePageExternalData();
  const showImagePicker = true;

  // Check if this field allows empty values (for background images)
  const allowEmpty = uiSchema?.["ui:allowEmpty"] === true;

  const propKey = id.split(".").pop() || "";
  const propIdKey = selectedLang ? `_${propKey}Id-${selectedLang}` : `_${propKey}Id`;

  const hasImageBlockAssetId =
    isEmpty(selectedLang) && selectedBlock?._type === "Image" && has(selectedBlock, "assetId");

  const assetId = get(selectedBlock, propIdKey, hasImageBlockAssetId ? selectedBlock?.assetId : "");

  const resolvedValue = useMemo(() => {
    if (!value || !selectedBlock) return value;

    // Check if value contains data binding syntax
    const hasBinding = /\{\{.*?\}\}/.test(value);
    if (!hasBinding) return value;

    // Apply binding resolution
    const tempBlock = { ...selectedBlock, [propKey]: value };
    const resolved = applyBindingToBlockProps(tempBlock, pageExternalData, { index: -1, key: "" });
    return get(resolved, propKey, value);
  }, [value, selectedBlock, pageExternalData, propKey]);

  const showRemoveIcons = !!assetId || (resolvedValue !== PLACEHOLDER_IMAGE && resolvedValue !== "");

  const handleSelect = (assets: ChaiAsset[] | ChaiAsset) => {
    const asset = isArray(assets) ? first(assets) : assets;
    if (asset) {
      onChange(asset?.url);
      const width = asset?.width;
      const height = asset?.height;
      const forMobile = propIdKey.includes("mobile");
      if (selectedBlock?._id) {
        const props: Record<string, any> = {
          ...(width && { [forMobile ? "mobileWidth" : "width"]: width }),
          ...(height && { [forMobile ? "mobileHeight" : "height"]: height }),
          ...(asset.description && { alt: asset.description }),
        };
        // handling asset id based on prop
        set(props, propIdKey, asset.id);

        // Remove w-full and h-full from styles only when they are still at default (initial load)
        // If the user has customized styles, preserve them as-is
        if ((width || height) && selectedBlock?._type && selectedBlock?.styles) {
          const defaultProps = getBlockDefaultProps(selectedBlock._type);
          const defaultStyles = get(defaultProps, "styles", "");
          if (selectedBlock.styles === defaultStyles) {
            props.styles = removeSizeClasses(selectedBlock.styles as string, width, height);
          }
        }

        // Only update if props are not empty
        if (isEmpty(props)) return;
        updateBlockProps([selectedBlock._id], props);
      }
    }
  };

  const clearImage = useCallback(() => {
    // For background images or fields that allow empty, use empty string
    // For regular images (like Image block), use placeholder
    const clearedValue = allowEmpty ? "" : PLACEHOLDER_IMAGE;
    onChange(clearedValue);
    if (selectedBlock?._id) {
      const props = {};
      const forMobile = propIdKey.includes("mobile");
      set(props, propIdKey, "");
      set(props, forMobile ? "mobileWidth" : "width", "");
      set(props, forMobile ? "mobileHeight" : "height", "");
      updateBlockProps([selectedBlock._id], props);
    }
  }, [selectedBlock, onChange, updateBlockProps, propIdKey, allowEmpty]);

  const fileName = getFileName(resolvedValue);
  return (
    <div className="mt-1.5 flex items-start gap-x-3">
      {resolvedValue ? (
        <div className="group relative">
          <img
            src={resolvedValue}
            className={
              `h-[72px] w-[72px] overflow-hidden rounded-md border border-border object-cover transition duration-200 ` +
              (assetId && assetId !== "" ? "cursor-pointer group-hover:blur-sm" : "")
            }
            alt=""
          />
          {showRemoveIcons && (
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-2 -top-2 z-20 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90">
              <Cross1Icon className="h-3 w-3" />
            </button>
          )}
          {assetId && assetId !== "" && (
            <MediaManagerModal onSelect={handleSelect} assetId={assetId}>
              <button
                type="button"
                className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/10 opacity-0 transition duration-200 group-hover:bg-black/30 group-hover:opacity-100">
                <Pencil2Icon className="h-4 w-4 text-white" />
              </button>
            </MediaManagerModal>
          )}
        </div>
      ) : (
        <MediaManagerModal onSelect={handleSelect} mode="image" assetId={assetId}>
          <div className="h-[72px] w-[72px] cursor-pointer rounded-md border border-border bg-[radial-gradient(#AAA,transparent_1px)] duration-300 [background-size:10px_10px]"></div>
        </MediaManagerModal>
      )}
      <div className="flex w-3/5 flex-col">
        {showImagePicker && (
          <>
            <p className="max-w-[250px] truncate pr-2 text-xs text-gray-400">{fileName}</p>
            <MediaManagerModal onSelect={handleSelect} assetId="">
              <small className="mb-1 h-6 w-full cursor-pointer rounded-md bg-secondary px-1 py-1 text-center text-xs text-secondary-foreground hover:bg-secondary/80">
                {!isEmpty(resolvedValue) && resolvedValue !== PLACEHOLDER_IMAGE
                  ? t("Replace image")
                  : t("Choose image")}
              </small>
            </MediaManagerModal>
            <div className="text-center text-xs text-gray-400">OR</div>
          </>
        )}
        <input
          id={id}
          autoCapitalize={"off"}
          autoCorrect={"off"}
          spellCheck={"false"}
          type="url"
          className="h-6 text-xs"
          placeholder={t("Enter image URL")}
          value={value === PLACEHOLDER_IMAGE ? "" : value}
          onBlur={({ target: { value: url } }) => onBlur(id, url)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export { ImagePickerField };
