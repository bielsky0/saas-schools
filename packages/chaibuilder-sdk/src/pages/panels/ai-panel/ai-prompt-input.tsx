"use client";

import { GlobeIcon, Paperclip, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "~/pages/components/ai-elements/prompt-input";
import { ChaiBlock } from "~/types/common";
import { useAIModels } from "./ai-models-context";
import { getDefaultModel } from "./models";
import { ModelSelectorDropdown } from "./model-selector-dropdown";

const MODEL_STORAGE_KEY = "chai-ai-selected-model";

interface AiPromptInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (prompt: string, label?: string, image?: string, model?: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  currentBlock?: ChaiBlock;
  selectedLang?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

// AI Prompt Input Component
const AiPromptInput = ({
  input,
  setInput,
  onSend,
  onStop,
  isLoading,
  disabled,
  selectedLang,
  selectedModel: propSelectedModel,
  onModelChange,
}: AiPromptInputProps) => {
  const { t } = useTranslation();
  const { models } = useAIModels();
  const defaultModel = models.find((model) => model.id === getDefaultModel().id) || models[0];
  const [selectedModel, setSelectedModel] = useState(propSelectedModel || defaultModel.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);

  // Load saved model from localStorage on mount
  useEffect(() => {
    if (!selectedLang) {
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      if (savedModel && models.find((m) => m.id === savedModel)) {
        setSelectedModel(savedModel);
        onModelChange?.(savedModel);
      } else {
        // Clear stale/invalid saved model and use default
        if (savedModel) localStorage.removeItem(MODEL_STORAGE_KEY);
        setSelectedModel(defaultModel.id);
        onModelChange?.(defaultModel.id);
      }
    }
  }, [selectedLang, onModelChange, defaultModel.id, models]);

  const handleSubmit = (message: { text: string; files: any[] }) => {
    const imageFile = message.files.find((file) => file.mediaType?.startsWith("image/"));
    const imageData = imageFile?.url || selectedImage;

    onSend(message.text?.trim(), undefined, imageData, selectedModel);
    setSelectedImage(null);
  };

  return (
    <div className="relative">
      <div className={`border-gray-20 rounded-lg border`}>
        <PromptInput onSubmit={handleSubmit} accept="image/*" className="flex h-auto w-full flex-col">
          <PromptInputHeader className="p-0">
            <PromptInputAttachments className="pb-0">
              {(attachment) => <PromptInputAttachment className="text-xs" data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>

          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedLang ? t("Ask to update content") : t("Ask me anything...")}
            disabled={isLoading}
            className="max-h-[200px] min-h-[60px] w-full"
            rows={3}
          />

          <PromptInputFooter>
            {!selectedLang ? (
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger disabled={isLoading}>
                    <Paperclip size={16} />
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputSpeechButton
                  textareaRef={textareaRef}
                  onTranscriptionChange={setInput}
                  disabled={isLoading}
                />
                <ModelSelectorDropdown
                  selectedModel={selectedModel}
                  onModelChange={(model) => {
                    setSelectedModel(model);
                    onModelChange?.(model);
                    localStorage.setItem(MODEL_STORAGE_KEY, model);
                  }}
                  disabled={isLoading}
                />
                <PromptInputButton
                  className="hidden"
                  size="sm"
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  variant={useWebSearch ? "default" : "ghost"}>
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
              </PromptInputTools>
            ) : (
              <div />
            )}

            {isLoading ? (
              <button
                onClick={onStop}
                className="z-50 flex items-center gap-x-1 rounded-md bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
                title={t("Stop generation")}>
                <Square size={16} />
              </button>
            ) : (
              <PromptInputSubmit disabled={!input.trim() || disabled}>
                <Send size={16} />
              </PromptInputSubmit>
            )}
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default AiPromptInput;
