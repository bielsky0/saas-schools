# Theme Presets

This guide explains how to add custom theme presets to the ChaiBuilder editor.

## Overview

Theme presets are pre-defined theme configurations that include:

- **Typography** (heading and body fonts)
- **Border radius**
- **Color palette** (with light and dark mode variants)

## Quick Start

Pass your custom presets to the `themePresets` prop on the `ChaiBuilder` component:

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";
import { ChaiThemeValues } from "@chaibuilder/sdk/types";

const myCustomPreset: ChaiThemeValues = {
  fontFamily: {
    heading: "Arial",
    body: "Arial",
  },
  borderRadius: "8px",
  colors: {
    background: ["#ffffff", "#0a0a0a"], // [light, dark]
    foreground: ["#0a0a0a", "#fafafa"],
    primary: ["#3b82f6", "#60a5fa"],
    "primary-foreground": ["#ffffff", "#0a0a0a"],
    secondary: ["#f1f5f9", "#1e293b"],
    "secondary-foreground": ["#0f172a", "#f8fafc"],
    muted: ["#f1f5f9", "#1e293b"],
    "muted-foreground": ["#64748b", "#94a3b8"],
    accent: ["#f1f5f9", "#1e293b"],
    "accent-foreground": ["#0f172a", "#f8fafc"],
    destructive: ["#ef4444", "#f87171"],
    "destructive-foreground": ["#ffffff", "#ffffff"],
    border: ["#e2e8f0", "#334155"],
    input: ["#e2e8f0", "#334155"],
    ring: ["#3b82f6", "#60a5fa"],
    card: ["#ffffff", "#0f172a"],
    "card-foreground": ["#0f172a", "#f8fafc"],
    popover: ["#ffffff", "#0f172a"],
    "popover-foreground": ["#0f172a", "#f8fafc"],
  },
};

function App() {
  return (
    <ChaiBuilderEditor
      themePresets={[{ my_custom_theme: myCustomPreset }, { another_preset: anotherPreset }]}
      // ... other props
    />
  );
}
```

## Type Definition

The `ChaiThemeValues` type defines the structure of a theme preset:

```typescript
type ChaiThemeValues = {
  fontFamily: {
    heading: string; // Font family for headings
    body: string; // Font family for body text
  };
  borderRadius: string; // e.g., "6px", "8px", "0.5rem"
  colors: {
    // Each color is a tuple: [lightModeValue, darkModeValue]
    background: [HexColor, HexColor];
    foreground: [HexColor, HexColor];
    primary: [HexColor, HexColor];
    "primary-foreground": [HexColor, HexColor];
    secondary: [HexColor, HexColor];
    "secondary-foreground": [HexColor, HexColor];
    muted: [HexColor, HexColor];
    "muted-foreground": [HexColor, HexColor];
    accent: [HexColor, HexColor];
    "accent-foreground": [HexColor, HexColor];
    destructive: [HexColor, HexColor];
    "destructive-foreground": [HexColor, HexColor];
    border: [HexColor, HexColor];
    input: [HexColor, HexColor];
    ring: [HexColor, HexColor];
    card: [HexColor, HexColor];
    "card-foreground": [HexColor, HexColor];
    popover: [HexColor, HexColor];
    "popover-foreground": [HexColor, HexColor];
  };
};
```

## Preset Format

Each preset in the `themePresets` array must be an object with a single key-value pair:

```typescript
{
  preset_name: ChaiThemeValues;
}
```

- **Key**: The preset identifier (use underscores for spaces, e.g., `my_brand_theme`)
- **Value**: The `ChaiThemeValues` object

The key is displayed in the UI with underscores replaced by spaces and capitalized (e.g., `my_brand_theme` → "My brand theme").

## Color Format

Colors must be specified as hex values (e.g., `#ffffff`, `#3b82f6`). Each color property is a tuple where:

- **Index 0**: Light mode color
- **Index 1**: Dark mode color

```typescript
primary: ["#3b82f6", "#60a5fa"],  // Blue in light mode, lighter blue in dark mode
```

## Built-in Presets

ChaiBuilder includes several built-in presets that are automatically available:

