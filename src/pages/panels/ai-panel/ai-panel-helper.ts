export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  id: string;
  userMessage?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  isTask?: boolean;
  isTaskLoading?: boolean;
  isTaskCompleted?: boolean;
}

export const CORE_BLOCKS = [
  "Box",
  "Button",
  "Heading",
  "Paragraph",
  "Text",
  "Span",
  "Link",
  "Image",
  "Video",
  "Icon",
  "List",
  "ListItem",
  "Row",
  "Column",
  "Form",
  "Input",
  "FormButton",
  "Checkbox",
  "Radio",
  "Select",
  "TextArea",
  "Label",
  "RichText",
  "Divider",
  "EmptyBox",
  "LineBreak",
  "Table",
  "EmptySlot",
];

/**
 * Extract HTML from AI response, removing any markdown code blocks if present
 */
export function extractHtmlFromResponse(input: string): string {
  if (!input) return "";

  let html = input.trim();

  // Remove markdown code blocks if they exist
  html = html.replace(/^```html\n?/i, "");
  html = html.replace(/^```\n?/, "");
  html = html.replace(/\n?```$/, "");
  html = html.trim();

  return html;
}

/**
 * Clean and validate HTML response
 */
export function cleanHtmlResponse(html: string): string {
  if (!html) return "";

  // Extract HTML from response
  const cleanedHtml = extractHtmlFromResponse(html);

  // Basic validation - ensure it's not empty and contains some HTML-like content
  if (cleanedHtml.length === 0) return "";
  if (!cleanedHtml.includes("<") || !cleanedHtml.includes(">")) return "";

  return cleanedHtml;
}

export const getBlockElement = (blockId: string): HTMLElement | null => {
  const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
  if (!iframeDoc) return null;
  const iframeDocument = iframeDoc?.contentDocument;
  if (!iframeDocument) return null;
  const block = iframeDocument.querySelector(`[data-block-id="${blockId}"]`);
  if (!block) return null;
  if (blockId === "canvas") {
    const newElement = iframeDocument.createElement("div");
    newElement.style.height = "100vh";
    block.appendChild(newElement);
    return newElement;
  }
  return block as HTMLElement;
};
