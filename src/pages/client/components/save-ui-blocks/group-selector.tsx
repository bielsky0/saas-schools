import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LibraryGroup, useLibraryGroups } from "~/pages/hooks/project/use-library-groups";

interface GroupSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

// Define interface for local group to match LibraryGroup
interface LocalGroup {
  id: string;
  name: string;
}

export const GroupSelector = ({ value, onChange }: GroupSelectorProps) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Fetch library groups from API
  const { groups: libraryGroups } = useLibraryGroups();
  // Default predefined groups
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([
    { id: "hero", name: "Hero" },
    { id: "feature", name: "Feature" },
    { id: "footer", name: "Footer" },
    { id: "content", name: "Content" },
    { id: "testimonial", name: "Testimonial" },
    { id: "pricing", name: "Pricing" },
    { id: "login", name: "Login" },
    { id: "logos", name: "Logos" },
    { id: "about", name: "About" },
    { id: "banner", name: "Banner" },
    { id: "blog", name: "Blog" },
    { id: "careers", name: "Careers" },
    { id: "casestudy", name: "Casestudy" },
    { id: "changelog", name: "Changelog" },
    { id: "compare", name: "Compare" },
    { id: "contact", name: "Contact" },
    { id: "cta", name: "Cta" },
    { id: "faq", name: "Faq" },
    { id: "gallery", name: "Gallery" },
    { id: "integration", name: "Integration" },
    { id: "list", name: "List" },
    { id: "navbar", name: "Navbar" },
    { id: "product", name: "Product" },
    { id: "signup", name: "Signup" },
    { id: "stats", name: "Stats" },
    { id: "team", name: "Team" },
    { id: "timeline", name: "Timeline" },
  ]);

  // Merge library and local groups, keeping library groups on top (wrapped in useMemo)
  const allGroups = useMemo(
    () => [
      ...libraryGroups,
      ...localGroups.filter((local) => !libraryGroups.some((lib: LibraryGroup) => lib.id === local.id)),
    ],
    [libraryGroups, localGroups],
  );

  // Handle local group creation
  const handleCreateGroup = () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    // Create a new group locally
    const newGroup = { id: trimmedName, name: trimmedName };
    setLocalGroups((prev) => [...prev, newGroup]);

    // Select the new group
    onChange(newGroup.id);

    // Reset form state
    setNewGroupName("");
    setIsCreatingNew(false);
  };

  // Focus input when creating new group
  useEffect(() => {
    if (isCreatingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingNew]);

  // Handle key down events for the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateGroup();
    }
  };

  // Make sure a valid group is selected
  useEffect(() => {
    if (value && !allGroups.some((g) => g.id === value)) {
      onChange("");
    }
  }, [value, allGroups, onChange]);

  if (isCreatingNew) {
    return (
      <div className="space-y-2">
        <Input
          ref={inputRef}
          placeholder="Enter new group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCreatingNew(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreateGroup}>
            Create
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a group</option>

        {/* Display library groups first */}
        {libraryGroups.length > 0 && (
          <optgroup label="Library Groups">
            {libraryGroups.map((group: LibraryGroup) => (
              <option key={`lib-${group.id}`} value={group.id}>
                {group.name}
              </option>
            ))}
          </optgroup>
        )}

        {/* Display local groups filtered to remove duplicates */}
        {localGroups.length > 0 && (
          <optgroup label="Predefined Groups">
            {localGroups
              .filter((local) => !libraryGroups.some((lib: LibraryGroup) => lib.id === local.id))
              .map((group: LocalGroup) => (
                <option key={`local-${group.id}`} value={group.id}>
                  {group.name}
                </option>
              ))}
          </optgroup>
        )}
      </select>
      <Button type="button" size="icon" variant="outline" onClick={() => setIsCreatingNew(true)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
