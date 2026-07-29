# AI Panel Callback Examples

This document demonstrates how to use the AI panel with custom models and event callbacks for tracking AI interactions.

## Example 1: Basic Usage with Success/Error/Complete Callbacks

```tsx
import { AiPanelContent } from "./ai-panel-content";

export const BasicCallbackExample = () => {
  return (
    <AiPanelContent
      onSuccess={({ content, model, timestamp }) => {
        console.log(`✅ AI succeeded using ${model}`);
        console.log("Content:", content);
        console.log("Timestamp:", new Date(timestamp).toISOString());
        // Track analytics, show success notification, etc.
      }}
      onError={({ error, model, timestamp }) => {
        console.error(`❌ AI error with ${model}:`, error);
        console.log("Error timestamp:", new Date(timestamp).toISOString());
        // Log to error tracking service, show error notification, etc.
      }}
      onComplete={({ success, content, error, model, timestamp }) => {
        console.log(`🏁 AI request completed. Success: ${success}`);
        // Always called after AI request finishes (success or error)
      }}
    />
  );
};
```

## Example 2: Custom Models with Callbacks

```tsx
import { AiPanelContent } from "./ai-panel-content";

export const CustomModelsExample = () => {
  const customModels = [
    {
      id: "custom/gpt-4",
      name: "GPT-4 Custom",
      provider: "openai",
      description: "2x Credits",
      multiplier: 2,
    },
    {
      id: "custom/claude-3",
      name: "Claude 3 Custom",
      provider: "anthropic",
      description: "3x Credits",
      multiplier: 3,
    },
  ];

  return (
    <AiPanelContent
      models={customModels}
      onSuccess={({ content, model, timestamp }) => {
        console.log("AI generation succeeded:", { content, model, timestamp });
      }}
      onComplete={({ success }) => {
        console.log("AI request finished. Success:", success);
      }}
    />
  );
};
```

## Example 3: Unified Event Handler for All AI Events

```tsx
import { AIEvent } from "./ai-models-context";
import { AiPanelContent } from "./ai-panel-content";

export const UnifiedEventHandlerExample = () => {
  const handleAIEvent = (event: AIEvent) => {
    switch (event.type) {
      case "stream_start":
        console.log("🚀 AI stream started", {
          model: event.model,
          timestamp: new Date(event.timestamp).toISOString(),
        });
        // Show loading indicator, disable UI, etc.
        break;

      case "completion":
        console.log("✅ AI completed", {
          content: event.content,
          model: event.model,
          timestamp: new Date(event.timestamp).toISOString(),
        });
        // Hide loading, track analytics, etc.
        break;

      case "error":
        console.error("❌ AI error", {
          error: event.error,
          model: event.model,
          timestamp: new Date(event.timestamp).toISOString(),
        });
        // Log error, show notification, etc.
        break;
    }
  };

  return <AiPanelContent onAIEvent={handleAIEvent} />;
};
```

## Example 4: Analytics Tracking

```tsx
import { AiPanelContent } from "./ai-panel-content";

export const AnalyticsTrackingExample = () => {
  const trackAnalytics = (eventName: string, properties: Record<string, any>) => {
    // Replace with your analytics service (e.g., Mixpanel, Amplitude, GA)
    console.log("Analytics:", eventName, properties);
  };

  return (
    <AiPanelContent
      onAIEvent={(event) => {
        trackAnalytics("ai_event", {
          event_type: event.type,
          model: event.model,
          timestamp: event.timestamp,
        });
      }}
      onSuccess={({ content, model, timestamp }) => {
        trackAnalytics("ai_success", {
          model,
          content_length: content.length,
          timestamp,
        });
      }}
      onError={({ error, model, timestamp }) => {
        trackAnalytics("ai_error", {
          model,
          error: error instanceof Error ? error.message : String(error),
          timestamp,
        });
      }}
      onComplete={({ success, model, timestamp }) => {
        trackAnalytics("ai_complete", {
          success,
          model,
          timestamp,
        });
      }}
    />
  );
};
```

## Example 5: State Management with Callbacks

```tsx
import React from "react";
import { AiPanelContent } from "./ai-panel-content";

export const StateManagementExample = () => {
  const [aiStatus, setAiStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [lastModel, setLastModel] = React.useState<string>("");

  return (
    <div>
      <div>Status: {aiStatus}</div>
      <div>Last Model: {lastModel}</div>
      <AiPanelContent
        onAIEvent={(event) => {
          switch (event.type) {
            case "stream_start":
              setAiStatus("loading");
              setLastModel(event.model);
              break;
            case "completion":
              setAiStatus("success");
              break;
            case "error":
              setAiStatus("error");
              break;
          }
        }}
      />
    </div>
  );
};
```

## Callback Types

### onSuccess
Called when AI request succeeds.
- **Parameters**: `{ content: string, model: string, timestamp: number }`

### onError
Called when AI request fails.
- **Parameters**: `{ error: Error | string, model: string, timestamp: number }`

### onComplete
Called after every AI request (success or error).
- **Parameters**: `{ success: boolean, content?: string, error?: Error | string, model: string, timestamp: number }`

### onAIEvent
Unified handler for all AI events (stream_start, completion, error).
- **Parameters**: `AIEvent` (union type of all event types)
