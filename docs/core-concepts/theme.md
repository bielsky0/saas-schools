# Theme

ChaiBuilder includes a built-in theming system that allows you to define colors, fonts, border radius, and other design properties across your site.

## Overview

The theme system provides:

- **Color Palette** — Primary, secondary, and custom color definitions with light/dark mode support
- **Typography** — Font families for headings and body text
- **Border Radius** — Consistent corner rounding across components
- **Container Width** — Maximum content width settings

## Theme Structure

```typescript
interface ChaiBuilderTheme {
  colors: {
    primary: [string, string]; // [light, dark]
    secondary: [string, string];
    // ... additional colors
  };
  fontFamily: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  container: {
    maxWidth: string;
  };
}
```

## Using Theme in the Editor

Themes can be:

1. **Passed as props** — Set initial theme via `theme` prop
2. **Modified in UI** — Users can adjust theme settings in the editor
3. **Saved on export** — Theme data is included in the `onSave` callback

```tsx
<ChaiBuilderEditor
  theme={{
    colors: {
      primary: ["#3b82f6", "#60a5fa"],
    },
    fontFamily: {
      heading: "Inter",
      body: "Inter",
    },
  }}
  onSave={async ({ blocks, theme }) => {
    // theme contains the current theme settings
  }}
/>
```

## Dark Mode

ChaiBuilder supports dark mode out of the box. Colors are defined as tuples where:

- First value = light mode color
- Second value = dark mode color

```typescript
colors: {
  primary: ["#3b82f6", "#60a5fa"],  // [light, dark]
}
```

## Theme Presets

You can provide predefined theme presets for users to choose from. See [Theme Presets](../theme-presets.md) for configuration details.

## Accessing Theme in Code

```typescript
import { useTheme } from "@chaibuilder/sdk";

const MyComponent = () => {
  const [theme, setTheme] = useTheme();
  // Access and modify theme values
};
```
