import { and, eq } from "drizzle-orm";
import { isEmpty, omit } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/actions/db";
import { ChaiBlock } from "~/types/common";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for CreatePageAction
 */
type CreatePageActionData = {
  name: string;
  slug: string;
  lang?: string;
  primaryPage?: string | null;
  pageType: string;
  parent?: string | null;
  dynamic?: boolean;
  hasSlug?: boolean;
  template?: string;
  dynamicSlugCustom?: string;
  seo?: Record<string, any>;
  jsonLD?: Record<string, any>;
};

type CreatePageActionResponse = {
  page: {
    id: string;
    name: string;
    slug: string;
    lang: string;
    pageType: string;
    parent: string | null;
    online: boolean | null;
  };
};

/**
 * Action to create a new page
 */
export class CreatePageAction extends ChaiBaseAction<CreatePageActionData, CreatePageActionResponse> {
  /**
   * Define the validation schema for create page action
   */
  protected getValidationSchema() {
    return z
      .object({
        name: z.string().min(1),
        slug: z.string(),
        pageType: z.string(),
        parent: z.string().nullable().optional(),
        lang: z.string().optional(),
        primaryPage: z.string().nullable().optional(),
        dynamic: z.boolean().optional(),
        hasSlug: z.boolean().optional(),
        template: z.string().optional(),
        seo: z.record(z.string(), z.any()).optional(),
        jsonLD: z.record(z.string(), z.any()).optional(),
        dynamicSlugCustom: z.string().optional(),
      })
      .refine(
        (data) => {
          if (data.lang && data.lang !== "") {
            return !!data.primaryPage;
          }
          return true;
        },
        {
          message: "primaryPage is required when lang option is not empty",
          path: ["primaryPage"],
        },
      );
  }

  /**
   * Execute the create page action
   */
  async execute(data: CreatePageActionData): Promise<CreatePageActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;

    // Determine if slug validation is needed
    const hasSlug = data.hasSlug ?? (data.pageType === "global" ? false : true);

    // Validate slug uniqueness if hasSlug is true
    if (hasSlug && data.slug) {
      const slugExists = await this.doesSlugExist(data.slug, data.pageType);
      if (slugExists) {
        throw new ActionError("Slug already exists", "SLUG_ALREADY_USED");
      }
    }

    let blocks: ChaiBlock[] = [];

    // If using a template, get the blocks from the template
    if (data.template) {
      blocks = await this.getTemplateBlocks(data.template, appId);
    }

    let dynamic = data.dynamic ?? false;
    let dynamicSlugCustom = data.dynamicSlugCustom ?? "";

    if (data.primaryPage) {
      const { data: primaryPageData } = await safeQuery(() =>
        db.query.appPages.findFirst({
          where: and(eq(schema.appPages.id, data.primaryPage as string), eq(schema.appPages.app, appId)),
          columns: {
            dynamic: true,
            dynamicSlugCustom: true,
          },
        }),
      );
      if (primaryPageData) {
        dynamic = primaryPageData.dynamic ?? false;
        dynamicSlugCustom = primaryPageData.dynamicSlugCustom ?? "";
      }
    }

    // Prepare the page data
    const pageData = {
      app: appId,
      name: data.name,
      slug: data.slug,
      pageType: data.pageType,
      parent: data.parent ?? null,
      lang: !data.primaryPage ? "" : (data.lang ?? ""),
      primaryPage: data.primaryPage ?? null,
      dynamic: dynamic,
      dynamicSlugCustom: dynamicSlugCustom,
      blocks: blocks,
      seo: data.seo ?? {
        title: data.name,
        jsonLD: "",
        noIndex: false,
        ogImage: "",
        ogTitle: "",
        noFollow: "",
        description: "",
        searchTitle: "",
        cononicalUrl: "",
        ogDescription: "",
        searchDescription: "",
      },
      jsonld: {},
      online: false,
      currentEditor: null,
      changes: null,
      libRefId: null,
      lastSaved: null,
    };

    // Insert the new page using safeQuery
    const { data: result, error } = await safeQuery(() =>
      db.insert(schema.appPages).values(pageData).returning({
        id: schema.appPages.id,
        name: schema.appPages.name,
        slug: schema.appPages.slug,
        lang: schema.appPages.lang,
        pageType: schema.appPages.pageType,
        parent: schema.appPages.parent,
        online: schema.appPages.online,
        primaryPage: schema.appPages.primaryPage,
      }),
    );

    if (error) {
      throw new ActionError("Failed to create page", "ERROR_CREATING_PAGE", 500, error);
    }

    if (!result || result.length === 0) {
      throw new ActionError("Failed to create page", "INSERT_FAILED");
    }

    const newPage = result[0]!;

