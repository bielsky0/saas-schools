// @ts-ignore
import type { HimalayaAttribute, HimalayaNode } from "himalaya";
import { parse, stringify } from "himalaya";
import {
  camelCase,
  capitalize,
  compact,
  filter,
  find,
  flatMapDeep,
  flatten,
  forEach,
  get,
  has,
  includes,
  isEmpty,
  map,
  set,
  some,
  startCase,
  startsWith,
  trim,
  unset,
} from "lodash-es";
import { STYLES_KEY } from "~/core/constants/STRINGS";
import { cn, generateUUID } from "~/core/functions/common-functions";
import { getVideoURLFromHTML, hasVideoEmbed } from "~/core/import-html/import-video";
import { syncBlocksWithDefaultProps } from "~/runtime";
import { ChaiBlock } from "~/types/common";

const NAME_ATTRIBUTES = ["chai-name", "data-chai-name"];

const ATTRIBUTE_MAP: Record<string, Record<string, string>> = {
  img: { alt: "alt", width: "width", height: "height", src: "image" },
  video: {
    src: "url",
    autoplay: "controls.autoPlay",
    muted: "controls.muted",
    loop: "controls.loop",
    controls: "controls.widgets",
  },
  a: {
    href: "link.href",
    target: "link.target",
    type: "", // @TODO: Detect here what to url, email, phone, elementId
  },
  input: {
    placeholder: "placeholder",
    required: "required",
    type: "inputType",
    name: "fieldName",
  },
  textarea: {
    placeholder: "placeholder",
    required: "required",
    type: "inputType",
    name: "fieldName",
  },
  select: {
    placeholder: "placeholder",
    required: "required",
    multiple: "multiple",
    name: "fieldName",
  },
  form: {
    action: "action",
  },
};

/**
 *
 * @param node
 * @param block
 * @returns Condition add text as content
 */
const shouldAddText = (node: HimalayaNode, block: any) => {
  return (
    node.children?.length === 1 &&
    includes(
      ["Heading", "Paragraph", "Span", "ListItem", "Button", "Label", "TableCell", "Link", "RichText"],
      block._type,
    )
  );
};

/**
 *
 * @param nodes
 * @returns from list of nested nodes extracting only text type content
 */
const getTextContent = (nodes: HimalayaNode[]): string => {
  return nodes
    .map((node) => {
      if (node.type === "text") return get(node, "content", "");
      else if (!isEmpty(node.children)) return getTextContent(node.children || []);
      return "";
    })
    .join("");
};

/**
 *
 * @param value
 * @returns For boolean attributes without content marking true and passing if value is null
 */
const getSanitizedValue = (value: any) => (value === null ? "" : value);

/**
 *
 * @param classString
 * @returns width and height from class string
 */
const getHeightAndWidthFromClass = (classString: string): { width: string; height: string } => {
  const classes = compact(map(classString.split(/\s+/), trim));
  const widthClass = find(classes, (cls) => /^w-/.test(cls));
  const heightClass = find(classes, (cls) => /^h-/.test(cls));

  if (!heightClass || !widthClass) return { height: "", width: "" };

  const extractValue = (cls?: string) => {
    if (!cls) return undefined;
    const match = cls.match(/^[wh]-(?:\[(.*?)\]|(.+))$/);
    if (!match) return undefined;
    if (match[1]) return match[1];

    const val = match[2];
    if (/^\d+(\.\d+)?$/.test(val)) return `${Number(val) * 4}px`;
    if (val === "auto" || includes(val, "%")) return val;
    return "16px";
  };

  const _width = extractValue(widthClass);
  const _height = extractValue(heightClass);

  return {
    width: includes(_width, "px") ? (_width as string) : "16px",
    height: includes(_height, "px") ? (_height as string) : "16px",
  };
};

/**
 *
 * @returns Mapping Attributes as per blocks need from @ATTRIBUTE_MAP and rest passing as it is
 * @param node
 */
