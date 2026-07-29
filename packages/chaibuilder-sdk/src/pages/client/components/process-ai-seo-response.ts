export const processAiSeoResponse = (
  fieldValue: string | null,
  field: string,
): { success: true; value: string } | { success: false; error: string } => {
  if (!fieldValue) {
    return { success: false, error: "Empty response from AI" };
  }

  try {
    let processedValue = fieldValue;

    // Remove surrounding quotes and unescape if needed
    if (typeof processedValue === "string") {
      const hasOuterQuotes = /^".*"$/.test(processedValue);
      if (hasOuterQuotes) {
        processedValue = processedValue.replace(/^"(.*)"$/, "$1");
        // Unescape common escaped characters (order matters: backslashes first, then others)
        processedValue = processedValue
          .replace(/\\\\/g, "___DOUBLE_BACKSLASH___")
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/___DOUBLE_BACKSLASH___/g, "\\");
      }

      // For JSON-LD and metaOther fields, strip markdown code block formatting and validate JSON
      if (field === "jsonLD" || field === "metaOther") {
        // Check for and remove ```json or ``` code block markers
        if (processedValue.includes("```")) {
          processedValue = processedValue
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/m, "");
        }

        // Trim any extra whitespace
        processedValue = processedValue.trim();

        // Validate that the remaining content is valid JSON
        try {
          JSON.parse(processedValue);
        } catch {
          return {
            success: false,
            error: "The AI response is not valid JSON. Please try again or edit manually.",
          };
        }
      }
    }

    return { success: true, value: processedValue };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe("processAiSeoResponse", () => {
    describe("Regular text fields (title, description, etc.)", () => {
      it("should handle plain text responses", () => {
        const result = processAiSeoResponse("SEO Title Here", "title");
        expect(result).toEqual({ success: true, value: "SEO Title Here" });
      });

      it("should remove surrounding quotes from text fields", () => {
        const result = processAiSeoResponse('"SEO Title Here"', "title");
        expect(result).toEqual({ success: true, value: "SEO Title Here" });
      });

      it("should handle empty string", () => {
        const result = processAiSeoResponse("", "title");
        expect(result).toEqual({ success: false, error: "Empty response from AI" });
      });

      it("should handle null value", () => {
        const result = processAiSeoResponse(null, "title");
        expect(result).toEqual({ success: false, error: "Empty response from AI" });
      });
    });

    describe("JSON fields (jsonLD, metaOther)", () => {
      it("should handle valid JSON without code blocks", () => {
        const jsonInput = '{"@context": "https://schema.org", "@type": "WebPage"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: jsonInput });
      });

      it("should remove ```json code blocks and validate JSON", () => {
        const jsonInput = '```json\n{"@context": "https://schema.org", "@type": "WebPage"}\n```';
        const expected = '{"@context": "https://schema.org", "@type": "WebPage"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should remove ``` code blocks (without json keyword) and validate JSON", () => {
        const jsonInput = '```\n{"@context": "https://schema.org", "@type": "WebPage"}\n```';
        const expected = '{"@context": "https://schema.org", "@type": "WebPage"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should handle ```JSON (uppercase) code blocks", () => {
        const jsonInput = '```JSON\n{"@context": "https://schema.org"}\n```';
        const expected = '{"@context": "https://schema.org"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should handle code blocks with extra whitespace", () => {
        const jsonInput = '```json  \n  {"@context": "https://schema.org"}  \n  ```';
        const expected = '{"@context": "https://schema.org"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should reject invalid JSON after removing code blocks", () => {
        const jsonInput = "```json\n{invalid json here}\n```";
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({
          success: false,
          error: "The AI response is not valid JSON. Please try again or edit manually.",
        });
      });

      it("should reject invalid JSON without code blocks", () => {
        const jsonInput = "{invalid json}";
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({
          success: false,
          error: "The AI response is not valid JSON. Please try again or edit manually.",
        });
      });

      it("should handle complex nested JSON with code blocks", () => {
        const jsonInput = `\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "datePublished": "2024-01-01"
}
\`\`\``;
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result.success).toBe(true);
        if (result.success) {
          const parsed = JSON.parse(result.value);
          expect(parsed["@type"]).toBe("Article");
          expect(parsed.author.name).toBe("John Doe");
        }
      });

      it("should handle metaOther field with JSON", () => {
        const jsonInput = '```json\n{"og:type": "website", "twitter:card": "summary"}\n```';
        const expected = '{"og:type": "website", "twitter:card": "summary"}';
        const result = processAiSeoResponse(jsonInput, "metaOther");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should handle JSON arrays", () => {
        const jsonInput = '```json\n[{"@type": "BreadcrumbList"}]\n```';
        const expected = '[{"@type": "BreadcrumbList"}]';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should handle empty JSON object", () => {
        const jsonInput = "```json\n{}\n```";
        const expected = "{}";
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });

      it("should handle JSON with special characters and escaping", () => {
        const jsonInput = '```json\n{"description": "A \\"quoted\\" string with\\nnewlines"}\n```';
        const expected = '{"description": "A \\"quoted\\" string with\\nnewlines"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result).toEqual({ success: true, value: expected });
      });
    });

    describe("Edge cases", () => {
      it("should handle response with only code block markers", () => {
        const jsonInput = "```json\n```";
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result.success).toBe(false);
      });

      it("should handle malformed code blocks (missing closing)", () => {
        const jsonInput = '```json\n{"@context": "https://schema.org"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result.success).toBe(true);
        if (result.success) {
          const parsed = JSON.parse(result.value);
          expect(parsed["@context"]).toBe("https://schema.org");
        }
      });

      it("should handle response with double-quoted JSON", () => {
        const jsonInput = '{"@type": "WebPage", "name": "Test"}';
        const result = processAiSeoResponse(jsonInput, "jsonLD");
        expect(result.success).toBe(true);
        if (result.success) {
          const parsed = JSON.parse(result.value);
          expect(parsed["@type"]).toBe("WebPage");
        }
      });
    });
  });
}
