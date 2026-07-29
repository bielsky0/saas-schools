import { parse, stringify } from "himalaya";
import { kebabCase } from "lodash-es";
import { useCallback } from "react";
import { getCurrentBlocks } from "~/atoms/store";
import { canAddChildBlock } from "~/core/functions/block-helpers";
import { useCanvasIframe } from "~/hooks/use-canvas-iframe";
import { getRegisteredChaiBlock } from "~/runtime";
import { ChaiBlock } from "~/types/common";

export type HimalayaNode = {
  type: "element" | "text" | "comment";
  tagName?: string;
  attributes?: Array<{ key: string; value: string }>;
  children?: HimalayaNode[];
  content?: string;
};

type Options = {
  blockId?: string;
  additionalCoreBlocks?: string[];
};

const ATTRIBUTES_TO_REMOVE = [
  "data-block-index",
  "draggable",
  "data-drop",
  "data-style-id",
  "data-block-parent",
  "data-style-prop",
  "data-highlighted",
];

const CORE_BLOCKS = [
  "Box",
  "Button",
  "Checkbox",
  "Divider",
  "EmptyBox",
  "Form",
  "FormButton",
  "Heading",
  "Image",
  "Input",
  "Label",
  "LineBreak",
  "Link",
  "List",
  "ListItem",
  "Paragraph",
  "Radio",
  "RichText",
  "Select",
  "Span",
  "Text",
  "TextArea",
  "Video",
];

const cleanNode = (node: HimalayaNode): HimalayaNode | null => {
  // Remove script, style, and link tags
  if (node.type === "element" && ["script", "style", "link"].includes(node.tagName || "")) {
    return null;
  }

  if (node.type === "comment") {
    return null;
  }

  // Keep text and comment nodes as is
  if (node.type === "text") {
    return node;
  }

  // if id is add-block-bottom, remove it
  if (
    node.type === "element" &&
    node.attributes &&
    node.attributes.find((attr) => attr.key === "id" && attr.value === "add-block-bottom")
  ) {
    return null;
  }

  // Clean attributes for element nodes
  if (node.type === "element" && node.attributes) {
    node.attributes = node.attributes.filter((attr) => !ATTRIBUTES_TO_REMOVE.includes(attr.key));
  }

  // Recursively clean children
  if (node.children) {
    node.children = node.children.map(cleanNode).filter((child): child is HimalayaNode => child !== null);
  }

  return node;
};

