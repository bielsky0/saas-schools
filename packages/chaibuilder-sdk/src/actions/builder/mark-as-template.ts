import { db, safeQuery, schema } from "~/actions/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "./action-error";
import { getChaiAction } from "./actions-registery";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for MarkAsTemplateAction
 */
type MarkAsTemplateActionData = {
  id: string;
  description?: string;
  name: string;
  pageType: string;
  previewImage?: string; // Base64 image to upload
  previewImageUrl?: string; // Pre-uploaded image URL (if already handled externally)
};

type MarkAsTemplateActionResponse = {
  id: string;
  library: string | null;
  pageType: string | null;
  pageId: string | null;
  description: string | null;
  preview: string | null;
};

/**
 * Action to mark a page as a template
 */
export class MarkAsTemplateAction extends ChaiBaseAction<MarkAsTemplateActionData, MarkAsTemplateActionResponse> {
  /**
   * Define the validation schema for mark as template action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
      description: z.string().optional(),
      name: z.string().min(1),
      pageType: z.string().min(1),
      previewImage: z.string().optional(),
      previewImageUrl: z.string().optional(),
    });
  }

  /**
   * Execute the mark as template action
   */
  async execute(data: MarkAsTemplateActionData): Promise<MarkAsTemplateActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId, userId } = this.context;
    const { id: pageId, description, name, pageType, previewImage, previewImageUrl } = data;

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

      const fileName = `template-${Date.now()}.webp`;
      const folderPath = `${appId}/templates`;

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

    // Insert the template
    const { data: template, error } = await safeQuery(() =>
      db
        .insert(schema.libraryTemplates)
        .values({
          library: siteLibrary.id,
          user: userId ?? null,
          pageId: pageId,
          description: description ?? null,
          name: name + " Template",
          pageType: pageType,
          preview: finalPreviewImageUrl ?? null,
        })
        .returning({
          id: schema.libraryTemplates.id,
          library: schema.libraryTemplates.library,
          pageType: schema.libraryTemplates.pageType,
          pageId: schema.libraryTemplates.pageId,
          description: schema.libraryTemplates.description,
          preview: schema.libraryTemplates.preview,
        }),
    );

    if (error || !template || template.length === 0) {
      throw new ActionError("Failed to mark page as template", "UPDATE_FAILED", 500, error);
    }

    return template[0]!;
  }
}
