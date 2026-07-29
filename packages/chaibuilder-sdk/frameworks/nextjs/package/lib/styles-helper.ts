import fs from "fs/promises";
import path from "path";
import postcss from "postcss";

async function findTailwindCssFile(): Promise<string> {
  // Use absolute path for production to work on Vercel
  return path.resolve("./public/chaistyles.css");
}

export async function filterDuplicateStyles(newStyles: string): Promise<string> {
  try {
    const tailwindCssPath = await findTailwindCssFile();
    const tailwindCss = await fs.readFile(tailwindCssPath, "utf-8");

    const tailwindRoot = postcss.parse(tailwindCss);
    const newStylesRoot = postcss.parse(newStyles);

    const tailwindSelectors = new Set<string>();
    tailwindRoot.walkRules((rule) => {
      tailwindSelectors.add(rule.selector);
    });

    newStylesRoot.walkRules((rule) => {
      // Check if the rule has a parent and if it's a media query (breakpoint)
      const hasBreakpoint = rule.parent?.type === "atrule" && "name" in rule.parent && rule.parent.name === "media";

      // Only remove the rule if it's in tailwindSelectors and doesn't have a breakpoint
      if (tailwindSelectors.has(rule.selector) && !hasBreakpoint) {
        rule.remove();
      }
    });

    return newStylesRoot.toString();
  } catch (error) {
    console.error("Error filtering styles:", error);
    return newStyles;
  }
}