const getAttrs = (node: HimalayaNode) => {
  if (node.tagName === "svg") return {};

  const attrs: Record<string, string | { id: string }> & { styles_attrs?: Record<string, string> } = {};
  const replacers = ATTRIBUTE_MAP[node.tagName || ""] || {};
  const attributes: HimalayaAttribute[] = node.attributes || [];

  forEach(attributes, ({ key, value }) => {
    if (includes(NAME_ATTRIBUTES, key)) return;
    if (key === "bid") {
      // Handle bid attribute specially - add as _bid: {id}
      attrs._bid = getSanitizedValue(value);
    }
    if (replacers[key]) {
      // for img tag if the src is not absolute then replace with placeholder image
      if (node.tagName === "img" && key === "src" && !value.startsWith("http")) {
        const width = find(node.attributes, { key: "width" }) as { value: string } | undefined;
        const height = find(node.attributes, { key: "height" }) as { value: string } | undefined;
        if (width && height) {
          value = `https://picsum.photos/${width?.value}x${height?.value}`;
        } else {
          value = `https://picsum.photos/150x150`;
        }
      } else if (node.tagName === "a") {
        // * If importing page with type as pageType, setting attribute
        const href = find(node.attributes, { key: "href" }) as { value: string } | undefined;
        if (href && typeof href?.value === "string" && href?.value?.startsWith("pageType:")) {
          set(attrs, "link.type", "pageType");
        }
      }
      set(attrs, replacers[key], getSanitizedValue(value));
    } else if (!includes(["style", "class", "srcset", "bid"], key)) {
      attrs.styles_attrs = attrs.styles_attrs || {};
      if (startsWith(key, "@")) {
        key = key.replace("@", "x-on:");
      }
      attrs.styles_attrs[`${key}`] = getSanitizedValue(value);
    }
  });

  delete attrs.class;
  return attrs;
};

const getStyles = (node: HimalayaNode, propKey: string = "styles"): Record<string, string> => {
  if (!node.attributes) return { [propKey]: `${STYLES_KEY},` };
  // @ts-ignore
  const classAttr = find(node.attributes, { key: "class" }) as { value: string } | undefined;
  if (classAttr) {
    const styleString = classAttr.value;
    return { [propKey]: `${STYLES_KEY},${styleString}` };
  }
  return { [propKey]: `${STYLES_KEY},` };
};

