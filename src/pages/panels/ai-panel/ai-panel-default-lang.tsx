"use client";

import { Bot } from "lucide-react";
import { Fragment, lazy, startTransition, Suspense } from "react";
import { toast } from "sonner";
import { useBlocksHtmlForAi } from "~/hooks/use-blocks-html-for-ai";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "~/pages/components/ai-elements/conversation";
import { Message as AiMessage, MessageContent, MessageResponse } from "~/pages/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "~/pages/components/ai-elements/reasoning";
import { TaskMessage } from "~/pages/components/ai-elements/task-message";
import { ChaiBlock } from "~/types/common";
import { useAIConfig, useAIModels } from "./ai-models-context";
import { Message } from "./ai-panel-helper";
import { getDefaultModel } from "./models";
import { getUserPrompt } from "./prompt-helper";
import { SelectedBlockDisplay } from "./selected-block-display";
import { useProcessAiStream } from "./use-process-ai-stream";

const AiPromptInput = lazy(() => import("./ai-prompt-input"));

interface AiPanelForDefaultLangProps {
  t: any;
  fetch: any;
  input: string;
  isLoading: boolean;
  messages: Message[];
  fallbackLang: string;
  handleStop: () => void;
  handleReset: () => void;
  forceNewConversation: boolean;
  currentBlock: ChaiBlock | null;
  suggestNewConversation: boolean;
  setInput: (value: string) => void;
  abortController: AbortController | null;
  setIsLoading: (loading: boolean) => void;
  setCurrentBlock: (block: ChaiBlock | null) => void;
  setAbortController: (controller: AbortController | null) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

const AiPanelForDefaultLang = ({
  t,
  fetch,
  input,
  messages,
  setInput,
  isLoading,
  setMessages,
  handleStop,
  setIsLoading,
  currentBlock,
  fallbackLang,
  setCurrentBlock,
  setAbortController,
  selectedModel,
  onModelChange,
}: AiPanelForDefaultLangProps) => {
  const { models } = useAIModels();
  const config = useAIConfig();
  const defaultModel = models.find((model) => model.id === getDefaultModel().id) || models[0];
  const currentSelectedModel = selectedModel || defaultModel.id;

  const selectedBlock = useSelectedBlock();
  const [, setSelectedBlockIds] = useSelectedBlockIds();
  const blocksHtmlForAi = useBlocksHtmlForAi();

  const processAiStream = useProcessAiStream();
  const handleSend = async (prompt: string, content?: string, image?: string, model?: string) => {
    if (!prompt || isLoading) return;

    setCurrentBlock(selectedBlock as ChaiBlock);
    const html = selectedBlock
      ? blocksHtmlForAi({ blockId: selectedBlock._id, additionalCoreBlocks: ["Icon"] })
      : blocksHtmlForAi({ additionalCoreBlocks: ["Icon"] });

    if (selectedBlock && !html) {
      toast.error(t("Something went wrong. Please try again."));
      return;
    }

    const userMessageObj: Message = {
      id: Date.now().toString(),
      role: "user",
      content: getUserPrompt({
        language: fallbackLang,
        userInput: content || prompt,
        currentHtml: html,
      }),
      userMessage: prompt,
    };

    const reasoningMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      isReasoning: true,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessageObj, reasoningMessage]);
    setIsLoading(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    const usedModel = model || currentSelectedModel;

    // Trigger stream start event
    config.onAIEvent?.({ type: "stream_start", model: usedModel, timestamp: Date.now() });

    try {
      // Send conversation history so the AI has context from prior turns.
      // Cap at last 10 messages to avoid exceeding token/payload limits.
      const MAX_HISTORY = 10;
      const conversationMessages = [...messages, userMessageObj]
        .filter((m) => !m.isReasoning && !m.isTask && (m.role === "user" || m.role === "assistant"))
        .slice(-MAX_HISTORY)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const requestBody: any = {
        messages: conversationMessages,
        model: model || currentSelectedModel,
        context: config.context,
      };

      // Add image to request if provided
      if (image) {
        requestBody.image = image;
      }

      const response = await fetch({
        body: { action: "ASK_AI", data: requestBody },
        streamResponse: true,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(t("Failed to get AI response"));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error(t("Response body is not readable"));
      await processAiStream(reader, setMessages);

      // Capture the AI response and trigger callbacks after stream completes
      setMessages((prev) => {
        // Get the last assistant message after streaming completes
        startTransition(() => {
          const assistantMessages = prev.filter((m) => m.role === "assistant" && !m.isReasoning && !m.isTask);
          const lastResponse = assistantMessages[assistantMessages.length - 1]?.content || "";
          const timestamp = Date.now();

          // Trigger success callbacks with actual AI response
          config.onSuccess?.({ content: lastResponse, model: usedModel, timestamp });
          config.onComplete?.({ success: true, content: lastResponse, model: usedModel, timestamp });
          config.onAIEvent?.({
            type: "completion",
            content: lastResponse,
            model: usedModel,
            timestamp,
          });
        });

        return prev;
      });
    } catch (error: any) {
      // Don't show error message if request was aborted
      if (error.name !== "AbortError") {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t("Sorry, I encountered an error. Please try again."),
        };
        setMessages((prev) => [...prev, errorMessage]);

        // Trigger error callbacks with actual error message (non-urgent update)
        startTransition(() => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const timestamp = Date.now();

          config.onError?.({ error: errorMsg, model: usedModel, timestamp });
          config.onComplete?.({ success: false, error: errorMsg, model: usedModel, timestamp });
          config.onAIEvent?.({ type: "error", error: errorMsg, model: usedModel, timestamp });
        });
      }
    } finally {
      setInput("");
      setIsLoading(false);
      setCurrentBlock(null);
      setAbortController(null);
    }
  };

