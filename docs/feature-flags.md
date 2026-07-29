# Feature Flags

Control which features are enabled in the ChaiBuilder editor.

## Built-in Flags

Pass flags via the `flags` prop:

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";

<ChaiBuilderEditor
  flags={{
    darkMode: true,
    copyPaste: true,
    exportCode: false,
    importHtml: true,
    importTheme: true,
    dataBinding: false,
    dragAndDrop: true,
    validateStructure: true,
    designTokens: true,
  }}
  // ... other props
/>;
```

## Available Flags

| Flag                | Default | Description                            |
| ------------------- | ------- | -------------------------------------- |
| `darkMode`          | `false` | Enable dark mode toggle in theme panel |
| `copyPaste`         | `true`  | Enable copy/paste functionality        |
| `exportCode`        | `true`  | Enable code export feature             |
| `importHtml`        | `true`  | Enable HTML import feature             |
| `importTheme`       | `true`  | Enable theme import from CSS           |
| `dataBinding`       | `false` | Enable data binding features           |
| `dragAndDrop`       | `true`  | Enable drag and drop                   |
| `validateStructure` | `false` | Enable HTML structure validation       |
| `designTokens`      | `true`  | Enable design tokens feature           |
| `librarySite`       | `false` | Enable library site features           |
| `gotoSettings`      | `false` | Enable settings navigation             |

## Custom Feature Flags

### Registering Custom Flags

```tsx
import { registerChaiFeatureFlag } from "@chaibuilder/sdk";

// Register a single flag
registerChaiFeatureFlag("myCustomFeature", {
  value: false,
  description: "Enable my custom feature",
});

// Register multiple flags
import { registerChaiFeatureFlags } from "@chaibuilder/sdk";

registerChaiFeatureFlags({
  featureA: { value: true, description: "Feature A" },
  featureB: { value: false, description: "Feature B" },
});
```

### Using Custom Flags

```tsx
import { useChaiFeatureFlag } from "@chaibuilder/sdk";

const MyComponent = () => {
  const isEnabled = useChaiFeatureFlag("myCustomFeature");

  if (!isEnabled) {
    return null;
  }

  return <MyFeatureUI />;
};
```

### Conditional Rendering

```tsx
import { IfChaiFeatureFlag } from "@chaibuilder/sdk";

const MyComponent = () => {
  return (
    <div>
      <IfChaiFeatureFlag flagKey="myCustomFeature">
        <MyFeatureUI />
      </IfChaiFeatureFlag>
    </div>
  );
};
```

### Toggling Flags

```tsx
import { useToggleChaiFeatureFlag } from "@chaibuilder/sdk";

const FeatureToggle = () => {
  const toggleFeature = useToggleChaiFeatureFlag("myCustomFeature");

  return <button onClick={toggleFeature}>Toggle Feature</button>;
};
```

### Getting All Flags

```tsx
import { useChaiFeatureFlags } from "@chaibuilder/sdk";

const FlagsPanel = () => {
  const flags = useChaiFeatureFlags();

  return (
    <ul>
      {Object.entries(flags).map(([key, config]) => (
        <li key={key}>
          {key}: {config.description}
        </li>
      ))}
    </ul>
  );
};
```

## Environment-Based Flags

```tsx
const flags = {
  exportCode: process.env.NODE_ENV === "development",
  debugLogs: process.env.NODE_ENV === "development",
  dataBinding: process.env.ENABLE_DATA_BINDING === "true",
};

<ChaiBuilderEditor flags={flags} />;
```

## Feature Flag Persistence

Custom feature flags are persisted in localStorage under the key `chai-feature-flags`. This allows users to toggle experimental features that persist across sessions.