const getBlockProps = (node: HimalayaNode): Record<string, any> => {
  const attributes = get(node, "attributes", []);
  const isRichText = attributes.find((attr) => attr.key === "data-chai-richtext" || attr.key === "chai-richtext");
  const isLightboxLink = attributes.find((attr) => attr.key === "data-chai-lightbox" || attr.key === "chai-lightbox");

  const isDropdown = attributes.find((attr) => attr.key === "data-chai-dropdown" || attr.key === "chai-dropdown");
  const isDropdownButton = attributes.find(
    (attr) => attr.key === "data-chai-dropdown-button" || attr.key === "chai-dropdown-button",
  );
  const isDropdownContent = attributes.find(
    (attr) => attr.key === "data-chai-dropdown-content" || attr.key === "chai-dropdown-content",
  );

  // Check if element has "rte" class
  const classAttr = attributes.find((attr) => attr.key === "class");
  const hasRteClass = classAttr && classAttr.value.split(/\s+/).includes("rte");

  // Check for special attributes first
  if (isDropdown) {
    return { _type: "Dropdown" };
  }

  if (isDropdownButton) {
    return { _type: "DropdownButton" };
  }

  if (isDropdownContent) {
    return { _type: "DropdownContent" };
  }

  if (isRichText || hasRteClass) {
    return { _type: "Paragraph" };
  }

  if (isLightboxLink) {
    return { _type: "LightBoxLink" };
  }

  // Default block props based on tag
  switch (node.tagName) {
    // self closing tags
    case "img":
      return { _type: "Image" };
    case "input":
      return { _type: "Input", showLabel: false }; // showLabel: hiding default block label
    case "hr":
      return { _type: "Divider" };
    case "br":
      return { _type: "LineBreak" };
    case "textarea":
      return { _type: "TextArea", showLabel: false };
    case "audio":
      return { _type: "Audio" };
    case "canvas":
      return { _type: "Canvas" };
    case "video":
    case "iframe":
      return { _type: "CustomHTML" };
    case "svg":
      return { _type: "Icon" };

    // non self closing tags
    // fixed structure
    case "select":
      return { _type: "Select", options: [] };
    case "option":
      return { _type: "Option" };
    case "ul":
    case "ol":
    case "dl":
      return {
        _type: "List",
        tag: node.tagName,
        _listType: node.tagName === "ol" ? "list-decimal" : "list-none",
      };
    case "li":
    case "dt":
      return { _type: "ListItem", tag: node.tagName };

    // non self closing tags
    // free flow structure
    case "span":
    case "figcaption":
    case "legend":
      return { _type: "Span", tag: node.tagName };
    case "p":
      return { _type: "Paragraph", content: "" };
    case "a":
      return { _type: "Link" };
    case "form":
      return { _type: "Form" };
    case "label":
      return { _type: "Label" };
    case "button":
      return { _type: "Button" };
    case "code":
      return { _type: "Box", _name: "Code" };
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return { _type: "Heading", tag: node.tagName };
    case "table":
      return { _type: "Table" };
    case "tr":
      return { _type: "TableRow" };
    case "td":
    case "th":
      return { _type: "TableCell", tag: node.tagName };
    case "thead":
      return { _type: "TableHead" };
    case "tbody":
      return { _type: "TableBody" };
    case "tfoot":
      return { _type: "TableFooter" };

    default: {
      const type = get(node, "children", []).length > 0 ? "Box" : "EmptyBox";
      return {
        _type: type,
        tag: node.tagName,
        _name: type == "EmptyBox" ? type : node.tagName === "div" ? type : capitalize(node.tagName),
      };
    }
  }
};

/**
 *
 * @param nodes
 * @param parent { block, node }
 * @returns Traversing all nodes one by one and mapping there style, attribute and block type
 */
