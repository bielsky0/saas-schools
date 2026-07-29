import { ArchiveIcon, CookieIcon, DimensionsIcon, IconJarLogoIcon } from "@radix-ui/react-icons";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { registerChaiSidebarPanel } from "~/runtime/client";

const Panel1Button = ({ isActive, show }: { isActive: boolean; show: () => void }) => {
  return (
    <Button variant={isActive ? "default" : "ghost"} size="icon" onClick={show}>
      <IconJarLogoIcon />
    </Button>
  );
};

registerChaiSidebarPanel("panel-1", {
  panel: () => <div>Panel 1</div>,
  button: Panel1Button,
  label: "Panel 1",
  position: "top",
});

const WhenEmptyCanvasButton = ({ isActive, show }: { isActive: boolean; show: () => void }) => {
  return (
    <Button variant={isActive ? "default" : "ghost"} size="icon" onClick={show}>
      <DimensionsIcon />
    </Button>
  );
};

registerChaiSidebarPanel("when-empty-canvas", {
  // @ts-ignore
  panel: ({ close }: { close: () => void }) => (
    <div>
      WhenEmptyCanvas
      <Button onClick={close}>Close</Button>
    </div>
  ),
  icon: <CookieIcon />,
  button: WhenEmptyCanvasButton,
  label: "Cookies Panel",
  position: "bottom",
  view: "overlay",
});

const PopoverButton = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <ArchiveIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right">
        <div className="p-0">
          <h4 className="font-medium leading-none">Popover Content</h4>
        </div>
      </PopoverContent>
    </Popover>
  );
};
registerChaiSidebarPanel("popover", {
  button: PopoverButton,
  label: "Popover",
  position: "bottom",
});

registerChaiSidebarPanel("when-empty-canvas2", {
  panel: () => <div>WhenEmptyCanvas2</div>,
  button: WhenEmptyCanvasButton,
  label: "Cookies Panel",
  position: "bottom",
  view: "overlay",
});
