import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ChaiBaseAction } from "~/actions/builder/base-action";

const UploadToStorageSchema = z.object({
  file: z.string(), // Base64 string
  fileName: z.string(),
  contentType: z.string().optional(),
  folder: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

type UploadToStorageInput = z.infer<typeof UploadToStorageSchema>;

/**
 * UPLOAD_TO_STORAGE Action
 * Generic storage upload action using Supabase Storage
 */
export class UploadToStorageAction extends ChaiBaseAction<UploadToStorageInput> {
  private bucketName = "dam-assets";

  constructor(private supabase: SupabaseClient) {
    super();
  }

  protected getValidationSchema() {
    return UploadToStorageSchema;
  }

  async execute(data: UploadToStorageInput) {
    try {
      if (!this.context) {
        return { error: "Context not set", status: 400 };
      }

      const { appId } = this.context;
      const { file, fileName, contentType, folder, metadata } = data;

      // Convert base64 to buffer
      let buffer: Buffer;
      if (typeof file === "string") {
        const base64Data = file.split(",")[1] || file;
        buffer = Buffer.from(base64Data, "base64");
      } else {
        buffer = file as any;
      }

      // Construct file path with appId as base folder (same as previous implementation)
      // If folder is provided, it's already prefixed with appId from ChaiAssets
      const filePath = folder ? `${folder}/${fileName}` : `${appId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          contentType: contentType || "application/octet-stream",
          upsert: true,
          ...(metadata && { metadata }),
        });

      if (uploadError) {
        return {
          error: `Failed to upload to Supabase Storage: ${uploadError.message}`,
          status: 500,
        };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);

      return {
        data: {
          url: publicUrl,
          key: uploadData.path,
          size: buffer.length,
          metadata,
        },
        status: 200,
      };
    } catch (error) {
      console.error("UPLOAD_TO_STORAGE error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      };
    }
  }
}
