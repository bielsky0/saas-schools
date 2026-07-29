"use client";

import { Plus } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { useLanguages } from "~/hooks/use-languages";
import { useBuilderFetch } from "~/pages/hooks/utils/use-fetch";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { AIContext } from "~/types";
import {
  AICompleteCallback,
  AIConfig,
  AIConfigProvider,
  AIErrorCallback,
  AIEvent,
  AIModel,
  AISuccessCallback,
} from "./ai-models-context";
import { Message } from "./ai-panel-helper";
import { getDefaultModel } from "./models";

const AiPanelForDefaultLang = lazy(() => import("./ai-panel-default-lang"));
const AiPanelForOtherLang = lazy(() => import("./ai-panel-other-lang"));

export interface AiPanelContentProps {
  models?: AIModel[];
  onAIEvent?: (event: AIEvent) => void;
  onSuccess?: (data: AISuccessCallback) => void;
  onError?: (data: AIErrorCallback) => void;
  onComplete?: (data: AICompleteCallback) => void;
  context?: AIContext;
  [key: string]: any;
}

// Main AI Panel Component
const AiPanelContentInner = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [currentBlock, setCurrentBlock] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);
  const { selectedLang, fallbackLang } = useLanguages();
  const fetch = useBuilderFetch();
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page");

  const suggestNewConversation = messages?.filter((m) => m.role === "user").length >= 4;
  const forceNewConversation = messages?.filter((m) => m.role === "user").length >= 10;

  useEffect(() => {
    setMessages([]);
  }, [selectedLang, page]);

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setCurrentBlock(null);
    setAbortController(null);
    setIsLoading(false);
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
    setInput("");
    setCurrentBlock(null);

    // Remove the last incomplete reasoning message if it exists
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === "assistant" && lastMessage.isReasoning && lastMessage.isStreaming) {
        return prev.slice(0, -1);
      }
      return prev;
    });

    toast.info(t("Generation stopped"));
  };

  const commonProps = {
    t,
    fetch,
    input,
    messages,
    setInput,
    isLoading,
    handleStop,
    handleReset,
    setMessages,
    setIsLoading,
    currentBlock,
    fallbackLang,
    abortController,
    setCurrentBlock,
    setAbortController,
    forceNewConversation,
    suggestNewConversation,
    selectedModel,
    onModelChange: setSelectedModel,
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 left-0 top-0 z-40 flex h-screen w-screen flex-col items-center justify-center bg-transparent" />
      )}
      <div className="flex h-full w-full flex-col">
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-gray-500">{t("Generate with AI")}</p>
          {messages?.length > 0 && (
            <Button variant="outline" size="icon" onClick={handleReset} className="h-6 w-6" disabled={isLoading}>
              <Plus />
            </Button>
          )}
        </div>
        <Suspense
          fallback={<div className="flex h-full w-full items-center justify-center text-xs">Loading AI Panel</div>}>
          {selectedLang ? (
            <AiPanelForOtherLang {...commonProps} selectedLang={selectedLang} />
          ) : (
            <AiPanelForDefaultLang {...commonProps} />
          )}
        </Suspense>
      </div>
    </>
  );
};

export const AiPanelContent = ({
  models,
  onAIEvent,
  onSuccess,
  onError,
  onComplete,
  context,
  ...rest
}: AiPanelContentProps) => {
  const config: Partial<AIConfig> = {
    models,
    onAIEvent,
    onSuccess,
    onError,
    onComplete,
    context,
    ...rest,
  };

  return (
    <AIConfigProvider config={config}>
      <AiPanelContentInner />
    </AIConfigProvider>
  );
};

export default AiPanelContent;
