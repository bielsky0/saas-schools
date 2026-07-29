import { z } from "zod";
import { ChaiAIChatHandler } from "~/actions/classes/chai-ai-chat-handler";
import { logAiRequest, logAiRequestError } from "~/actions/utils/log-ai-request";
import { AIContext } from "~/types";
import { ChaiBaseAction } from "./base-action";

type AskAIActionData = {
  messages?: Array<{
    role: "user" | "assistant" | "system";
    content: string | Array<{ type: string; text?: string; image?: string }>;
  }>;
  model?: string;
  image?: string;
  type?: "styles" | "content";
  prompt?: string;
  blocks?: any[];
  context?: AIContext;
  lang?: string;
  initiator?: string;
};

/**
 * Action to handle ASK_AI requests with streaming support
 */
export class AskAIAction extends ChaiBaseAction<AskAIActionData, any> {
  protected getValidationSchema() {
    // Use flexible validation since ASK_AI can receive different data formats
    return z.any() as any;
  }

  async execute(data: AskAIActionData): Promise<any> {
    if (!this.context) {
      throw new Error("Context not set");
    }

    const startTime = new Date().getTime();
    const { userId, appId } = this.context;

    const ai = new ChaiAIChatHandler({
      //@ts-ignore
      onFinish: (arg: any) => {
        try {
          logAiRequest({
            arg,
            prompt: (data.messages?.[data.messages.length - 1]?.content as string) || "",
            userId: userId!,
            model: data.model || "",
            startTime,
            appId,
          });
        } catch (e) {
          console.error("Error logging AI request:", e);
        }
      },
      onError: (error) => {
        try {
          logAiRequestError({
            error,
            userId: userId!,
            startTime: startTime,
            model: data.model || "",
            prompt: (data.messages?.[data.messages.length - 1]?.content as string) || "",
            appId,
          });
        } catch (e) {
          console.error("Error logging AI request error:", e);
        }
      },
    });

    // Prepare request options matching AIChatOptions type
    const requestOptions = {
      messages: data.messages || [],
      image: data.image,
      model: data.model,
      initiator: data.initiator || null,
      context: data.context,
    };

    const result = await ai.handleRequest(requestOptions);

    // Return a special marker for streaming
    return {
      _streamingResponse: true,
      _streamResult: result,
    };
  }
}