export const transformNode = (node: HimalayaNode, currentBlocks: ChaiBlock[], options: Options = {}): HimalayaNode => {
  // Only process element nodes
  if (node.type !== "element" || !node.attributes) {
    return node;
  }

  // Convert span with role="link" to anchor tag
  if (node.tagName === "span") {
    const roleAttr = node.attributes.find((attr) => attr.key === "role" && attr.value === "link");
    if (roleAttr) {
      node.tagName = "a";
      // Remove the role attribute
      node.attributes = node.attributes.filter((attr) => attr.key !== "role");

      // Adding link config
      const blockId = node.attributes.find((attr) => attr.key === "data-block-id")?.value;
      const linkBlock = currentBlocks?.find((block) => block?._id === blockId);
      if (linkBlock?.link && linkBlock?.link?.href?.length > 0) {
        const href = linkBlock?.link?.href;
        const target = linkBlock?.link?.target;
        node.attributes.push({ key: "href", value: href });
        if (typeof target === "string" && target.length > 0) {
          node.attributes.push({ key: "target", value: target });
        }
      }
    }
  }

  // Find data-block-type attribute
  const blockTypeAttr = node.attributes.find((attr) => attr.key === "data-block-type");
  const blockIdAttr = node.attributes.find((attr) => attr.key === "data-block-id");

  if (blockTypeAttr) {
    const blockType = blockTypeAttr.value;

    if (CORE_BLOCKS.includes(blockType) || options?.additionalCoreBlocks?.includes(blockType)) {
      // For core blocks, just remove the data-block-type attribute
      node.attributes = node.attributes.filter((attr) => attr.key !== "data-block-type");

      // Recursively transform children for core blocks
      if (node.children) {
        node.children = node.children.map((node) => transformNode(node, currentBlocks, options));
      }
    } else {
      // For custom blocks, convert to web component style tag
      const customTagName = `chai-${kebabCase(blockType)}`;

      // Create new node with custom tag name
      node.tagName = customTagName;

      // Keep only the id attribute (from data-block-id)
      node.attributes = [];
      node.attributes.push({ key: "chai-type", value: blockType });

      // Get the block from currentBlocks and add the keys as attributes.
      // omit, _id, _type, _parent, _index _name keys
      const blockDefinition = getRegisteredChaiBlock(blockType);
      const block = currentBlocks.find((block) => block._id === blockIdAttr?.value);
      if (block) {
        node.attributes.push(
          ...Object.entries(block)
            .filter(([key]) => !["_id", "_type", "_parent", "_index", "_name"].includes(key))
            .map(([key, value]) => ({
              key,
              value: typeof value === "string" ? value : JSON.stringify(value),
            })),
        );
      }
      if (blockDefinition && blockDefinition?.description) {
        node.attributes.push({
          key: "about-this-component",
          value: blockDefinition.description,
        });
      }

      // Add can-move and can-delete attributes based on block definition
      if (blockDefinition) {
        if (blockDefinition.canMove) {
          const canMove =
            typeof blockDefinition.canMove === "function" ? blockDefinition.canMove() : blockDefinition.canMove;
          node.attributes.push({
            key: "can-move",
            value: String(canMove),
          });
        }
        if (blockDefinition.canDelete) {
          const canDelete =
            typeof blockDefinition.canDelete === "function" ? blockDefinition.canDelete() : blockDefinition.canDelete;
          node.attributes.push({
            key: "can-delete",
            value: String(canDelete),
          });
        }
      }

      //specially for icon block, empty the icon attr
      if (blockType === "Icon") {
        node.attributes = node.attributes.filter((attr) => attr.key !== "icon");
      }

      // Check if custom block can accept children using the helper function
      // This properly checks if canAcceptBlock is defined in the block definition
      if (canAddChildBlock(blockType)) {
        // Custom block can accept children, so recursively transform them
        if (node.children) {
          node.children = node.children.map((child) => transformNode(child, currentBlocks, options));
        }
      } else {
        // Remove all children for custom blocks that don't accept children
        node.children = [];
      }
    }
  } else {
    // For nodes without data-block-type, recursively transform children
    if (node.children) {
      node.children = node.children.map((node) => transformNode(node, currentBlocks, options));
    }
  }

  //remove data-block-type and data-block-id attributes
  // Convert data-block-id to bid before removing
  if (blockIdAttr) {
    node.attributes.push({ key: "bid", value: blockIdAttr.value });
  }
  node.attributes = node.attributes.filter((attr) => attr.key !== "data-block-type" && attr.key !== "data-block-id");

  return node;
};

export const useBlocksHtmlForAi = () => {
  const [iframeDocument] = useCanvasIframe();
  return useCallback(
    (options?: Options) => {
      if (!iframeDocument) return "";
      const id = options?.blockId ? `[data-block-id="${options.blockId}"]` : "#canvas";
      const html = (iframeDocument as HTMLIFrameElement).contentDocument?.querySelector(id)?.[
        id === "#canvas" ? "innerHTML" : "outerHTML"
      ];
      if (!html) return "";

      // Parse HTML into AST
      const nodes = parse(html) as HimalayaNode[];

      // Clean nodes
      const cleanedNodes = nodes.map(cleanNode).filter((node): node is HimalayaNode => node !== null);

      // * Getting current blocks`
      const currentBlocks = getCurrentBlocks();

      // Transform nodes: remove data-block-type for core blocks, convert custom blocks to web components
      const transformedNodes = cleanedNodes.map((node) => transformNode(node, currentBlocks, options));

      // Convert back to HTML and normalize whitespace
      let cleanedHtml = stringify(transformedNodes);

      // Convert empty custom web component tags to self-closing format
      cleanedHtml = cleanedHtml.replace(/#styles:,/g, "#styles:");

      return cleanedHtml.replace(/\s+/g, " ").trim();
    },
    [iframeDocument],
  );
};