const traverseNodes = (nodes: HimalayaNode[], parent: any = null): ChaiBlock[] => {
  return flatMapDeep(nodes, (node: HimalayaNode) => {
    // * Ignoring code comment nodes
    if (node.type === "comment") return [];

    // * Generating block id and setting parent id if nested
    let block: Partial<ChaiBlock<any>> = { _id: generateUUID() };
    if (parent) block._parent = parent.block._id;

    /**
     * @handling_textcontent
     * Checking if parent exist
     * If parent has only one children and current node type is text
     * checking does parent block type support content
     * setting parent content to current node text content
     * returning empty node
     */
    if (node.type === "text") {
      if (isEmpty(get(node, "content", ""))) return [] as any;
      if (parent) {
        if (shouldAddText(parent.node, parent.block)) {
          set(parent, "block.content", get(node, "content", ""));
          return [] as ChaiBlock[];
        }
      }
      return { ...block, _type: "Text", content: get(node, "content", "") };
    }

    // * Handle chai- prefixed custom blocks (web components)
    if (startsWith(node.tagName, "chai-")) {
      const attributes: HimalayaAttribute[] = node.attributes || [];
      // Check for chai-type attribute first, otherwise derive from tag name
      const chaiTypeAttr = find(attributes, { key: "chai-type" });
      const blockType =
        chaiTypeAttr?.value ||
        startCase(camelCase(node.tagName || ""))
          .replace(/ /g, "")
          .replace(/\s+/g, "");
      block._type = blockType;
      forEach(attributes, ({ key, value }) => {
        // Skip about-this-component, chai-type, can-move, and can-delete attributes
        if (key === "about-this-component" || key === "chai-type" || key === "can-move" || key === "can-delete") return;

        // Convert id to _id
        if (key === "id") {
          block._id = value;
          return;
        }
        const formattedKey = !startsWith(key, "_") ? camelCase(key) : key;

        // Handle #styles: prefix - convert to #styles:,
        let sanitizedValue = getSanitizedValue(value);
        if (typeof sanitizedValue === "string" && startsWith(sanitizedValue, "#styles:")) {
          sanitizedValue = sanitizedValue.replace("#styles:", "#styles:,");
        }

        // Add all other attributes to block props
        block[formattedKey] = sanitizedValue;
      });

      // Process children if any
      const children = traverseNodes(node.children || [], { block, node });
      return [block, ...children] as ChaiBlock[];
    }

    const styleAttributes: HimalayaAttribute[] = get(node, "attributes", []);
    const isRichText =
      node.tagName === "p" ||
      styleAttributes.find((attr) => attr.key === "data-chai-richtext" || attr.key === "chai-richtext");

    const classAttr = styleAttributes.find((attr) => attr.key === "class");
    const hasRteClass = classAttr && classAttr.value.split(/\s+/).includes("rte");
    const isLightboxLink = styleAttributes.find(
      (attr) => attr.key === "data-chai-lightbox" || attr.key === "chai-lightbox",
    );
    const isDropdown = styleAttributes.find(
      (attr) => attr.key === "data-chai-dropdown" || attr.key === "chai-dropdown",
    );
    const isDropdownButton = styleAttributes.find(
      (attr) => attr.key === "data-chai-dropdown-button" || attr.key === "chai-dropdown-button",
    );
    const isDropdownContent = styleAttributes.find(
      (attr) => attr.key === "data-chai-dropdown-content" || attr.key === "chai-dropdown-content",
    );

    // * Adding default block props, default attrs and default style
    block = {
      ...block,
      ...getBlockProps(node),
      ...getAttrs(node),
      ...getStyles(node),
    };

    // node has a x-name attribute. set the _name of the block to the value of x-name and
    // remove the attribute from the node
    if (node.attributes) {
      const xName = node.attributes.find((attr) => includes(NAME_ATTRIBUTES, attr.key));
      if (xName) {
        block._name = xName.value;
      }
    }

    if (isRichText || hasRteClass) {
      block.content = `<p>${stringify(node.children || [])}</p>`;
      if (has(block, "styles_attrs.data-chai-richtext")) {
        delete block.styles_attrs["data-chai-richtext"];
      }
      if (has(block, "styles_attrs.chai-richtext")) {
        delete block.styles_attrs["chai-richtext"];
      }
      return [block] as ChaiBlock[];
    }

    if (isLightboxLink) {
      const lightboxAttrs = [
        "data-chai-lightbox",
        "chai-lightbox",
        "data-vbtype",
        "data-autoplay",
        "data-maxwidth",
        "data-overlay",
        "data-gall",
        "href",
      ];

      block = {
        ...block,
        href: styleAttributes.find((attr) => attr.key === "href")?.value || "",
        hrefType: styleAttributes.find((attr) => attr.key === "data-vbtype")?.value || "video",
        autoplay: styleAttributes.find((attr) => attr.key === "data-autoplay")?.value === "true" ? "true" : "false",
        maxWidth: styleAttributes.find((attr) => attr.key === "data-maxwidth")?.value?.replace("px", "") || "",
        backdropColor: styleAttributes.find((attr) => attr.key === "data-overlay")?.value || "",
        galleryName: styleAttributes.find((attr) => attr.key === "data-gall")?.value || "",
      };
      forEach(lightboxAttrs, (attr) => {
        if (has(block, `styles_attrs.${attr}`)) {
          delete block.styles_attrs[attr];
        }
      });
    }

    if (isDropdown) {
      delete block.styles_attrs;
      block.showDropdown = false;
    }

    if (isDropdownContent) {
      delete block.styles_attrs;
    }

    if (isDropdownButton) {
      delete block.styles_attrs;

      // Get text content from non-span children more safely
      const textNodes = filter(node.children || [], (child) => child?.tagName !== "span");
      block.content = getTextContent(textNodes);

      // Find span containing SVG more defensively
      const spanWithSvg = find(
        node.children || [],
        (child) =>
          child?.tagName === "span" && some(child.children || [], (grandChild) => grandChild?.tagName === "svg"),
      );

      if (spanWithSvg) {
        const svg = find(spanWithSvg.children || [], (child) => child?.tagName === "svg");
        if (svg) {
          block.icon = stringify([svg]);
          const { height, width } = getSvgDimensions(svg, "16px", "16px");
          block.iconHeight = height;
          block.iconWidth = width;
        }
      }

      return [block] as ChaiBlock[];
    }

    if (block._type === "Input") {
      /**
       * hanlding input tag mapping type to input type
       * setting block _type to non-standard inputs like checkbox, radio, range, file
       */
      const inputType = block.inputType || "text";
      if (inputType === "checkbox") set(block, "_type", "Checkbox");
      else if (inputType === "radio") set(block, "_type", "Radio");
    } else if (node.tagName === "video" || node.tagName === "iframe") {
      const innerHTML = stringify([node]);
      if (hasVideoEmbed(innerHTML)) {
        set(block, "_type", "Video");
        set(block, "url", getVideoURLFromHTML(innerHTML));
        set(block, "styles", `${STYLES_KEY},`);
        set(block, "controls", { autoPlay: false, muted: true, loop: false, controls: false });
      }
      block.content = innerHTML;
      return [block] as ChaiBlock[];
    } else if (node.tagName === "svg") {
      /**
       * handling svg tag
       * if svg tag just pass html stringify content as icon
       */
      const svgClass = get(find(node.attributes, { key: "class" }), "value", "");
      const { height: classHeight, width: classWidth } = getHeightAndWidthFromClass(svgClass);
      if (classHeight && classWidth) {
        block.styles = `${STYLES_KEY}, ${cn(`w-${classWidth} h-${classHeight}`, svgClass)}`.trim();
        block.height = classHeight?.replace("px", "");
        block.width = classWidth?.replace("px", "");
      } else {
        const attrHeight = find(node.attributes, { key: "height" })?.value;
        const attrWidth = find(node.attributes, { key: "width" })?.value;
        if (attrHeight && attrWidth) {
          block.styles = `${STYLES_KEY}, ${cn(`w-[${attrWidth}px] h-[${attrHeight}px]`, svgClass)}`.trim();
          block.height = attrHeight;
          block.width = attrWidth;
        } else {
          block.styles = `${STYLES_KEY}, ${cn(`w-full h-full`, svgClass)}`.trim();
        }
      }

      node.attributes = filter(node.attributes, (attr) => !includes(["style", "width", "height", "class"], attr.key));
      block.icon = stringify([node]);
      return [block] as ChaiBlock[];
    } else if (node.tagName == "option" && parent && parent.block?._type === "Select") {
      /**
       * mapping select options as underscore options
       * for label extracting string from all option child and mapping all attributes
       */
      parent.block.options.push({
        label: getTextContent(node.children || []),
        ...getAttrs(node),
      });
      return [] as any;
    }

    const children = traverseNodes(node.children || [], { block, node });
    return [block, ...children] as ChaiBlock[];
  });
};

