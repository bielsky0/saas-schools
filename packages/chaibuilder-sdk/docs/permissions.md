# Permissions

ChaiBuilder supports fine-grained permission control to restrict user actions.

## Available Permissions

| Permission             | Description                   |
| ---------------------- | ----------------------------- |
| `add_block`            | Add new blocks to the canvas  |
| `delete_block`         | Delete blocks from the canvas |
| `edit_block`           | Edit block properties         |
| `move_block`           | Move/reorder blocks           |
| `edit_theme`           | Modify theme settings         |
| `save_page`            | Save the page                 |
| `edit_styles`          | Edit block styles/classes     |
| `import_html`          | Import HTML into the builder  |
| `create_library_block` | Create new library blocks     |
| `create_library_group` | Create library groups         |
| `edit_library_block`   | Edit existing library blocks  |
| `delete_library_block` | Delete library blocks         |

## Usage

### Setting Permissions

Pass permissions array to the editor:

```tsx
import { ChaiBuilderEditor } from "@chaibuilder/sdk";

<ChaiBuilderEditor
  permissions={["add_block", "delete_block", "edit_block", "move_block", "save_page"]}
  // ... other props
/>;
```

### Checking Permissions

Use the `usePermissions` hook in custom components:

```tsx
import { usePermissions } from "@chaibuilder/sdk";

const MyComponent = () => {
  const { hasPermission } = usePermissions();

  if (!hasPermission("edit_block")) {
    return <div>You don't have permission to edit blocks.</div>;
  }

  return <EditBlockForm />;
};
```

### Permission Constants

Import permission constants for type safety:

```tsx
import { PERMISSIONS } from "@chaibuilder/sdk";

const editorPermissions = [
  PERMISSIONS.ADD_BLOCK,
  PERMISSIONS.DELETE_BLOCK,
  PERMISSIONS.EDIT_BLOCK,
  PERMISSIONS.MOVE_BLOCK,
  PERMISSIONS.SAVE_PAGE,
];

const viewerPermissions = []; // No permissions = read-only
```

## Role-Based Examples

### Admin (Full Access)

```tsx
const adminPermissions = [
  "add_block",
  "delete_block",
  "edit_block",
  "move_block",
  "edit_theme",
  "save_page",
  "edit_styles",
  "import_html",
  "create_library_block",
  "create_library_group",
  "edit_library_block",
  "delete_library_block",
];
```

### Editor

```tsx
const editorPermissions = ["add_block", "delete_block", "edit_block", "move_block", "save_page", "edit_styles"];
```

### Content Editor (No Style Changes)

```tsx
const contentEditorPermissions = [
  "edit_block", // Can only edit content, not add/delete
  "save_page",
];
```

### Viewer (Read-Only)

```tsx
const viewerPermissions = []; // Empty array = read-only mode
```

## Conditional UI

Render UI based on permissions:

```tsx
import { usePermissions } from "@chaibuilder/sdk";

const Toolbar = () => {
  const { hasPermission } = usePermissions();

  return (
    <div className="toolbar">
      {hasPermission("add_block") && <button>Add Block</button>}

      {hasPermission("save_page") && <button>Save</button>}

      {hasPermission("edit_theme") && <button>Theme Settings</button>}
    </div>
  );
};
```
