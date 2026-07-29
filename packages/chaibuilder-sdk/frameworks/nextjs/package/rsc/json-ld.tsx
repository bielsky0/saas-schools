"use server";

import { withDataBinding } from "../lib/with-data-binding";

/**
 * Checks if the given JSON-LD string is valid
 * @param {string} jsonLD - The JSON-LD string to check
 * @returns {boolean} True if the string is valid, false otherwise
 */
const isValidJsonLD = (jsonLD: string): boolean => {
  try {
    const data = JSON.parse(jsonLD);
    return Object.keys(data).length > 0;
  } catch (_error) {
    return false;
  }
};

interface JSONLDProps {
  jsonLD?: string;
  pageData?: Record<string, unknown>;
}

/**
 * Renders a JSON-LD script tag with the given JSON-LD string
 * @param {JSONLDProps} props - The JSON-LD string and optional page data
 * @returns The rendered script tag or null if the JSON-LD string is invalid
 */
export const JSONLD = async ({ jsonLD, pageData = {} }: JSONLDProps) => {
  if (!jsonLD || !isValidJsonLD(jsonLD)) return null;

  const jsonLDString = withDataBinding(jsonLD, pageData);

  if (!isValidJsonLD(jsonLDString)) return null;

  return (
    <script type="application/ld+json" key="jsonld">
      {jsonLDString}
    </script>
  );
};
