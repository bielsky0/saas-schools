import { ChaiPageType } from "~/types/actions";
import { PAGE_TYPES } from "./register-page-type";

export const registerChaiPartialType = (key: string, pageTypeOptions: Omit<ChaiPageType, "key">) => {
  PAGE_TYPES[key] = { key, ...pageTypeOptions, hasSlug: false };
};
