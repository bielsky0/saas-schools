import { isString, last, startsWith } from "lodash-es";
import { ChaiBlock } from "~/types/common";

export const adjustSpacingInContentBlocks = (blocks: ChaiBlock[]) => {
  const lastBlock = last(blocks);

  return blocks.map((block) => {
    const keys = Object.keys(block);
    for (let i = 0; i < keys.length; i++) {
      if (isString(block[keys[i]]) && startsWith(keys[i], "content")) {
        const space = block === lastBlock ? "" : " ";
        block[keys[i]] = `${block[keys[i]].trim()}${space}`;
      }
    }
    return block;
  });
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("adjustSpacingInContentBlocks", () => {
    it("should add space after content fields except for the last block", () => {
      const blocks = [
        { _id: "1", _type: "Text", content: "First" },
        { _id: "2", _type: "Text", content: "Second" },
        { _id: "3", _type: "Text", content: "Third" },
      ] as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].content).toBe("First ");
      expect(result[1].content).toBe("Second ");
      expect(result[2].content).toBe("Third");
    });

    it("should trim whitespace from content before adding space", () => {
      const blocks = [
        { _id: "1", _type: "Text", content: "  First  " },
        { _id: "2", _type: "Text", content: "  Second  " },
      ] as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].content).toBe("First ");
      expect(result[1].content).toBe("Second");
    });

    it("should handle multiple content fields in a single block", () => {
      const blocks = [
        { _id: "1", _type: "Text", content: "Main", contentAlt: "Alt" },
        { _id: "2", _type: "Text", content: "Last", contentSecondary: "Secondary" },
      ] as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].content).toBe("Main ");
      expect(result[0].contentAlt).toBe("Alt ");
      expect(result[1].content).toBe("Last");
      expect(result[1].contentSecondary).toBe("Secondary");
    });

    it("should only process fields that start with 'content'", () => {
      const blocks = [
        { _id: "1", _type: "Text", content: "Text", title: "Title", text: "Text" },
        { _id: "2", _type: "Text", content: "Last" },
      ] as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].content).toBe("Text ");
      expect(result[0].title).toBe("Title");
      expect(result[0].text).toBe("Text");
      expect(result[1].content).toBe("Last");
    });

    it("should handle empty array", () => {
      const blocks: ChaiBlock[] = [];
      const result = adjustSpacingInContentBlocks(blocks);
      expect(result).toEqual([]);
    });

    it("should handle single block", () => {
      const blocks = [{ _id: "1", _type: "Text", content: "Only" }] as ChaiBlock[];
      const result = adjustSpacingInContentBlocks(blocks);
      expect(result[0].content).toBe("Only");
    });

    it("should handle blocks without content fields", () => {
      const blocks = [
        { _id: "1", _type: "Container", title: "Title" },
        { _id: "2", _type: "Container", name: "Name" },
      ] as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].title).toBe("Title");
      expect(result[1].name).toBe("Name");
    });

    it("should handle blocks with non-string content fields", () => {
      const blocks = [
        { _id: "1", _type: "Text", content: "Text", contentNum: 123 },
        { _id: "2", _type: "Text", content: "Last", contentBool: true },
      ] as any as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].content).toBe("Text ");
      expect(result[0].contentNum).toBe(123);
      expect(result[1].content).toBe("Last");
      expect(result[1].contentBool).toBe(true);
    });

    it("should handle empty string content", () => {
      const blocks = [
        { _id: "1", _type: "Text", content: "" },
        { _id: "2", _type: "Text", content: "Last" },
      ] as ChaiBlock[];

      const result = adjustSpacingInContentBlocks(blocks);

      expect(result[0].content).toBe(" ");
      expect(result[1].content).toBe("Last");
    });
  });
}
