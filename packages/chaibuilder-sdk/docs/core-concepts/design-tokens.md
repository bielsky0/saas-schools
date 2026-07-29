# Design Tokens

Design tokens are reusable style definitions that ensure consistency across your site. They allow users to define a set of Tailwind classes once and apply them to any block.

## What are Design Tokens?

Design tokens are named collections of CSS classes that can be applied to blocks. For example:

| Token Name        | Classes                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `Button-Primary`  | `bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90` |
| `Card-Header`     | `text-xl font-bold text-gray-900 mb-4`                           |
| `Section-Padding` | `py-16 px-4 md:px-8 lg:px-16`                                    |

## Benefits

- **Consistency** — Apply the same styles across multiple blocks
- **Maintainability** — Update a token once, changes apply everywhere
- **Design System** — Build a reusable component library
- **Collaboration** — Share design patterns across team members

## Creating Design Tokens

Users can create and manage design tokens within the builder UI:

1. Open the Design Tokens panel
2. Click "Add Token"
3. Enter a name (e.g., `Button-Primary`)
4. Define the Tailwind classes
5. Save the token

## Naming Convention

Design token names follow a hyphen-separated format:

- ✅ `Button-Primary`
- ✅ `Card-Header`
- ✅ `Section-Large-Padding`
- ❌ `button primary` (no spaces)
- ❌ `button_primary` (no underscores)

Only alphanumeric characters and hyphens are allowed.

## Applying Design Tokens

Once created, design tokens appear in the class suggestions when styling a block. Select a token to apply all its classes at once.

## Storage Format

Internally, design tokens are stored with a `${DESIGN_TOKEN_PREFIX}-{id}` prefix for identification. However, users always see the readable token name in the UI—the internal format is never exposed.
