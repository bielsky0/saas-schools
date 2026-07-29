import { ChaiPageType } from "~/types/actions";

export const PAGE_TYPES: Record<string, ChaiPageType> = {};

export const getChaiPageTypes = () => Object.values(PAGE_TYPES);

export const getChaiPageType = (key: keyof typeof PAGE_TYPES) => PAGE_TYPES[key];

export const registerChaiPageType = (key: string, pageTypeOptions: Omit<ChaiPageType, "key" | "hasSlug">) => {
  PAGE_TYPES[key] = { key, ...pageTypeOptions, hasSlug: true };
};
