import { generateText } from "ai";
import "dotenv/config";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

const aiModel = "anthropic/claude-haiku-4.5";

/**
 * Data type for GenerateHtmlFromPromptAction
 */
type GenerateHtmlFromPromptActionData = {
  prompt: string;
  context?: string;
  image?: string; // Base64 encoded image
};

type GenerateHtmlFromPromptActionResponse = {
  html: string;
};

/**
 * Action to generate clean Tailwind CSS HTML from a prompt
 */
export class GenerateHtmlFromPromptAction extends ChaiBaseAction<
  GenerateHtmlFromPromptActionData,
  GenerateHtmlFromPromptActionResponse
> {
  /**
   * Define the validation schema for generate HTML action
   */
  protected getValidationSchema() {
    return z.object({
      prompt: z.string().min(1, "Prompt is required"),
      context: z.string().optional(),
      image: z.string().optional(),
    });
  }

  /**
   * Execute the generate HTML action
   */
  async execute(data: GenerateHtmlFromPromptActionData): Promise<GenerateHtmlFromPromptActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    try {
      const systemPrompt = `You are an expert HTML/CSS developer specializing in Tailwind CSS and shadcn/ui design patterns.

Create pure HTML code only. Make it fully responsive using Tailwind CSS v3 classes exclusively - no custom CSS or classes allowed. Implement container queries (@container) where appropriate for enhanced responsive behavior.

CRITICAL REQUIREMENTS:
1. Return ONLY the HTML code without any markdown formatting, code blocks, or explanations
2. Use ONLY Tailwind CSS v3+ utility classes - absolutely no custom CSS or classes
3. Use shadcn/ui design system theming and styling patterns (neutral colors, proper spacing, modern aesthetics)
4. Apply semantic HTML structure with proper accessibility attributes (ARIA labels, alt texts, proper heading hierarchy)
5. Add \`chai-name\` attributes to ALL wrapper/container elements with descriptive values that match their content purpose
6. Ensure mobile-first responsive design approach
7. Implement container queries using @container classes where appropriate for enhanced responsive behavior
8. Do NOT include <!DOCTYPE>, <html>, <head>, or <body> tags - only the content HTML
9. Use proper contrast ratios for accessibility
10. Keep the code clean, well-structured, and semantic
11. Think about UI randomly. Do not generate the same layout every time.
12. For accordion style ui, use html details and summary tags. eg: accordions, mobile menu etc.

Examples of chai-name usage:
- Navigation wrapper: chai-name="Navigation"
- Links container: chai-name="Nav Links"
- Hero section: chai-name="Hero Section"
- Content wrapper: chai-name="Main Content"
- Footer: chai-name="Site Footer"

HTML Tags (EXTREMELY IMPORTANT):
- for navbar, always create a mobile menu with details and summary tags. Createa proper mobile menu with hamburger icon and  dropdown style menu items.
- for accordion style ui, use html details and summary tags.
- For nested menu, use html details and summary tags with dropdown style menu items.

Shadcn/ui Classes (EXTREMELY IMPORTANT):
- NEVER use hardcoded color classes like bg-blue-500, text-red-600, border-green-400, etc.
- ONLY use shadcn/ui theme color classes that work with CSS variables
- Allowed color classes: bg-background, bg-foreground, bg-card, bg-popover, bg-primary, bg-secondary, bg-muted, bg-accent, bg-destructive
- Text colors: text-foreground, text-muted-foreground, text-primary, text-secondary, text-accent, text-destructive, text-card-foreground, text-popover-foreground, text-primary-foreground, text-secondary-foreground, text-accent-foreground, text-destructive-foreground
- Border colors: border-border, border-input, border-ring, border-primary, border-secondary, border-accent, border-destructive
- DO NOT use dark mode classes (dark:bg-*, dark:text-*, etc.) - we handle dark mode via CSS variables
- For neutral backgrounds use: bg-background, bg-card, bg-muted
- For text use: text-foreground, text-muted-foreground
- For interactive elements use: bg-primary, text-primary-foreground, hover:bg-primary/90
- For borders use: border-border, border-input

IMAGE USAGE RULES:
- Use royalty-free images from Unsplash or picsum photos
- Choose images that are relevant to the content context
- Always include descriptive alt text for accessibility
- Use appropriate image dimensions (e.g., w=1200 for hero images, w=800 for cards, w=400 for thumbnails)
- Always include explicit width and height HTML attributes on every <img> tag matching the image dimensions
  Example: \`<img src="https://domain/hero/1200/600" alt="Hero image" width="1200" height="600">\`
The final output should be clean, semantic HTML that works across all devices and screen sizes.

${data.context ? `Additional Context: ${data.context}` : ""}`;

      // Use Vercel AI SDK's message format
      const response = data.image
        ? await generateText({
            model: aiModel,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: data.prompt,
                  },
                  {
                    type: "image",
                    image: data.image,
                  },
                ],
              },
            ],
            temperature: 0.7,
          })
        : await generateText({
            model: aiModel,
            system: systemPrompt,
            prompt: data.prompt,
            temperature: 0.7,
          });

      // Clean up the response to remove any markdown code blocks if present
      let html = response.text.trim();

      // Remove markdown code blocks if they exist
      html = html.replace(/^```html\n?/i, "");
      html = html.replace(/^```\n?/, "");
      html = html.replace(/\n?```$/, "");
      html = html.trim();

      return { html };
    } catch (error) {
      console.log("error", error);
      this.handleError(error);
    }
  }
}
