import { SupabaseClient } from "@supabase/supabase-js";
import { isEmpty, kebabCase, set } from "lodash-es";
import { getChaiAction } from "~/actions/builder/actions-registery";

type ChaiAsset = any;

export class ChaiAssets {
  // Minimum buffer length checks per image format for dimension extraction
  private static readonly MIN_PNG_LENGTH = 24; // PNG signature (8) + IHDR chunk header (8) + width (4) + height (4)
  private static readonly MIN_GIF_LENGTH = 10; // GIF signature (6) + width (2) + height (2)
  private static readonly MIN_WEBP_VP8L_LENGTH = 25; // Reads 4 bytes at offset 21: RIFF (12) + VP8L header (4) + flag (1) + 4 bytes read = 21 + 4
  private static readonly MIN_WEBP_VP8X_LENGTH = 30; // Reads 6 bytes at offset 24: RIFF (12) + VP8X header (4) + flags (4) + width/height (3+3) = 24 + 6
  private static readonly MIN_WEBP_VP8_LENGTH = 30; // Reads 4 bytes at offset 26: RIFF (12) + VP8 header (4) + frame tag (3) + start (3) + 4 bytes read = 26 + 4
  private static readonly MIN_JPEG_SOF_BYTES_FROM_MARKER = 9; // SOF marker (2) + segment length (2) + precision (1) + height (2) + width (2) = 9 bytes from marker

  constructor(
    private appId: string,
    private userId: string,
    private supabase: SupabaseClient,
  ) {}

