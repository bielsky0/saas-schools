# Introduction

ChaiBuilder is a **React** and **Tailwind CSS** website builder SDK. It enables developers to integrate a fully functional, visual website builder into their projects.

## What is ChaiBuilder?

ChaiBuilder is a front-end SDK that provides a complete visual page building experience. It handles the UI, block management, styling, and editing capabilities—while leaving back-end implementation (storage, authentication, APIs) entirely up to you.

### Key Characteristics

- **Front-end Editor** — The visual builder is a client-side React component. Storage, authentication, and data persistence must be implemented by the developer.
- **RSC-Compatible Rendering** — The render API supports React Server Components, making it ideal for Next.js App Router and other RSC-enabled frameworks.
- **Block-based Architecture** — At its core, the builder accepts an array of blocks, allows users to manipulate them visually, and emits the modified JSON on save.
- **Theme & Design Tokens** — Built-in support for theming and design tokens for consistent styling across your site.
- **Flexible Integration** — Can be used as a single-page builder or a multi-page website builder, depending on your needs.

## Technology Stack

| Technology   | Version                      |
| ------------ | ---------------------------- |
| React        | 18+                          |
| Tailwind CSS | 3.x (v4 support coming soon) |

ChaiBuilder can be integrated into **any framework that supports React**, including:

- Next.js
- Remix
- Gatsby
- Vite
- Create React App
- And more...

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────────┐      ┌──────────────────────────┐    │
│   │    Blocks    │ ───► │   ChaiBuilder Editor     │    │
│   │    (JSON)    │      │   - Visual editing       │    │
│   └──────────────┘      │   - Drag & drop          │    │
│                         │   - Styling controls     │    │
│                         └───────────┬──────────────┘    │
│                                     │                    │
│                                     ▼                    │
│                         ┌──────────────────────────┐    │
│                         │   onSave callback        │    │
│                         │   - Modified blocks JSON │    │
│                         │   - Theme data           │    │
│                         └───────────┬──────────────┘    │
│                                     │                    │
│                                     ▼                    │
│                         ┌──────────────────────────┐    │
│                         │   Your Backend           │    │
│                         │   (You implement this)   │    │
│                         └──────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

1. **Input** — Pass an array of blocks (JSON) to the editor
2. **Edit** — Users visually manipulate blocks within the builder
3. **Output** — On save, the editor emits the modified blocks JSON via callback
4. **Render** — Use the SDK's rendering APIs to display blocks on your site

## Single-Page vs Multi-Page

ChaiBuilder supports both modes through its props configuration:

| Mode            | Use Case                                       |
| --------------- | ---------------------------------------------- |
| **Single-page** | Landing pages, email templates, simple editors |
| **Multi-page**  | Full website builders with page management     |

The mode is determined by the props you pass to the editor—see [Editor Props Reference](editor-props-reference.md) for details.

## Core Concepts

- [Blocks](core-concepts/blocks.md) — The fundamental building units
- [Theme](core-concepts/theme.md) — Colors, fonts, and design properties
- [Design Tokens](core-concepts/design-tokens.md) — Reusable style definitions
- [Rendering](core-concepts/rendering.md) — Display blocks in production (RSC-compatible)

## Next Steps

- [Getting Started](getting-started.md) — Install and set up ChaiBuilder
- [Editor Props Reference](editor-props-reference.md) — Configure the editor
- [Registering Custom Blocks](registering-custom-blocks.md) — Create your own block types
