import { CheckIcon, EyeOpenIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { Button } from "~/components/ui/button";
import { useSavePage } from "~/hooks/use-save-page";
import { useRightPanel } from "~/hooks/use-theme";

export default function RightTop() {
  const [panel, setRightPanel] = useRightPanel();
  const { savePage, saveState } = useSavePage();
  return (
    <div className="flex items-center gap-2 rounded-lg p-2">
      <Button
        variant={panel === "theme" ? "secondary" : "ghost"}
        size="sm"
        className="gap-2"
        onClick={() => setRightPanel(panel !== "theme" ? "theme" : "block")}>
        <MixerHorizontalIcon className="h-4 w-4" />
        Theme
      </Button>
      <a href="/preview" target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-2">
          <EyeOpenIcon className="h-4 w-4" />
          Preview
        </Button>
      </a>
      <Button variant="default" size="sm" className="gap-2" onClick={() => savePage(false)}>
        <CheckIcon className="h-4 w-4" />
        {saveState === "UNSAVED" ? "Draft" : "Saved"}
      </Button>
    </div>
  );
}