  private appendUpdatedAtToUrl(url: string, updatedAt: string): string {
    if (isEmpty(url)) {
      return "";
    }
    const urlObj = new URL(url);
    const timestamp = new Date(updatedAt).getTime();
    urlObj.searchParams.set("t", timestamp.toString());
    return `${urlObj.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  }

  private getBufferFromBase64(base64String: string): Buffer {
    try {
      const base64Data = base64String.split(",")[1] || base64String;
      return Buffer.from(base64Data, "base64");
    } catch {
      throw new Error("Invalid base64 string format");
    }
  }

  private getMimeType(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      tiff: "image/tiff",
      svg: "image/svg+xml",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Extract image dimensions from buffer by reading binary headers.
   * Supports PNG, JPEG, GIF, and WebP without external dependencies.
   */
  private getImageDimensions(buffer: Buffer): { width: number; height: number } {
    // PNG: bytes 0-7 are signature, IHDR chunk starts at byte 8, width at 16, height at 20
    if (
      buffer.length >= ChaiAssets.MIN_PNG_LENGTH &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }

    // GIF: "GIF" signature, width at byte 6 (LE 16-bit), height at byte 8
    if (buffer.length >= ChaiAssets.MIN_GIF_LENGTH && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      };
    }

    // WebP: "RIFF" + size + "WEBP", then VP8 chunk
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      // VP8L (lossless)
      if (
        buffer.length >= ChaiAssets.MIN_WEBP_VP8L_LENGTH &&
        buffer[12] === 0x56 &&
        buffer[13] === 0x50 &&
        buffer[14] === 0x38 &&
        buffer[15] === 0x4c
      ) {
        const bits = buffer.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      // VP8X (extended)
      if (
        buffer.length >= ChaiAssets.MIN_WEBP_VP8X_LENGTH &&
        buffer[12] === 0x56 &&
        buffer[13] === 0x50 &&
        buffer[14] === 0x38 &&
        buffer[15] === 0x58
      ) {
        return {
          width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
          height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
        };
      }
      // VP8 (lossy): chunk header at 12, frame header at 20
      if (
        buffer.length >= ChaiAssets.MIN_WEBP_VP8_LENGTH &&
        buffer[12] === 0x56 &&
        buffer[13] === 0x50 &&
        buffer[14] === 0x38 &&
        buffer[15] === 0x20
      ) {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
        };
      }
    }

    // JPEG: SOI marker 0xFFD8, scan for SOFn frames
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          // Ensure we have enough bytes to read width at offset+7 and height at offset+5
          // Need offset + MIN_JPEG_SOF_BYTES_FROM_MARKER bytes total
          if (offset + ChaiAssets.MIN_JPEG_SOF_BYTES_FROM_MARKER <= buffer.length) {
            return {
              width: buffer.readUInt16BE(offset + 7),
              height: buffer.readUInt16BE(offset + 5),
            };
          }
          // If buffer is truncated at SOF marker, return early
          break;
        }
        // Skip to next marker - check if we have enough bytes for segment length
        if (offset + 4 > buffer.length) {
          break;
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }

    return { width: 0, height: 0 };
  }

  /**
   * Upload an image file using UPLOAD_TO_STORAGE action
   * Uploads the image as-is without server-side processing for cross-platform compatibility
   */
  private async uploadImageFile(
    file: string,
    folderId: string | null | undefined,
    name: string,
    _optimize: boolean,
  ): Promise<
    | { url: string; thumbnailUrl: string; size: number; width: number; height: number; mimeType: string }
    | { error: string }
  > {
    try {
      const buffer = this.getBufferFromBase64(file);
      const mimeType = this.getMimeType(name);

      // Validate file is an image
      const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff"];
      if (!validMimeTypes.includes(mimeType)) {
        throw new Error(`Invalid image format: ${mimeType}`);
      }

      // Prepare file names and paths
      const parts = name.split(".");
      const originalFileName = parts.length > 1 ? parts.slice(0, -1).join(".") : name;
      const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "png";
      const fileName = `${kebabCase(originalFileName)}.${ext}`;

      const baseFolder = this.appId;
      const folderPath = folderId ? `${baseFolder}/${folderId}` : baseFolder;

      // Upload main image using UPLOAD_TO_STORAGE action
      const uploadAction = getChaiAction("UPLOAD_TO_STORAGE");
      if (!uploadAction) {
        throw new Error("UPLOAD_TO_STORAGE action not found");
      }

      uploadAction.setContext({ appId: this.appId, userId: this.userId });

      const mainImageResult = await uploadAction.execute({
        file: buffer.toString("base64"),
        fileName,
        contentType: mimeType,
        folder: folderPath,
      });

      if (mainImageResult.error) {
        throw new Error(mainImageResult.error);
      }

      const { width, height } = this.getImageDimensions(buffer);

      return {
        url: mainImageResult.data.url,
        thumbnailUrl: mainImageResult.data.url,
        size: buffer.length,
        width,
        height,
        mimeType,
      };
    } catch (error) {
      console.error("Upload image error:", error);
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Upload an SVG file using UPLOAD_TO_STORAGE action
   */
  private async uploadSvgFile(
    file: string,
    folderId: string | null | undefined,
    name: string,
  ): Promise<
    | { url: string; thumbnailUrl: string; size: number; width?: number; height?: number; mimeType: string }
    | { error: string }
  > {
    try {
      const buffer = this.getBufferFromBase64(file);

      // Get SVG dimensions if possible using regex
      let width: number | undefined;
      let height: number | undefined;
      try {
        const svgString = buffer.toString("utf-8");
        const widthMatch = svgString.match(/\bwidth=["'](\d+)/);
        const heightMatch = svgString.match(/\bheight=["'](\d+)/);
        if (widthMatch) width = parseInt(widthMatch[1], 10);
        if (heightMatch) height = parseInt(heightMatch[1], 10);
      } catch {
        // If we can't parse SVG dimensions, continue without them
      }

      // Prepare file name and path
      const parts = name.split(".");
      const originalFileName = parts.length > 1 ? parts.slice(0, -1).join(".") : name;
      const fileName = `${kebabCase(originalFileName)}.svg`;

      const baseFolder = this.appId;
      const folderPath = folderId ? `${baseFolder}/${folderId}` : baseFolder;

      // Upload SVG using UPLOAD_TO_STORAGE action
      const uploadAction = getChaiAction("UPLOAD_TO_STORAGE");
      if (!uploadAction) {
        throw new Error("UPLOAD_TO_STORAGE action not found");
      }

      uploadAction.setContext({ appId: this.appId, userId: this.userId });

      const result = await uploadAction.execute({
        file: buffer.toString("base64"),
        fileName,
        contentType: "image/svg+xml",
        folder: folderPath,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // For SVG, use the same URL as thumbnail since it's vector
      return {
        url: result.data.url,
        thumbnailUrl: result.data.url,
        size: buffer.length,
        width,
        height,
        mimeType: "image/svg+xml",
      };
    } catch (error) {
      console.error("SVG upload error:", error);
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async upload({
    file,
    folderId,
    name,
    optimize = true,
  }: {
    name: string;
    file: string;
    folderId?: string | null;
    optimize?: boolean;
  }): Promise<any | { error: string }> {
    try {
      // Check if the file is an SVG
      const isSvg = name.toLowerCase().endsWith(".svg") || file.includes("data:image/svg+xml");

      // Process and upload the file using UPLOAD_TO_STORAGE action
      const uploadedAsset = isSvg
        ? await this.uploadSvgFile(file, folderId, name)
        : await this.uploadImageFile(file, folderId, name, optimize ?? true);

      if ("error" in uploadedAsset) {
        return uploadedAsset;
      }

      // Prepare the asset data for Supabase
      const assetData = {
        name,
        app: this.appId,
        url: uploadedAsset.url,
        thumbnailUrl: uploadedAsset.thumbnailUrl,
        size: uploadedAsset.size?.toString(),
        width: uploadedAsset.width,
        height: uploadedAsset.height,
        format: uploadedAsset.mimeType.split("/")[1],
        folderId: folderId,
        type: uploadedAsset.mimeType.startsWith("image/") ? "image" : "file",
        createdBy: this.userId,
        updatedAt: new Date().toISOString(),
      };

      // Insert into app_assets table
      const { data, error } = await this.supabase.from("app_assets").insert(assetData).select("*").single();

      if (error) {
        throw new Error(`Failed to store asset in database: ${error.message}`);
      }

      // Return the ChaiAsset format
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        url: this.appendUpdatedAtToUrl(data.url, data.updatedAt),
        size: data.size,
        thumbnailUrl: this.appendUpdatedAtToUrl(data.thumbnailUrl || "", data.updatedAt),
        width: data.width,
        height: data.height,
        format: data.format,
        folderId: data.folderId,
        createdBy: data.createdBy || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }

  async getAsset({ id }: { id: string }): Promise<ChaiAsset | { error: string }> {
    try {
      const { data, error } = await this.supabase
        .from("app_assets")
        .select("*")
        .eq("id", id)
        .eq("app", this.appId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch asset: ${error.message}`);
      }
      set(data, "url", this.appendUpdatedAtToUrl(data.url, data.updatedAt));
      set(data, "thumbnailUrl", this.appendUpdatedAtToUrl(data.thumbnailUrl || "", data.updatedAt));
      return data as ChaiAsset;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }

  async getAssets({
    search = "",
    page = 1,
    limit = 20,
  }: {
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<
    | {
        assets: Partial<ChaiAsset>[];
        total: number;
        page: number;
        pageSize: number;
      }
    | {
        error: string;
      }
  > {
    try {
      const offset = (page - 1) * limit;
      // Build the query
      let assetsQuery = this.supabase
        .from("app_assets")
        .select("*", { count: "exact" })
        .eq("app", this.appId)
        .order("updatedAt", { ascending: false });

      if (search) {
        assetsQuery = assetsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      // Apply pagination
      const { data: assetsData, error, count } = await assetsQuery.range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }
      const assets = assetsData.map((asset) => {
        set(asset, "url", this.appendUpdatedAtToUrl(asset.url, asset.updatedAt));
        set(asset, "thsupabaseumbnailUrl", this.appendUpdatedAtToUrl(asset.thumbnailUrl || "", asset.updatedAt));
        return asset;
      });
      return {
        assets,
        total: count || 0,
        page,
        pageSize: limit,
      };
    } catch (error) {
      console.error("Error fetching assets:", error);
      throw error;
    }
  }

  async deleteAsset({ id }: { id: string }): Promise<{ success: boolean } | { error: string }> {
    try {
      // First, get the asset to retrieve storage keys
      const { data: asset, error: fetchError } = await this.supabase
        .from("app_assets")
        .select("*")
        .eq("id", id)
        .eq("app", this.appId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch asset: ${fetchError.message}`);
      }

      // Extract storage keys from URLs
      if (asset.url) {
        try {
          const urlObj = new URL(asset.url);
          const pathParts = urlObj.pathname.split("/");
          // Get the key from the URL path (everything after /object/public/bucket-name/)
          const bucketIndex = pathParts.indexOf("dam-assets");
          if (bucketIndex !== -1) {
            const key = pathParts.slice(bucketIndex + 1).join("/");

            // Delete main file from storage using DELETE_FROM_STORAGE action
            const deleteAction = getChaiAction("DELETE_FROM_STORAGE");
            if (deleteAction) {
              deleteAction.setContext({ appId: this.appId, userId: this.userId });
              await deleteAction.execute({ key });
            }

            // Delete thumbnail if it exists
            if (asset.thumbnailUrl && asset.thumbnailUrl !== asset.url) {
              const thumbnailUrlObj = new URL(asset.thumbnailUrl);
              const thumbnailPathParts = thumbnailUrlObj.pathname.split("/");
              const thumbnailBucketIndex = thumbnailPathParts.indexOf("dam-assets");
              if (thumbnailBucketIndex !== -1) {
                const thumbnailKey = thumbnailPathParts.slice(thumbnailBucketIndex + 1).join("/");
                if (deleteAction) {
                  await deleteAction.execute({ key: thumbnailKey });
                }
              }
            }
          }
        } catch (urlError) {
          console.warn("Failed to delete from storage, continuing with database deletion:", urlError);
        }
      }

      // Delete from the database
      const { error } = await this.supabase.from("app_assets").delete().eq("id", id);

      if (error) {
        throw new Error(`Failed to delete asset: ${error.message}`);
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }

  async updateAsset({
    id,
    file,
    description,
  }: {
    id: string;
    file?: string;
    description?: string;
  }): Promise<ChaiAsset | { error: string }> {
    try {
      // Get current asset
      const { data: currentAsset, error: fetchError } = await this.supabase
        .from("app_assets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch asset: ${fetchError.message}`);
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {};

      if (description !== undefined) {
        updateData.description = description;
        updateData.updatedAt = new Date().toISOString();
      }

      // Handle file update if provided
      if (file) {
        // Check if the file is an SVG to skip optimization
        const isSvg = currentAsset.format?.toLowerCase() === "svg" || file.includes("data:image/svg+xml");

        // Re-upload the file using appropriate method
        const uploadedAsset = isSvg
          ? await this.uploadSvgFile(file, currentAsset.folderId, currentAsset.name)
          : await this.uploadImageFile(file, currentAsset.folderId, currentAsset.name, true);

        if ("error" in uploadedAsset) {
          return uploadedAsset;
        }

        // Update asset information
        updateData.url = uploadedAsset.url;
        updateData.thumbnailUrl = uploadedAsset.thumbnailUrl;
        updateData.size = uploadedAsset.size?.toString();
        updateData.width = uploadedAsset.width;
        updateData.height = uploadedAsset.height;
        updateData.format = uploadedAsset.mimeType.split("/")[1];
        updateData.updatedAt = new Date().toISOString();
      }

      // Update the asset
      const { data: updatedAsset, error } = await this.supabase
        .from("app_assets")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update asset: ${error.message}`);
      }

      set(updatedAsset, "url", this.appendUpdatedAtToUrl(updatedAsset.url, updatedAsset.updatedAt));
      set(
        updatedAsset,
        "thumbnailUrl",
        this.appendUpdatedAtToUrl(updatedAsset.thumbnailUrl || "", updatedAsset.updatedAt),
      );
      return updatedAsset as ChaiAsset;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }
}