    // Return the page data, omitting primaryPage if it exists
    return {
      page: omit(newPage.primaryPage ? { ...newPage, id: newPage.primaryPage } : newPage, [
        "primaryPage",
      ]) as CreatePageActionResponse["page"],
    };
  }

  /**
   * Check if slug already exists for the given page type
   */
  private async doesSlugExist(slug: string, pageType: string): Promise<boolean> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;

    const { data: existingPage, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(
          eq(schema.appPages.slug, slug),
          eq(schema.appPages.pageType, pageType),
          eq(schema.appPages.app, appId),
        ),
        columns: {
          id: true,
        },
      }),
    );

    if (error) {
      throw new ActionError(`${error.message}`, "SLUG_CHECK_FAILED");
    }

    return !!existingPage;
  }

  /**
   * Get blocks from a template and handle partial blocks from external libraries
   */
  private async getTemplateBlocks(templateId: string, appId: string): Promise<ChaiBlock[]> {
    // Fetch template with library information using JOIN
    const { data: result, error: templateError } = await safeQuery(() =>
      db
        .select({
          template: schema.libraryTemplates,
          library: {
            id: schema.libraries.id,
            app: schema.libraries.app,
            name: schema.libraries.name,
          },
        })
        .from(schema.libraryTemplates)
        .leftJoin(schema.libraries, eq(schema.libraryTemplates.library, schema.libraries.id))
        .where(eq(schema.libraryTemplates.id, templateId))
        .limit(1)
        .then((rows) => rows[0]),
    );

    if (templateError) {
      throw new ActionError(
        `Failed to fetch template: ${templateError.message || "Unknown database error"}`,
        "ERROR_GETTING_TEMPLATE_BLOCKS",
        500,
        templateError,
      );
    }

    if (!result || !result.template || !result.library) {
      throw new ActionError(`Template not found with ID: ${templateId}`, "TEMPLATE_NOT_FOUND");
    }

    const template = result.template as typeof schema.libraryTemplates.$inferSelect;
    const library = result.library as typeof schema.libraries.$inferSelect;

    // Fetch template blocks
    const { data: templatePage, error: templateBlocksError } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: eq(schema.appPages.id, template.pageId as string),
        columns: {
          blocks: true,
        },
      }),
    );

    if (templateBlocksError) {
      throw new ActionError(
        `Failed to fetch template blocks: ${templateBlocksError.message || "Unknown database error"}`,
        "ERROR_GETTING_TEMPLATE_BLOCKS",
        500,
        templateBlocksError,
      );
    }

    if (!templatePage) {
      throw new ActionError(`Template page not found with ID: ${template.pageId}`, "TEMPLATE_PAGE_NOT_FOUND");
    }

    let blocks: ChaiBlock[] = (templatePage.blocks as ChaiBlock[]) || [];

    // Convert GlobalBlock to PartialBlock
    blocks = blocks.map((block) => {
      if (block._type === "GlobalBlock" && !isEmpty(block.globalBlock)) {
        return {
          ...block,
          _type: "PartialBlock",
          partialBlockId: block.globalBlock,
        };
      }
      return block;
    });

    const isSiteLibrary = library.app === appId;

    // If template is from an external library, copy partial blocks
    if (!isSiteLibrary) {
      const libraryName = library.name || "";

      // Find all partial blocks
      const partialBlocks = blocks.filter((block) => block._type === "PartialBlock" && !isEmpty(block.partialBlockId));

      // Copy each partial block from the external library
      const newPages = await Promise.all(
        partialBlocks.map(({ partialBlockId }) =>
          this.copyPartialBlockFromTemplate(partialBlockId!, libraryName, appId),
        ),
      );

      // Update the partial blocks with the new page IDs
      blocks = blocks.map((block) => {
        const newPage = newPages.find((page) => page?.libRefId === block.partialBlockId);
        if (newPage) {
          block._name = `${libraryName} - ${block._name}`;
          block.partialBlockId = newPage.id;
        }
        return block;
      });
    }

    return blocks;
  }

  /**
   * Copy a partial block from a template library
   */
  private async copyPartialBlockFromTemplate(
    partialBlockId: string,
    libraryName: string,
    appId: string,
  ): Promise<{ id: string; libRefId: string } | null> {
    // Fetch the original partial block page
    const { data: originalPage, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: eq(schema.appPages.id, partialBlockId),
      }),
    );

    if (error || !originalPage) {
      console.error("Failed to fetch partial block:", error);
      return null;
    }

    // Create a new page with the partial block content
    const newPageData = {
      ...originalPage,
      id: undefined, // Let database generate new ID
      app: appId,
      libRefId: partialBlockId,
      name: `${libraryName} - ${originalPage.name}`,
      createdAt: undefined,
      online: false,
      currentEditor: null,
      changes: null,
      lastSaved: null,
    };

    const { data: newPage, error: insertError } = await safeQuery(() =>
      db.insert(schema.appPages).values(newPageData).returning({
        id: schema.appPages.id,
        libRefId: schema.appPages.libRefId,
      }),
    );

    if (insertError || !newPage || newPage.length === 0) {
      console.error("Failed to create partial block copy:", insertError);
      return null;
    }

    const createdPage = newPage[0]!;

    return {
      id: createdPage.id,
      libRefId: createdPage.libRefId || partialBlockId,
    };
  }
}
