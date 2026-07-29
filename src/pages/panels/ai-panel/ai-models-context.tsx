"use client";

import { createContext, ReactNode, useContext } from "react";
import { AIContext } from "~/types";
import { AI_MODELS } from "./models";

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  multiplier: number;
};

export type AICompletionEvent = {
  type: "completion";
  content: string;
  model: string;
  timestamp: number;
};

export type AIErrorEvent = {
  type: "error";
  error: Error | string;
  model?: string;
  timestamp: number;
};

export type AIStreamStartEvent = {
  type: "stream_start";
  model: string;
  timestamp: number;
};

export type AIEvent = AICompletionEvent | AIErrorEvent | AIStreamStartEvent;

export type AISuccessCallback = {
  content: string;
  model: string;
  timestamp: number;
};

export type AIErrorCallback = {
  error: Error | string;
  model: string;
  timestamp: number;
};

export type AICompleteCallback = {
  success: boolean;
  content?: string;
  error?: Error | string;
  model: string;
  timestamp: number;
};

export interface AIConfig {
  models: AIModel[];
  onAIEvent?: (event: AIEvent) => void;
  onSuccess?: (data: AISuccessCallback) => void;
  onError?: (data: AIErrorCallback) => void;
  onComplete?: (data: AICompleteCallback) => void;
  context?: AIContext;
  [key: string]: any;
}

const AIConfigContext = createContext<AIConfig | undefined>(undefined);

interface AIConfigProviderProps {
  children: ReactNode;
  config?: Partial<AIConfig>;
}

export const AIConfigProvider = ({ children, config }: AIConfigProviderProps) => {
  const mergedConfig: AIConfig = {
    ...config,
    models: config?.models || AI_MODELS,
  };

  return <AIConfigContext.Provider value={mergedConfig}>{children}</AIConfigContext.Provider>;
};

export const useAIConfig = () => {
  const config = useContext(AIConfigContext);
  if (config === undefined) {
    throw new Error("useAIConfig must be used within AIConfigProvider");
  }
  return config;
};

export const useAIModels = () => {
  const config = useAIConfig();
  return { models: config.models };
};
