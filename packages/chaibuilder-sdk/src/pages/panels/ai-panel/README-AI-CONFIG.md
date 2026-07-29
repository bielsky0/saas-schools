# AI Configuration Context

## Overview

The AI panel now uses a generic, reusable configuration context instead of hardcoded AI models. This allows you to pass custom models and other configuration options from the `AiPanelContent` component.

## Usage

### Basic Usage (with default models)

```tsx
import { AiPanelContent } from "./ai-panel-content";

// Uses default hardcoded models
<AiPanelContent />;
```

### Custom Models

```tsx
import { AiPanelContent } from "./ai-panel-content";

const customModels = [
  {
    id: "custom/model-1",
    name: "Custom Model 1",
    provider: "custom",
    description: "1x Credits",
    multiplier: 1,
  },
  // ... more models
];

<AiPanelContent models={customModels} />;
```

### Event Callbacks

Listen to AI completion and error events:

```tsx
<AiPanelContent
  models={customModels}
  onSuccess={({ content, model, timestamp }) => {
    console.log(`AI succeeded using ${model}:`, content);
    console.log("Timestamp:", new Date(timestamp).toISOString());
    // Track analytics, show notifications, etc.
  }}
  onError={({ error, model, timestamp }) => {
    console.error(`AI error with ${model}:`, error);
    console.log("Error timestamp:", new Date(timestamp).toISOString());
    // Log errors, show user feedback, etc.
  }}
  onComplete={({ success, content, error, model, timestamp }) => {
    // Called after every AI request (success or error)
    console.log(`AI request completed. Success: ${success}`);
    if (success) {
      console.log("Content:", content);
    } else {
      console.error("Error:", error);
    }
  }}
  onAIEvent={(event) => {
    // Unified event handler for all AI events
    switch (event.type) {
      case "stream_start":
        console.log("AI stream started with model:", event.model);
        break;
      case "completion":
        console.log("AI completed:", event.content);
        break;
      case "error":
        console.error("AI error:", event.error);
        break;
    }
  }}
/>
```

### Extending Configuration

The `AIConfig` interface is extensible, allowing you to add other configuration options:

```tsx
<AiPanelContent
  models={customModels}
  apiEndpoint="https://custom-api.com"
  maxTokens={4000}
  onSuccess={({ content, model, timestamp }) => console.log("Success!", model)}
  onComplete={({ success }) => console.log("Done!", success)}
  // ... any other props
/>
```

## Architecture

### Context Provider: `AIConfigProvider`

- **Location**: `src/pages/panels/ai-panel/ai-models-context.tsx`
- **Purpose**: Provides AI configuration to all child components
- **Props**:
  - `config?: Partial<AIConfig>` - Optional configuration object
  - Falls back to hardcoded `AI_MODELS` if not provided

### Hooks

#### `useAIConfig()`

Returns the full configuration object:

```tsx
const { config } = useAIConfig();
// config.models, config.apiEndpoint, etc.
```

#### `useAIModels()`

Convenience hook that returns just the models:

```tsx
const { models } = useAIModels();
```

### Type Definitions

```typescript
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
  [key: string]: any; // Extensible for future config options
}
```

## Components Updated

All components now consume models from context instead of hardcoded imports:

1. **`AiPanelContent`** - Wraps everything with `AIConfigProvider`
2. **`ModelSelectorDropdown`** - Uses `useAIModels()` to get available models
3. **`AiPromptInput`** - Uses `useAIModels()` for default model selection
4. **`AiPanelForDefaultLang`** - Uses `useAIModels()` for model fallback
5. **`AiPanelForOtherLang`** - Uses `useAIModels()` for model fallback

## Benefits

1. **No Prop Drilling**: Configuration is available via context throughout the component tree
2. **Optional Override**: Pass custom models only when needed, fallback to defaults otherwise
3. **Event Callbacks**: Listen to AI completion, error, and stream start events for analytics, logging, or user feedback
4. **Extensible**: Add new configuration options without breaking existing code
5. **Type-Safe**: Full TypeScript support with proper type definitions
6. **Reusable**: The context pattern can be used for other configuration needs

## Event Lifecycle

When an AI request is made, the following events are triggered:

1. **`stream_start`** - Fired when the AI stream begins
2. **`completion`** - Fired when the AI successfully completes (success path)
3. **`error`** - Fired when an error occurs (error path)

You can listen to these events using:

- **Success callback**: `onSuccess` - Called only when AI succeeds
- **Error callback**: `onError` - Called only when AI fails
- **Complete callback**: `onComplete` - Called after every request (success or error)
- **Unified handler**: `onAIEvent` - Receives all event types including stream_start