| Preset Name       | Description              |
| ----------------- | ------------------------ |
| `shadcn_default`  | Default shadcn/ui theme  |
| `twitter_theme`   | Twitter/X inspired theme |
| `solarized_theme` | Solarized color scheme   |
| `claude_theme`    | Claude AI inspired theme |
| `supabase_theme`  | Supabase inspired theme  |

Your custom presets will appear alongside these built-in presets in the theme panel.

## Complete Example

Here's a complete example with multiple custom presets:

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";
import { ChaiThemeValues } from "@chaibuilder/sdk/types";

// Ocean Blue Theme
const oceanBlue: ChaiThemeValues = {
  fontFamily: {
    heading: "Poppins",
    body: "Open Sans",
  },
  borderRadius: "12px",
  colors: {
    background: ["#f0f9ff", "#0c1929"],
    foreground: ["#0c4a6e", "#e0f2fe"],
    primary: ["#0284c7", "#38bdf8"],
    "primary-foreground": ["#ffffff", "#0c1929"],
    secondary: ["#e0f2fe", "#164e63"],
    "secondary-foreground": ["#0c4a6e", "#e0f2fe"],
    muted: ["#e0f2fe", "#164e63"],
    "muted-foreground": ["#64748b", "#94a3b8"],
    accent: ["#bae6fd", "#0e7490"],
    "accent-foreground": ["#0c4a6e", "#e0f2fe"],
    destructive: ["#dc2626", "#f87171"],
    "destructive-foreground": ["#ffffff", "#ffffff"],
    border: ["#bae6fd", "#1e3a5f"],
    input: ["#bae6fd", "#1e3a5f"],
    ring: ["#0284c7", "#38bdf8"],
    card: ["#ffffff", "#0f2942"],
    "card-foreground": ["#0c4a6e", "#e0f2fe"],
    popover: ["#ffffff", "#0f2942"],
    "popover-foreground": ["#0c4a6e", "#e0f2fe"],
  },
};

// Emerald Green Theme
const emeraldGreen: ChaiThemeValues = {
  fontFamily: {
    heading: "Montserrat",
    body: "Lato",
  },
  borderRadius: "8px",
  colors: {
    background: ["#f0fdf4", "#022c22"],
    foreground: ["#14532d", "#d1fae5"],
    primary: ["#059669", "#34d399"],
    "primary-foreground": ["#ffffff", "#022c22"],
    secondary: ["#d1fae5", "#064e3b"],
    "secondary-foreground": ["#14532d", "#d1fae5"],
    muted: ["#d1fae5", "#064e3b"],
    "muted-foreground": ["#64748b", "#94a3b8"],
    accent: ["#a7f3d0", "#047857"],
    "accent-foreground": ["#14532d", "#d1fae5"],
    destructive: ["#dc2626", "#f87171"],
    "destructive-foreground": ["#ffffff", "#ffffff"],
    border: ["#a7f3d0", "#065f46"],
    input: ["#a7f3d0", "#065f46"],
    ring: ["#059669", "#34d399"],
    card: ["#ffffff", "#033a2a"],
    "card-foreground": ["#14532d", "#d1fae5"],
    popover: ["#ffffff", "#033a2a"],
    "popover-foreground": ["#14532d", "#d1fae5"],
  },
};

function App() {
  return (
    <ChaiBuilderEditor
      themePresets={[{ ocean_blue: oceanBlue }, { emerald_green: emeraldGreen }]}
      // ... other props
    />
  );
}
```

## User Experience

Once configured, users can:

1. Open the **Theme** panel in the editor sidebar
2. Select a preset from the **Presets** dropdown
3. Click **Apply** to apply the preset
4. An **Undo** toast notification allows reverting to the previous theme

## Tips

- **Naming**: Use descriptive names with underscores (e.g., `brand_primary`, `dark_corporate`)
- **Contrast**: Ensure sufficient contrast between foreground and background colors for accessibility
- **Consistency**: Keep color relationships consistent (e.g., primary-foreground should contrast with primary)
- **Testing**: Test both light and dark mode variants thoroughly
