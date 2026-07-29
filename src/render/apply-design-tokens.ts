import { each, isString, keys } from "lodash-es";
import { generateClassNames } from "~/core/components/canvas/static/new-blocks-render-helpers";
import { STYLES_KEY } from "~/core/constants/STRINGS";
import { ChaiBlock } from "~/types/common";
import { ChaiDesignTokens } from "~/types/types";

export const applyDesignTokens = (blocks: ChaiBlock[], designTokens: ChaiDesignTokens) => {
  return blocks.map((block) => {
    const styleKeys = keys(block).filter((key) => isString(block[key]) && block[key].startsWith(STYLES_KEY));
    each(styleKeys, (styleKey) => {
      block[styleKey] = `${STYLES_KEY},${generateClassNames(block[styleKey], designTokens)}`;
    });
    return block;
  });
};

if (import.meta.vitest) {
  describe("applyDesignTokens", () => {
    const mockDesignTokens: ChaiDesignTokens = {
      "dt#token1": { name: "primary-color", value: "bg-blue-500" },
      "dt#token2": { name: "text-size", value: "text-lg" },
      "dt#token3": { name: "spacing", value: "p-4" },
    };

    const mockBlocks: ChaiBlock[] = [
      {
        _id: "block1",
        _type: "div",
        styles: "#styles:,dt#token1 bg-white text-sm",
        className: "#styles:,dt#token2 dt#token3",
        otherProp: "not-a-style",
        _name: "Test Block",
      },
      {
        _id: "block2",
        _type: "button",
        styles: "#styles:bg-red-500",
        nonStringProp: 123,
        _name: "Button Block",
      },
      {
        _id: "block3",
        _type: "span",
        noStyles: "regular-string",
        _name: "No Styles Block",
      },
    ];

    it("should process blocks and replace style properties with generated class names", () => {
      const result = applyDesignTokens(mockBlocks, mockDesignTokens);

      expect(result).toHaveLength(3);

      // Check first block - styles property should be transformed
      expect(result[0].styles).toBe("#styles:,bg-white text-sm");

      // Check first block - className property should be transformed
      expect(result[0].className).toBe("#styles:,text-lg p-4");

      // Non-style properties should remain unchanged
      expect(result[0].otherProp).toBe("not-a-style");
      expect(result[0]._id).toBe("block1");
      expect(result[0]._type).toBe("div");
    });

    it("should handle blocks with no style properties", () => {
      const result = applyDesignTokens(mockBlocks, mockDesignTokens);

      // Third block has no style properties
      expect(result[2].noStyles).toBe("regular-string");
      expect(result[2]._id).toBe("block3");
    });

    it("should handle empty blocks array", () => {
      const result = applyDesignTokens([], mockDesignTokens);
      expect(result).toEqual([]);
    });

    it("should handle empty design tokens", () => {
      const result = applyDesignTokens(mockBlocks, {});

      // Should still prepend STYLES_KEY but tokens won't be resolved
      expect(result[0].styles).toBe("#styles:,bg-white text-sm");
    });

    it("should handle blocks with only style prefix", () => {
      const blocksWithOnlyPrefix: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "div",
          styles: "#styles:",
          _name: "Prefix Only",
        },
      ];

      const result = applyDesignTokens(blocksWithOnlyPrefix, mockDesignTokens);
      expect(result[0].styles).toBe("#styles:,");
    });

    it("should handle blocks with multiple style properties", () => {
      const multiStyleBlock: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "div",
          styles: "#styles:bg-white dt#token1",
          hoverStyles: "#styles:bg-gray-100 dt#token2",
          focusStyles: "#styles:outline-none dt#token3",
          _name: "Multi Style",
        },
      ];

      const result = applyDesignTokens(multiStyleBlock, mockDesignTokens);

      expect(result[0].styles).toBe("#styles:,bg-white");
      expect(result[0].hoverStyles).toBe("#styles:,text-lg bg-gray-100");
      expect(result[0].focusStyles).toBe("#styles:,p-4 outline-none");
    });

    it("should not modify non-string properties that start with #styles:", () => {
      const blockWithNonString: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "div",
          styles: "#styles:bg-white",
          objectStyles: { startsWith: "#styles:" } as any,
          arrayStyles: ["#styles:bg-red-500"] as any,
          _name: "Non String Styles",
        },
      ];

      const result = applyDesignTokens(blockWithNonString, mockDesignTokens);

      expect(result[0].styles).toBe("#styles:,bg-white");
      expect(result[0].objectStyles).toEqual({ startsWith: "#styles:" });
      expect(result[0].arrayStyles).toEqual(["#styles:bg-red-500"]);
    });

    it("should handle undefined and null values", () => {
      const blockWithNullUndefined: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "div",
          styles: "#styles:bg-white",
          nullStyles: null as any,
          undefinedStyles: undefined as any,
          _name: " Null Undefined",
        },
      ];

      const result = applyDesignTokens(blockWithNullUndefined, mockDesignTokens);

      expect(result[0].styles).toBe("#styles:,bg-white");
      expect(result[0].nullStyles).toBeNull();
      expect(result[0].undefinedStyles).toBeUndefined();
    });

    it("should preserve block structure and non-style properties", () => {
      const result = applyDesignTokens(mockBlocks, mockDesignTokens);

      // All blocks should maintain their structure
      result.forEach((block, index) => {
        expect(block._id).toBe(mockBlocks[index]._id);
        expect(block._type).toBe(mockBlocks[index]._type);
        expect(block._name).toBe(mockBlocks[index]._name);
      });
    });

    it("should handle complex design token values", () => {
      const complexTokens: ChaiDesignTokens = {
        "dt#complex1": { name: "complex-token", value: "hover:bg-blue-600 focus:outline-none transition-colors" },
        "dt#complex2": { name: "spacing-token", value: "px-6 py-3 m-2" },
      };

      const blocksWithComplexTokens: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "div",
          styles: "#styles:bg-white dt#complex1",
          _name: "Complex Tokens",
        },
      ];

      const result = applyDesignTokens(blocksWithComplexTokens, complexTokens);
      expect(result[0].styles).toBe("#styles:,hover:bg-blue-600 focus:outline-none transition-colors bg-white");
    });

    it("should handle tokens with empty values", () => {
      const tokensWithEmptyValues: ChaiDesignTokens = {
        "dt#empty1": { name: "empty-token", value: "" },
        "dt#valid1": { name: "valid-token", value: "bg-green-500" },
      };

      const blocksWithEmptyTokens: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "div",
          styles: "#styles:bg-white dt#empty1 dt#valid1",
          _name: "Empty Value Tokens",
        },
      ];

      const result = applyDesignTokens(blocksWithEmptyTokens, tokensWithEmptyValues);
      expect(result[0].styles).toBe("#styles:,bg-white");
    });
  });
}
