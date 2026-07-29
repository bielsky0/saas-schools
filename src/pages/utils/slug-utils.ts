/**
 * Utility functions for handling page slugs
 */

import { LANGUAGES } from "~/core/constants/LANGUAGES";

/**
 * Extracts the file extension from a slug if present
 * @param slug The slug to extract extension from
 * @returns Object containing the base slug and extension
 */
export const extractSlugExtension = (slug: string): { base: string; extension: string | null } => {
  if (!slug) return { base: slug, extension: null };

  // Find the last dot in the slug
  const lastDotIndex = slug.lastIndexOf(".");

  // If there's no dot or it's the first character, return the original slug
  if (lastDotIndex <= 0) return { base: slug, extension: null };

  // Extract the extension and base
  const extension = slug.substring(lastDotIndex);
  const base = slug.substring(0, lastDotIndex);

  return { base, extension };
};

/**
 * Removes file extension from a slug
 * @param slug The slug to clean
 * @returns The slug without extension
 */
export const removeSlugExtension = (slug: string): string => {
  if (!slug) return slug;
  const { base } = extractSlugExtension(slug);
  return base;
};

/**
 * Formats a parent slug for display or selection
 * @param slug The parent slug
 * @returns The formatted parent slug without extension
 */

/**
 * Parses a slug for edit mode, returning the initial slug and prefix flag.
 * Mirrors the logic from AddNewLanguagePage.
 * @param fullSlug The full slug string
 * @param primaryPageObject The primary page object (must have .slug and .parent)
 * @param LANGUAGES A map of language codes
 * @returns { initSlug: string, prefix: boolean }
 */
export function parseSlugForEdit(
  fullSlug: string,
  primaryPageObject: { slug: string; parent?: any },
): { initSlug: string; prefix: boolean } {
  const splittedSlugs = (fullSlug || "").split("/").filter(Boolean);
  let initSlug = "";
  let prefix = true;
  if (primaryPageObject.slug === "/") {
    const last = splittedSlugs.pop() || "";
    if (LANGUAGES[last]) {
      prefix = true;
    } else {
      initSlug = last;
      const langCode = splittedSlugs.pop() || "";
      prefix = !!LANGUAGES[langCode];
    }
  } else if (!primaryPageObject.parent) {
    if (splittedSlugs.length) {
      initSlug = splittedSlugs.pop() || "";
      const langCode = splittedSlugs.pop() || "";
      prefix = !!LANGUAGES[langCode];
    }
  } else {
    if (splittedSlugs.length) {
      initSlug = splittedSlugs.pop() || "";
    }
  }
  return { initSlug, prefix };
}

/**
 * Formats a parent slug for display or selection
 * @param slug The parent slug
 * @returns The formatted parent slug without extension
 */
export const formatParentSlug = (slug: string): string => {
  if (!slug) return slug;
  return removeSlugExtension(slug);
};

/**
 * Combines parent and child slugs into a final slug
 * @param parentSlug The parent page slug
 * @param childSlug The child page slug
 * @returns The combined slug
 */
export const combineParentChildSlugs = (parentSlug: string, childSlug: string): string => {
  const cleanParentSlug = removeSlugExtension(parentSlug || "");

  if (!cleanParentSlug || cleanParentSlug === "/") {
    return `/${childSlug}`;
  }

  return `${cleanParentSlug}/${childSlug}`;
};
