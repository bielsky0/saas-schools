import { isFunction } from "lodash-es";
import { z } from "zod";
import { getChaiPageTypes } from "~/runtime/register-page-type";
import { ChaiBaseAction } from "./base-action";

type GetPageTypesActionData = Record<string, never>;

type GetPageTypesActionResponse = Array<{
  key: string;
  name: string;
  helpText: string;
  icon: string;
  dynamicSegments?: string;
  dynamicSlug?: string;
  hasSlug: boolean;
  trackingDefault?: any;
  defaultSeo?: any;
  defaultJSONLD?: any;
}>;

/**
 * Get Page Types Action
 * Returns all registered page types with their configuration
 */
export class GetPageTypesAction extends ChaiBaseAction<GetPageTypesActionData, GetPageTypesActionResponse> {
  protected getValidationSchema() {
    return z.object({});
  }

  async execute(): Promise<GetPageTypesActionResponse> {
    try {
      const pageTypes = await Promise.all(
        getChaiPageTypes().map(async (pageType) => ({
          key: pageType.key,
          helpText: pageType.helpText ?? "",
          icon: pageType.icon ?? "",
          dynamicSegments: pageType.dynamicSegments ?? "",
          dynamicSlug: pageType.dynamicSlug ?? "",
          hasSlug: pageType.hasSlug ?? true,
          name: typeof pageType.name === "function" ? await pageType.name() : pageType.name,
          ...(isFunction(pageType.defaultSeo) ? { defaultSeo: pageType.defaultSeo() } : {}),
          ...(isFunction(pageType.defaultJSONLD) ? { defaultJSONLD: pageType.defaultJSONLD() } : {}),
        })),
      );

      return pageTypes;
    } catch (error) {
      return this.handleError(error);
    }
  }
}
