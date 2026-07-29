/**
 * Utility functions for handling JSON with placeholders
 */

import { get } from "lodash-es";

/**
 * Escape regex special characters in a string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Gets a nested value from an object using dot notation
 */
export const getNestedValue = (obj: Record<string, any>, path: string): any => {
  if (!obj || !path) return undefined;

  // Handle both dot notation and bracket notation
  const normalizedPath = path.replace(/\[([^\]]+)\]/g, ".$1");
  const keys = normalizedPath.split(".");

  try {
    // Try to navigate the object using the path
    return keys.reduce((o, key) => {
      // Skip empty keys that might result from something like obj..prop
      if (!key) return o;
      return o?.[key];
    }, obj);
  } catch (e) {
    console.log(`Error getting value for path ${path}:`, e);
    return undefined;
  }
};

/**
 * Format JSON with indentation
 */
export const formatJson = (jsonString: string): string => {
  if (!jsonString.trim()) return "";

  try {
    const parsedJson = JSON.parse(jsonString);
    return JSON.stringify(parsedJson, null, 2);
  } catch {
    // If formatting fails, return the original string
    return jsonString;
  }
};

/**
 * Interface for JSON error information
 */
export interface JsonError {
  message: string;
  position?: number;
  line?: number;
  column?: number;
}

/**
 * Parse and validate JSON with placeholders
 */
export const parseJSONWithPlaceholders = (jsonString: string) => {
  if (!jsonString.trim()) {
    return { isValid: false, parsed: null, placeholders: [], error: { message: "JSON is empty" } };
  }

  // Step 1: Try simple JSON parse first
  try {
    const parsed = JSON.parse(jsonString);
    // If it parses successfully but contains no placeholders, we're done
    return { isValid: true, parsed, error: null, placeholders: [] };
  } catch {
    // If it fails, it could be due to placeholders - continue to step 2
  }

  // Step 2: Find all placeholders
  const placeholderPattern = /{{([^{}]+)}}/g;
  const placeholders: { original: string; replaced: string; position: number }[] = [];
  let tempJsonString = jsonString;
  let match;

  // Replace placeholders with dummy values to make JSON valid
  while ((match = placeholderPattern.exec(jsonString)) !== null) {
    const original = match[0]; // {{field}}
    const position = match.index;
    const replacement = `"__placeholder_${placeholders.length}__"`;
    placeholders.push({ original, replaced: replacement, position });

    // Replace each placeholder with a temporary value
    tempJsonString = tempJsonString.replace(original, replacement);
  }

  // Step 3: Try to parse the modified JSON
  try {
    const parsedJson = JSON.parse(tempJsonString);
    return { isValid: true, parsed: parsedJson, error: null, placeholders };
  } catch (error) {
    const jsonError = error as SyntaxError;
    // Extract line and column info from error message
    const positionMatch = jsonError.message.match(/position (\d+)/);
    const position = positionMatch ? parseInt(positionMatch[1]) : undefined;

    // Basic line/column calculation for error reporting
    let line, column;
    if (position !== undefined) {
      const lines = tempJsonString.substring(0, position).split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    return {
      isValid: false,
      parsed: null,
      placeholders,
      error: {
        message: jsonError.message,
        line,
        column,
        position,
      },
    };
  }
};

/**
 * Restores placeholders in JSON string
 */
export const restorePlaceholders = (
  json: any,
  placeholders: { original: string; replaced: string; position: number }[],
) => {
  const jsonStr = JSON.stringify(json, null, 2);
  let resultStr = jsonStr;

  placeholders.forEach(({ original }, index) => {
    // Remove quotes around the placeholder replacement
    const quotedReplacement = `"__placeholder_${index}__"`;
    const specificPattern = new RegExp(escapeRegExp(quotedReplacement), "g");
    resultStr = resultStr.replace(specificPattern, original);
  });

  return resultStr;
};

/**
 * Evaluates placeholders based on page data
 */
export const evaluatePlaceholders = (json: any, pageData: Record<string, any>) => {
  if (!json) return "";

  // Start with the formatted JSON string
  let jsonStr = JSON.stringify(json, null, 2);

  // find all {{}}
  const placeholderPattern = /{{([^{}]+)}}/g;
  let match;
  while ((match = placeholderPattern.exec(jsonStr)) !== null) {
    const fieldName = match[1];
    const fieldValue = get(pageData, fieldName, null);
    jsonStr = jsonStr.replace(match[0], fieldValue);
  }
  return jsonStr;
};
