import UILibrariesPanel from "~/core/components/sidepanels/panels/add-blocks/libraries-panel";

export const LibraryTab = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <UILibrariesPanel fromSidebar={true} />
      </div>
    </div>
  );
};
