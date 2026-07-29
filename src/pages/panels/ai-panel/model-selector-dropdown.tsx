"use client";

import { Cpu } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "~/pages/components/ai-elements/model-selector";
import { AIModel, useAIModels } from "./ai-models-context";

interface ModelSelectorDropdownProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelectorDropdown = ({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorDropdownProps) => {
  const [open, setOpen] = useState(false);
  const { models } = useAIModels();

  const currentModel = models.find((model) => model.id === selectedModel) || models[0];

  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, AIModel[]>,
  );

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setOpen(false);
  };

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-8 gap-1 px-2 text-xs">
          <Cpu size={14} />
          <span className="max-w-20 truncate">{currentModel.name}</span>
        </Button>
      </ModelSelectorTrigger>

      <ModelSelectorContent className="w-96 p-0">
        <h3 className="mt-2 px-2 py-2 font-semibold">Models</h3>
        <ModelSelectorList>
          {Object.entries(groupedModels).map(([provider, models]) => (
            <ModelSelectorGroup key={provider} heading={provider.charAt(0).toUpperCase() + provider.slice(1)}>
              {models.map((model) => (
                <ModelSelectorItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => handleModelSelect(model.id)}
                  className="flex cursor-pointer items-center gap-2 p-2">
                  <ModelSelectorLogo provider={model.provider} />
                  <div className="flex flex-1 items-center justify-between">
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                  {selectedModel === model.id && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
