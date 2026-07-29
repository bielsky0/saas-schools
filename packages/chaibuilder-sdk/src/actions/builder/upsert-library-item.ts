import { eq } from "drizzle-orm";
import { set } from "lodash-es";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { ChaiBlock } from "~/types/common";
import { ActionError } from "./action-error";
import { getChaiAction } from "./actions-registery";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for UpsertLibraryItemAction
 */
type UpsertLibraryItemActionData = {
  name: string;
  group: string;
  blocks: ChaiBlock[];
  description?: string;
  previewImage?: string;
  id?: string;
  previewImageUrl?: string; // Pre-uploaded image URL (if already handled externally)
};

type UpsertLibraryItemActionResponse = {
  id: string;
  name: string | null;
  blocks: unknown;
  library: string | null;
  description: string | null;
  group: string | null;
  user: string | null;
  preview: string | null;
  type?: string | null;
  createdAt: string;
  html: string | null;
};

/**
 * Action to upsert (create or update) a library item
 */
export class UpsertLibraryItemAction extends ChaiBaseAction<
  UpsertLibraryItemActionData,
  UpsertLibraryItemActionResponse
> {
  /**
   * Define the validation schema for upsert library item action
   */
  protected getValidationSchema() {
    return z.object({
      name: z.string().min(1),
      group: z.string().min(1),
      blocks: z.array(z.any()),
      description: z.string().optional(),
      previewImage: z.string().optional(),
      id: z.string().optional(),
      previewImageUrl: z.string().optional(),
    });
  }

  /**
   * Execute the upsert library item action
   */
  async execute(data: UpsertLibraryItemActionData): Promise<UpsertLibraryItemActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId, userId } = this.context;
    const { name, group, blocks, description, previewImage, previewImageUrl, id } = data;

    // Get the site library for this app
    const { data: siteLibrary, error: libraryError } = await safeQuery(() =>
      db.query.libraries.findFirst({
        where: eq(schema.libraries.app, appId),
        columns: {
          id: true,
        },
      }),
    );

    if (libraryError) {
      throw new ActionError("Failed to fetch site library", "GET_SITE_LIBRARY_FAILED", 500, libraryError);
    }

    if (!siteLibrary) {
      throw new ActionError("Library not found for this app", "GET_SITE_LIBRARY_FAILED");
    }

    // Handle preview image upload if provided
    let finalPreviewImageUrl = previewImageUrl;
    if (previewImage) {
      const uploadAction = getChaiAction("UPLOAD_TO_STORAGE");
      uploadAction?.setContext(this.context);

      const fileName = `library-item-${Date.now()}.webp`;
      const folderPath = `${appId}/library-items`;

      const uploadResult = await uploadAction?.execute({
        file: previewImage,
        fileName,
        contentType: "image/webp",
        folder: folderPath,
      });

      if (uploadResult?.error) {
        throw new ActionError("Failed to upload preview image", "UPLOAD_PREVIEW_FAILED", 500, uploadResult.error);
      }

      finalPreviewImageUrl = uploadResult?.data?.url || previewImageUrl;
    }

    // If id is provided, update existing library item
    if (id) {
      const updateData: any = {
        name,
        blocks,
        library: siteLibrary.id,
        description: description ?? null,
        group,
        user: userId ?? null,
      };

      // Only include preview if finalPreviewImageUrl is provided
      if (finalPreviewImageUrl) {
        updateData.preview = finalPreviewImageUrl;
      }

      const { data: updatedItem, error: updateError } = await safeQuery(() =>
        db.update(schema.libraryItems).set(updateData).where(eq(schema.libraryItems.id, id)).returning(),
      );

      if (updateError || !updatedItem || updatedItem.length === 0) {
        throw new ActionError("Failed to update library item", "UPDATE_LIBRARY_ITEM_FAILED", 500, updateError);
      }

      return updatedItem[0]!;
    } else {
      // Create new library item
      const uuid = randomUUID();

      // Set _libBlockId on the first block
      const blocksWithId = [...blocks];
      set(blocksWithId, "0._libBlockId", uuid);

      const insertData: any = {
        id: uuid,
        name,
        blocks: blocksWithId,
        library: siteLibrary.id,
        description: description ?? null,
        group,
        user: userId ?? null,
        preview: finalPreviewImageUrl ?? null,
      };

      const { data: newItem, error: insertError } = await safeQuery(() =>
        db.insert(schema.libraryItems).values(insertData).returning(),
      );

      if (insertError || !newItem || newItem.length === 0) {
        throw new ActionError("Failed to create library item", "CREATE_LIBRARY_ITEM_FAILED", 500, insertError);
      }

      return newItem[0]!;
    }
  }
}