const getSvgDimensions = (node: HimalayaNode, defaultWidth: string, defaultHeight: string) => {
  const attributes = get(node, "attributes", []);

  const { height: classHeight, width: classWidth } = getHeightAndWidthFromClass(
    get(find(attributes, { key: "class" }), "value", ""),
  );

  if (classHeight && classWidth) {
    return {
      height: `[${classHeight}px]`,
      width: `[${classWidth}px]`,
    };
  }

  const attrHeight = find(attributes, { key: "height" })?.value;
  const attrWidth = find(attributes, { key: "width" })?.value;

  return {
    height: attrHeight ? `[${attrHeight}px]` : defaultHeight,
    width: attrWidth ? `[${attrWidth}px]` : defaultWidth,
  };
};

/**
 *
 * @param html
 * @returns sanitizing html content
 */
export const getSanitizedHTML = (html: string) => {
  // First, handle the JSON-like structures in attributes
  html = html.replace(/(\w+)=\\?"(.*?)\\?"/g, (_match, attr, value) => {
    // Remove initial escaping
    let cleanValue = value.replace(/\\"/g, '"');

    // Re-escape quotes that are part of JSON structure
    cleanValue = cleanValue.replace(/{([^}]+)}/g, (jsonMatch: string) => {
      return jsonMatch.replace(/"/g, '\\"');
    });

    // Unescape the outer quotes and return
    return `${attr}="${cleanValue.replace(/\\"/g, '"')}"`;
  });

  // Rest of the function remains the same
  html = html
    .replace(/\\n/g, " ")
    .replace(/\\\\/g, "")
    .replace(/\\([/<>])/g, "$1")
    .replace(/\\./g, "")
    .replace(/[\n\r\t\f\v]/g, " ");

  // Remove $name attributes
  html = html.replace(/\$name="[^"]*"/g, "");

  const bodyContent = html.match(/<body[^>]*>[\s\S]*?<\/body>/);
  const htmlContent =
    bodyContent && bodyContent.length > 0
      ? bodyContent[0].replace(/<body/, "<div").replace(/<\/body>/, "</div>")
      : html;

  return htmlContent
    .replace(/\s+/g, " ")
    .replaceAll("> <", "><")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();
};

/**
 * Finds a block by _id in the blocks array
 * @param blocks - Array of blocks to search in
 * @param blockId - The _id to search for
 * @returns The found block or undefined
 */
const findBlockById = (blocks: ChaiBlock[], blockId: string): ChaiBlock | undefined => {
  return find(blocks, { _id: blockId });
};

/**
 * Merges imported blocks with existing blocks based on _id
 * If a block with the same _id exists, merge properties into existing block
 * Otherwise, keep the imported block as is
 * @param importedBlocks - Blocks imported from HTML
 * @param existingBlocks - Current blocks in the store
 * @returns Merged blocks array
 */
export const mergeBlocksWithExisting = (importedBlocks: ChaiBlock[], existingBlocks: ChaiBlock[]): ChaiBlock[] => {
  if (isEmpty(existingBlocks))
    return importedBlocks.map((b) => {
      unset(b, "_bid");
      return b;
    });

  return map(importedBlocks, (importedBlock) => {
    const existingBlock = !isEmpty(importedBlock._bid) ? findBlockById(existingBlocks, importedBlock._bid) : undefined;

    if (existingBlock) {
      // remove icon if it is default icon
      if (existingBlock._type === "Icon" && get(importedBlock, "icon", "").match(/chai-default-svg/)) {
        delete importedBlock.icon;
      }
      // Merge imported block properties into existing block
      const mergedBlock = { ...existingBlock, ...importedBlock };
      unset(mergedBlock, "_bid");
      return mergedBlock;
    }

    // No existing block found, return imported block as is
    unset(importedBlock, "_bid");
    return importedBlock;
  });
};

/**
 *
 * @param html
 * @returns Blocks JSON
 */
export const getBlocksFromHTML = (html: string): ChaiBlock[] => {
  const nodes: HimalayaNode[] = parse(getSanitizedHTML(html));
  if (isEmpty(html)) return [];
  const blocks = flatten(traverseNodes(nodes)) as ChaiBlock[];
  return syncBlocksWithDefaultProps(blocks);
};
