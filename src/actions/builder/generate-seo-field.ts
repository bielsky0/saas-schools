import { generateText } from "ai";
import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

const aiModel = "anthropic/claude-haiku-4.5";

/**
 * Data type for GenerateSeoFieldAction
 */
type GenerateSeoFieldActionData = {
  pageContext: string;
  dynamic: boolean;
  pageContent: string;
  field: "title" | "description" | "ogTitle" | "ogDescription" | "searchTitle" | "searchDescription" | "jsonLD";
  lang: string;
  keyword?: string;
};

const fieldRules = {
  title: "Generate title for the following page. Max length: 60 characters",
  description: "Generate description for the following page. Max length: 160 characters",
  ogTitle: "Generate og title for the following page. Max length: 60 characters",
  ogDescription: "Generate og description for the following page. Max length: 160 characters",
  searchTitle: "Generate search title for the following page. Max length: 60 characters",
  searchDescription: "Generate search description for the following page. Max length: 160 characters",
  jsonLD: "Generate json ld for the following page. Return only json ld",
};

type GenerateSeoFieldActionResponse = {
  field: string;
};

/**
 * Action to generate SEO fields for a page
 */
export class GenerateSeoFieldAction extends ChaiBaseAction<GenerateSeoFieldActionData, GenerateSeoFieldActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.object({
      pageContext: z.string(),
      dynamic: z.boolean(),
      pageContent: z.string(),
      field: z.enum(["title", "description", "ogTitle", "ogDescription", "searchTitle", "searchDescription", "jsonLD"]),
      lang: z.string().nonempty(),
      keyword: z.string().optional(),
    });
  }

  /**
   * Execute the duplicate page action
   */
  async execute(data: GenerateSeoFieldActionData): Promise<GenerateSeoFieldActionResponse> {
    await this.verifyAccess();
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const response = await generateText({
      model: aiModel,
      system: `You are a SEO expert. Follow the instructions carefully. 
      Return plain string values except for json ld. For JSONLD, remove \`\`\`json\`\`\` and \`\`\`\`\` and return only valid JSON.
      Instructions: ${fieldRules[data.field]}
      ${data.keyword ? `Optimize the generated content for "${data.keyword}" keyword(s)` : ""}
      Page Context: ${data.pageContext}
      Page Content: ${data.pageContent}
      Dynamic: ${data.dynamic}
      Language: ${data.lang}`,
      prompt: `${fieldRules[data.field]}
      Page Context: ${data.pageContext}
      Page Content: ${data.pageContent}
      Dynamic: ${data.dynamic}
      Language: ${data.lang}`,
    });
    return { field: response.text };
  }
}
