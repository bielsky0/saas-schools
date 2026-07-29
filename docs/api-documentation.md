# API Documentation

This project uses **TypeDoc** to automatically generate API documentation from TypeScript source code and **Docsify** to serve the documentation.

## Overview

The API documentation is generated from the main export entry points defined in `package.json`:

- **Core** (`src/core/index.ts`) - Core builder functionality
- **Pages** (`src/pages/index.ts`) - Multi-page management
- **Render** (`src/render/index.ts`) - Rendering utilities
- **Runtime** (`src/runtime/index.ts`) - Runtime components and controls
- **Web Blocks** (`src/web-blocks/index.ts`) - Pre-built web components
- **Utils** (`src/utils/index.ts`) - Utility functions
- **Express** (`src/express/index.ts`) - Express.js integration

## Generating API Documentation

To generate the API documentation, run:

```bash
pnpm docs:api
```

This command uses TypeDoc to:

1. Parse TypeScript source files from the `src/` folder
2. Extract exported types, functions, classes, and interfaces
3. Generate Markdown documentation in the `docs/api/` folder

## Viewing Documentation Locally

To serve the documentation locally with live reload:

```bash
pnpm docs:serve
```

Then open your browser to `http://localhost:3000`

## Configuration

### TypeDoc Configuration

The TypeDoc configuration is defined in `typedoc.json`:

- **Entry Points**: Main export files from `src/` folder
- **Output**: `docs/api/` directory
- **Plugin**: `typedoc-plugin-markdown` for Markdown output
- **Exclusions**: Private, protected, internal, and external code

### Docsify Configuration

The Docsify configuration is in `docs/index.html`:

- **Sidebar**: Defined in `docs/_sidebar.md`
- **Theme**: Vue theme with custom styling
- **Plugins**: Search, copy code, pagination, syntax highlighting

## Deployment

The API documentation is automatically generated and included in the documentation site. The `docs/api/` folder is gitignored since it's auto-generated.

To deploy:

1. Generate the API docs: `pnpm docs:api`
2. The generated files in `docs/api/` will be served alongside other documentation
3. GitHub Pages or other static hosting will serve the complete documentation

## Maintenance

- **Automatic**: API docs are generated from source code comments and TypeScript types
- **Manual Updates**: Update JSDoc comments in source files to improve documentation
- **Regenerate**: Run `pnpm docs:api` after making changes to exports or documentation comments

## Best Practices

1. Add JSDoc comments to exported functions, classes, and types
2. Use `@param`, `@returns`, `@example` tags for better documentation
3. Mark internal APIs with `@internal` to exclude them from public docs
4. Regenerate docs before committing changes to ensure they're up to date
