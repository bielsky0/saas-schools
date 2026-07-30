import { isAllowedUrl } from "./href-validator";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeLexicalJson(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.flatMap((n) => {
      const s = sanitizeLexicalJson(n);
      if (s === null) return [];
      if (Array.isArray(s)) return s;
      return [s];
    });
  }

  if (!isPlainObject(node)) {
    return node;
  }

  const obj = { ...node } as Record<string, unknown>;

  if (obj.type === "link") {
    const url = obj.url;
    if (typeof url === "string" && !isAllowedUrl(url)) {
      const children = obj.children;
      if (Array.isArray(children)) {
        return sanitizeLexicalJson(children);
      }
      return null;
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) || isPlainObject(value)) {
      obj[key] = sanitizeLexicalJson(value);
    }
  }

  return obj;
}
