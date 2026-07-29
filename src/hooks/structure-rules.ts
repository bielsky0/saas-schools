import { ChaiBlock } from "~/types/common";

export type StructureError = {
  id: string;
  message: string;
  severity: "error" | "warning";
  blockId?: string;
};

export type StructureRule = {
  name: string;
  description: string;
  validate: (blocks: ChaiBlock[], tree: any[]) => StructureError[];
};

// HTML tag mappings based on web-blocks
export const BLOCK_HTML_MAPPING: Record<string, string> = {
  Link: "a",
  Button: "button",
  List: "ul",
  ListItem: "li",
  Table: "table",
  TableHead: "thead",
  TableBody: "tbody",
  TableRow: "tr",
  TableCell: "td",
  Heading: "h1",
  Paragraph: "p",
  Box: "div",
  Span: "span",
  Image: "img",
  Video: "video",
};

// Core structure validation rules
export const CORE_STRUCTURE_RULES: StructureRule[] = [
  {
    name: "no-nested-div-in-p",
    description: "Prevents div elements from being nested inside paragraph elements",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const findDivsInParagraphs = (nodes: any[], parentIsParagraph: boolean = false) => {
        nodes.forEach((node) => {
          const isParagraph = node._type === "Paragraph";
          const isBox = node._type === "Box";

          if (isBox && parentIsParagraph) {
            errors.push({
              id: `div-in-paragraph-${node._id}`,
              message: "Box (div) cannot be nested inside Paragraph elements",
              severity: "error",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            findDivsInParagraphs(node.children, isParagraph);
          }
        });
      };

      findDivsInParagraphs(tree);
      return errors;
    },
  },
  {
    name: "no-interactive-nesting",
    description:
      "Prevents interactive elements (links, buttons with href) from being nested inside other interactive elements",
    validate: (blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      // Check tree structure for visual nesting
      const findNestedInteractiveInTree = (
        nodes: any[],
        parentIsInteractive: boolean = false,
        parentPath: string[] = [],
      ) => {
        nodes.forEach((node) => {
          const currentPath = [...parentPath, node._id];
          const isLink = node._type === "Link";
          const isButtonWithHref =
            node._type === "Button" && node.link && node.link.href && node.link.href.trim() !== "";
          const isInteractive = isLink || isButtonWithHref;

          if (isInteractive && parentIsInteractive) {
            const elementType = isLink ? "Link" : "Button with href";
            errors.push({
              id: `nested-interactive-tree-${node._id}`,
              message: `${elementType} cannot be nested inside another interactive element (link or button with href)`,
              severity: "error",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            findNestedInteractiveInTree(node.children, isInteractive, currentPath);
          }
        });
      };

      // Check flat blocks array for parent-child relationships
      const findNestedInteractiveInBlocks = (blocksList: ChaiBlock[]) => {
        const interactiveBlocks = blocksList.filter((block) => {
          return (
            block._type === "Link" ||
            (block._type === "Button" && block.link && block.link.href && block.link.href.trim() !== "")
          );
        });

        interactiveBlocks.forEach((interactiveBlock) => {
          if (interactiveBlock._parent) {
            const parentBlock = blocksList.find((block) => block._id === interactiveBlock._parent);

            // Check if parent is also interactive (direct nesting)
            const parentIsLink = parentBlock && parentBlock._type === "Link";
            const parentIsButtonWithHref =
              parentBlock &&
              parentBlock._type === "Button" &&
              parentBlock.link &&
              parentBlock.link.href &&
              parentBlock.link.href.trim() !== "";

            if (parentIsLink || parentIsButtonWithHref) {
              const childType = interactiveBlock._type === "Link" ? "Link" : "Button with href";
              const parentType = parentIsLink ? "Link" : "Button with href";
              errors.push({
                id: `nested-interactive-parent-${interactiveBlock._id}`,
                message: `${childType} cannot be nested inside ${parentType}`,
                severity: "error",
                blockId: interactiveBlock._id,
              });
            }

            // Check if any ancestor is interactive (deep nesting)
            let currentAncestor = parentBlock;
            while (currentAncestor && currentAncestor._parent) {
              const ancestorBlock = blocksList.find((block) => block._id === currentAncestor!._parent);
              if (ancestorBlock) {
                const ancestorIsLink = ancestorBlock._type === "Link";
                const ancestorIsButtonWithHref =
                  ancestorBlock._type === "Button" &&
                  ancestorBlock.link &&
                  ancestorBlock.link.href &&
                  ancestorBlock.link.href.trim() !== "";

                if (ancestorIsLink || ancestorIsButtonWithHref) {
                  const childType = interactiveBlock._type === "Link" ? "Link" : "Button with href";
                  const ancestorType = ancestorIsLink ? "Link" : "Button with href";
                  errors.push({
                    id: `nested-interactive-ancestor-${interactiveBlock._id}`,
                    message: `${childType} cannot be nested inside ${ancestorType}`,
                    severity: "error",
                    blockId: interactiveBlock._id,
                  });
                  break; // Found an interactive ancestor, no need to check further
                }
              }
              currentAncestor = ancestorBlock;
            }
          }
        });
      };

      findNestedInteractiveInTree(tree);
      findNestedInteractiveInBlocks(blocks);
      return errors;
    },
  },

  {
    name: "listitem-in-list",
    description: "Ensures ListItems are only inside List containers",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const findListItemsOutsideList = (nodes: any[], parentType: string | null = null) => {
        nodes.forEach((node) => {
          if (node._type === "ListItem" && parentType !== "List") {
            errors.push({
              id: `listitem-outside-list-${node._id}`,
              message: "List Item must be inside a List container",
              severity: "error",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            findListItemsOutsideList(node.children, node._type);
          }
        });
      };

      findListItemsOutsideList(tree);
      return errors;
    },
  },

  {
    name: "table-cell-structure",
    description: "Validates proper table hierarchy (TableCell -> TableRow -> TableHead/Body -> Table)",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const validateTableStructure = (nodes: any[], parentChain: string[] = []) => {
        nodes.forEach((node) => {
          const currentChain = [...parentChain, node._type];

          if (node._type === "TableCell") {
            const hasTableRow = currentChain.includes("TableRow");
            const hasTableSection = currentChain.includes("TableHead") || currentChain.includes("TableBody");
            const hasTable = currentChain.includes("Table");

            if (!hasTableRow || !hasTableSection || !hasTable) {
              errors.push({
                id: `table-cell-structure-${node._id}`,
                message:
                  "Table Cell must be inside a Table Row, which must be inside Table Head/Body, which must be inside a Table",
                severity: "error",
                blockId: node._id,
              });
            }
          }

          if (node._type === "TableRow" && !currentChain.slice(0, -1).includes("Table")) {
            errors.push({
              id: `table-row-outside-table-${node._id}`,
              message: "Table Row must be inside a Table (Table Head or Table Body)",
              severity: "error",
              blockId: node._id,
            });
          }

          if (
            (node._type === "TableHead" || node._type === "TableBody") &&
            !currentChain.slice(0, -1).includes("Table")
          ) {
            errors.push({
              id: `table-section-outside-table-${node._id}`,
              message: "Table Head/Body must be inside a Table",
              severity: "error",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            validateTableStructure(node.children, currentChain);
          }
        });
      };

      validateTableStructure(tree);
      return errors;
    },
  },

  {
    name: "no-nested-buttons",
    description: "Prevents buttons from being nested inside other buttons",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const findNestedButtons = (nodes: any[], parentIsButton: boolean = false) => {
        nodes.forEach((node) => {
          const isButton = node._type === "Button";

          if (isButton && parentIsButton) {
            errors.push({
              id: `nested-button-${node._id}`,
              message: "Button cannot be nested inside another button",
              severity: "error",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            findNestedButtons(node.children, isButton);
          }
        });
      };

      findNestedButtons(tree);
      return errors;
    },
  },

  {
    name: "no-nested-paragraphs",
    description: "Prevents paragraph elements from being nested inside other paragraph elements at any level",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const findNestedParagraphs = (nodes: any[], ancestorParagraphs: string[] = []) => {
        nodes.forEach((node) => {
          const isParagraph = node._type === "Paragraph";

          if (isParagraph && ancestorParagraphs.length > 0) {
            errors.push({
              id: `nested-paragraph-${node._id}`,
              message: "Paragraph cannot be nested inside another paragraph",
              severity: "error",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            const newAncestors = isParagraph ? [...ancestorParagraphs, node._id] : ancestorParagraphs;
            findNestedParagraphs(node.children, newAncestors);
          }
        });
      };

      findNestedParagraphs(tree);
      return errors;
    },
  },

  {
    name: "heading-structure",
    description: "Checks for proper heading hierarchy and warns about skipped levels",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];
      const headings: { level: number; blockId: string; path: string[] }[] = [];

      const collectHeadings = (nodes: any[], path: string[] = []) => {
        nodes.forEach((node) => {
          if (node._type === "Heading") {
            const tag = node.tag || "h2";
            const level = parseInt(tag.replace("h", "")) || 2;
            headings.push({ level, blockId: node._id, path: [...path, node._id] });
          }

          if (node.children && node.children.length > 0) {
            collectHeadings(node.children, [...path, node._id]);
          }
        });
      };

      collectHeadings(tree);

      // Check for skipped heading levels
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i];
        const previous = headings[i - 1];

        if (current.level > previous.level + 1) {
          errors.push({
            id: `heading-level-skip-${current.blockId}`,
            message: `Heading level skipped: h${previous.level} followed by h${current.level}. Consider using h${previous.level + 1}`,
            severity: "warning",
            blockId: current.blockId,
          });
        }
      }

      return errors;
    },
  },
];

// Additional accessibility rules that can be enabled
export const ACCESSIBILITY_RULES: StructureRule[] = [
  {
    name: "image-alt-text",
    description: "Warns if images are missing alt text",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const checkImages = (nodes: any[]) => {
        nodes.forEach((node) => {
          if (node._type === "Image" && !node.alt) {
            errors.push({
              id: `image-missing-alt-${node._id}`,
              message: "Image should have alt text for accessibility",
              severity: "warning",
              blockId: node._id,
            });
          }

          if (node.children && node.children.length > 0) {
            checkImages(node.children);
          }
        });
      };

      checkImages(tree);
      return errors;
    },
  },

  {
    name: "button-accessibility",
    description: "Ensures buttons have accessible labels",
    validate: (_blocks: ChaiBlock[], tree: any[]) => {
      const errors: StructureError[] = [];

      const checkButtons = (nodes: any[]) => {
        nodes.forEach((node) => {
          if (node._type === "Button") {
            const hasContent = node.content || (node.children && node.children.length > 0);
            if (!hasContent) {
              errors.push({
                id: `button-no-label-${node._id}`,
                message: "Button should have accessible content (text or icon)",
                severity: "warning",
                blockId: node._id,
              });
            }
          }

          if (node.children && node.children.length > 0) {
            checkButtons(node.children);
          }
        });
      };

      checkButtons(tree);
      return errors;
    },
  },
];

// Helper function to register custom rules
export class StructureRuleRegistry {
  private rules: StructureRule[] = [...CORE_STRUCTURE_RULES];

  addRule(rule: StructureRule): void {
    this.rules.push(rule);
  }

  removeRule(name: string): boolean {
    const index = this.rules.findIndex((rule) => rule.name === name);
    if (index > -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): StructureRule[] {
    return [...this.rules];
  }

  enableAccessibilityRules(): void {
    this.rules.push(...ACCESSIBILITY_RULES);
  }

  getRuleNames(): string[] {
    return this.rules.map((rule) => rule.name);
  }
}

// Default registry instance
export const defaultRuleRegistry = new StructureRuleRegistry();