  return (
    <>
      <Conversation className="no-scrollbar">
        <ConversationContent className="gap-2 px-0">
          {messages.length === 0 && (
            <ConversationEmptyState
              icon={<Bot size={48} className="text-gray-300" />}
              title="Start a conversation"
              description={t("Start a conversation with the AI assistant to add/edit current page")}
            />
          )}
          {messages.map(
            (message) =>
              message.role !== "system" && (
                <Fragment key={message.id}>
                  {message.isReasoning ? (
                    <Reasoning isStreaming={message.isStreaming} defaultOpen={true}>
                      <ReasoningTrigger className="text-xs [&_p]:text-muted-foreground" />
                      <ReasoningContent className="p-0 text-xs">{message.content}</ReasoningContent>
                    </Reasoning>
                  ) : message.isTask && !message.isTaskCompleted ? (
                    <TaskMessage content={message.content} isLoading={message.isTaskLoading} />
                  ) : (
                    <AiMessage from={message.role}>
                      <MessageContent className="p-0">
                        {message.role === "assistant" ? (
                          <MessageResponse className="p-0 text-xs">{message.content}</MessageResponse>
                        ) : (
                          <div className="p-0 text-xs">{message.userMessage || message.content}</div>
                        )}
                      </MessageContent>
                    </AiMessage>
                  )}
                </Fragment>
              ),
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className={`border-gray-200 pb-2`}>
        <SelectedBlockDisplay onRemove={() => setSelectedBlockIds([])} isLoading={isLoading} />
        <Suspense fallback={<div>Loading...</div>}>
          <AiPromptInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={handleStop}
            isLoading={isLoading}
            selectedLang=""
            currentBlock={(selectedBlock || currentBlock) as ChaiBlock}
            disabled={input?.length === 0}
            selectedModel={currentSelectedModel}
            onModelChange={onModelChange}
          />
        </Suspense>
      </div>
    </>
  );
};

export default AiPanelForDefaultLang;
