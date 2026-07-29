import { DesktopIcon, LaptopIcon, MobileIcon } from "@radix-ui/react-icons";
import clsx from "clsx";
import { get, map } from "lodash-es";
import { useState } from "react";
import ReactDOM from "react-dom/server";
import { Button } from "~/components/ui/button";
import { ChaiFrame } from "~/core/frame/Frame";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useBrandingOptions } from "~/hooks/use-branding-options";
import { useLanguages } from "~/hooks/use-languages";
import { RenderChaiBlocks } from "~/render";
import { SettingsWatcher } from "~/routes/demo/preview/preview-settings";

interface BreakpointItemType {
  content: string;
  icon: any;
  title: string;
  width: number;
}
interface BreakpointCardProps extends BreakpointItemType {
  currentWidth: number;
  setIframeWidth: Function;
}

const WEB_BREAKPOINTS: BreakpointItemType[] = [
  {
    title: "mobile_xs_title",
    content: "mobile_xs_content",
    icon: <MobileIcon />,
    width: 400,
  },

  {
    title: "tablet_md_title",
    content: "tablet_md_content",
    icon: <MobileIcon />,
    width: 800,
  },

  {
    title: "desktop_xl_title",
    content: "desktop_xl_content",
    icon: <LaptopIcon />,
    width: 1200,
  },
  {
    title: "large_desktop_2xl_title",
    content: "large_desktop_2xl_content",
    icon: <DesktopIcon />,
    width: 1600,
  },
];

const getFonts = (options: any) => {
  const headingFont = get(options, "headingFont", "Arial");
  const bodyFont = get(options, "bodyFont", "Arial");
  if (headingFont === bodyFont)
    return `<link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(" ", "+")}:wght@400;500;600;700&display=swap" rel="stylesheet">`;

  return `
    <link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(" ", "+")}:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=${bodyFont.replace(" ", "+")}:wght@400;500;600;700&display=swap" rel="stylesheet">
  `;
};

export const IframeInitialContent = (fonts: string, html: string): string => `<!doctype html>
<html class="scroll-smooth h-full no-scrollbar overflow-y-auto" x-data="{darkMode: 'light'}"
      x-bind:class="{'dark': darkMode === 'dark' || (darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    ${fonts}
    <style type="text/css">
    html { height: 100%; overflow:auto; }
    body { height: 100%; }
    body{   -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none;
            -moz-user-select: none;-ms-user-select: none; user-select: none; }
    html{ -ms-overflow-style: none;  /* IE and Edge */ scrollbar-width: none;  /* Firefox */
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .frame-root .frame-content { height: 100%; }
    </style>   
    <link rel="stylesheet" href="https://unpkg.com/aos@next/dist/aos.css" />
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/venobox@2.1.8/dist/venobox.min.css">
  </head>
  <body class="font-body antialiased h-full">
    <div class="frame-root h-full">
    ${html}
    </div>  
    <script src="//unpkg.com/alpinejs" defer></script>
    <script src="https://unpkg.com/aos@next/dist/aos.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/venobox@2.1.8/dist/venobox.min.js"></script>
    <script>
      AOS.init();
      new VenoBox({
        selector: '.cb-lightbox',
      });
      function addClickEventToLinks() {
        document.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', function(event) {
            event.preventDefault();
          });
        });
      }
      // Initialize the observer
      const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            addClickEventToLinks();
          }
        });
      });
      // Start observing the document body for added nodes
      observer.observe(document.body, { childList: true, subtree: true });
      // Call the function once in case links are already present
      addClickEventToLinks();
    </script>
  </body>
</html>`;

const BreakpointCard = ({ currentWidth, width, icon, setIframeWidth }: BreakpointCardProps) => {
  return (
    <Button
      className={clsx(width === currentWidth && "text-white", "border")}
      onClick={() => setIframeWidth(width)}
      variant={width === currentWidth ? "default" : "ghost"}>
      {icon}
    </Button>
  );
};

const PreviewWeb = () => {
  const [blocks] = useBlocksStore();
  const [brandingOptions] = useBrandingOptions();
  const [localBlocks] = useState(blocks);
  const { selectedLang } = useLanguages();

  const [width, setWidth] = useState(1200);

  const setIframeWidth = (newWidth: number) => setWidth(newWidth);
  const html = ReactDOM.renderToString(<RenderChaiBlocks lang={selectedLang} blocks={localBlocks} />);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-100">
      <div className="flex h-16 items-center justify-center border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-center gap-0.5 rounded-md">
          {map(WEB_BREAKPOINTS, (bp: BreakpointItemType) => (
            <BreakpointCard {...bp} setIframeWidth={setIframeWidth} key={bp.title} currentWidth={width} />
          ))}
        </div>
      </div>
      {/* @ts-ignore */}
      <ChaiFrame
        style={{ width: `${width}px` }}
        className="no-scrollbar mx-auto h-full overflow-y-auto border bg-white"
        initialContent={IframeInitialContent(getFonts(brandingOptions), html)}>
        <SettingsWatcher />
        <div></div>
      </ChaiFrame>
    </div>
  );
};
export default PreviewWeb;
