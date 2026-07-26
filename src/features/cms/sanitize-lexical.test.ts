import { describe, expect, it } from "vitest";

import { sanitizeLexicalJson } from "./sanitize-lexical";

const SAFE_TEXT_NODE = { type: "text", text: "Hello world" };
const SAFE_LINK_NODE = {
  type: "link",
  url: "https://example.com",
  children: [{ type: "text", text: "click me" }],
};
const JS_LINK_NODE = {
  type: "link",
  url: "javascript:alert(1)",
  target: "_blank",
  rel: "noopener",
  children: [{ type: "text", text: "click me" }],
};
const DATA_LINK_NODE = {
  type: "link",
  url: "data:text/html,<script>alert(1)</script>",
  children: [{ type: "text", text: "data link" }],
};
const VB_LINK_NODE = {
  type: "link",
  url: "vbscript:msgbox(1)",
  children: [{ type: "text", text: "vbs link" }],
};
const RELATIVE_LINK_NODE = {
  type: "link",
  url: "/o-nas",
  children: [{ type: "text", text: "o nas" }],
};
const MAILTO_LINK_NODE = {
  type: "link",
  url: "mailto:hello@example.com",
  children: [{ type: "text", text: "email" }],
};

function asArray(v: unknown): Record<string, unknown>[] {
  return (Array.isArray(v) ? v : [v]) as Record<string, unknown>[];
}

describe("sanitizeLexicalJson", () => {
  it("passes through a plain text node unchanged", () => {
    expect(sanitizeLexicalJson(SAFE_TEXT_NODE)).toEqual(SAFE_TEXT_NODE);
  });

  it("keeps a safe https link intact", () => {
    expect(sanitizeLexicalJson(SAFE_LINK_NODE)).toEqual(SAFE_LINK_NODE);
  });

  it("keeps a relative link intact", () => {
    expect(sanitizeLexicalJson(RELATIVE_LINK_NODE)).toEqual(RELATIVE_LINK_NODE);
  });

  it("keeps a mailto link intact", () => {
    expect(sanitizeLexicalJson(MAILTO_LINK_NODE)).toEqual(MAILTO_LINK_NODE);
  });

  describe("dangerous links are stripped to plain text", () => {
    it("strips javascript: URI — link node removed, text children preserved", () => {
      const result = asArray(sanitizeLexicalJson(JS_LINK_NODE));
      expect(result[0]!.type).toBe("text");
      expect(result[0]!.text).toBe("click me");
      expect(result[0]!.url).toBeUndefined();
    });

    it("strips data: URI", () => {
      const result = asArray(sanitizeLexicalJson(DATA_LINK_NODE));
      expect(result[0]!.type).toBe("text");
    });

    it("strips vbscript: URI", () => {
      const result = asArray(sanitizeLexicalJson(VB_LINK_NODE));
      expect(result[0]!.type).toBe("text");
    });
  });

  describe("nested structure", () => {
    it("sanitizes deeply nested link nodes", () => {
      const input = {
        type: "paragraph",
        children: [
          SAFE_TEXT_NODE,
          JS_LINK_NODE,
          SAFE_LINK_NODE,
        ],
      };
      const result = asArray(sanitizeLexicalJson(input))[0]!;
      const children = result.children as Record<string, unknown>[];

      expect(children).toHaveLength(3);
      expect(children[0]!.type).toBe("text");
      expect(children[1]!.type).toBe("text");
      expect(children[1]!.text).toBe("click me");
      expect(children[2]!.type).toBe("link");
      expect(children[2]!.url).toBe("https://example.com");
    });

    it("handles a full Lexical document with mixed content", () => {
      const doc = {
        root: {
          children: [
            { type: "paragraph", children: [SAFE_TEXT_NODE] },
            { type: "paragraph", children: [JS_LINK_NODE] },
          ],
        },
      };
      const result = asArray(sanitizeLexicalJson(doc))[0]!;
      const root = result.root as Record<string, unknown>;
      const paragraphs = root.children as Record<string, unknown>[];
      const secondPara = paragraphs[1]!.children as Record<string, unknown>[];
      expect(secondPara[0]!.type).toBe("text");
      expect(secondPara[0]!.text).toBe("click me");
      // url should be undefined for a stripped link node
      expect("url" in (secondPara[0] as Record<string, unknown>)).toBe(false);
    });
  });

  it("handles null input gracefully", () => {
    expect(sanitizeLexicalJson(null)).toBeNull();
  });

  it("handles primitive values", () => {
    expect(sanitizeLexicalJson("string")).toBe("string");
    expect(sanitizeLexicalJson(42)).toBe(42);
  });
});
