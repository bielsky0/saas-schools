import { ChevronDownIcon } from "@radix-ui/react-icons";
import { includes, map, toUpper } from "lodash-es";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { cn, getBreakpointValue } from "~/core/functions/common-functions";
import { useBuilderProp } from "~/hooks/use-builder-prop";
import { useCanvasDisplayWidth, useScreenSizeWidth } from "~/hooks/use-screen-size-width";
import { useSelectedBreakpoints } from "~/hooks/use-selected-breakpoints";

export interface BreakpointItemType {
  breakpoint: string;
  content: string;
  icon: any;
  title: string;
  width: number;
}

export interface BreakpointCardProps extends BreakpointItemType {
  canvas?: boolean;
  currentBreakpoint: string;
  onClick: Function;
  openDelay?: number;
  tooltip?: boolean;
  buttonClass?: string;
  activeButtonClass?: string;
}

const MobileIcon = ({ className = "" }) => (
  <svg
    className={cn("h-4 w-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12.01" y2="18"></line>
  </svg>
);

const LaptopIcon = ({ className = "" }) => (
  <svg
    className={cn("h-4 w-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="12" rx="2" ry="2"></rect>
    <line x1="6" y1="20" x2="18" y2="20"></line>
    <line x1="12" y1="16" x2="12" y2="20"></line>
  </svg>
);

const DesktopIcon = ({ className = "" }) => (
  <svg
    className={cn("h-4 w-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const TabletIcon = ({ landscape = false, className = "" }) => (
  <svg
    className={cn("h-4 w-4", landscape ? "rotate-90" : "", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12.01" y2="18"></line>
  </svg>
);

export const WEB_BREAKPOINTS: BreakpointItemType[] = [
  {
    title: "Mobile (Base)",
    content: "Styles set here are applied to all screen unless edited at higher breakpoint",
    breakpoint: "xs",
    icon: <MobileIcon className="h-4 w-4" />,
    width: 400,
  },
  {
    title: "Mobile landscape (SM)",
    content: "Styles set here are applied at 640px and up unless edited at higher breakpoint",
    breakpoint: "sm",
    icon: <MobileIcon className="h-4 w-4 rotate-90" />,
    width: 640,
  },
  {
    title: "Tablet (MD)",
    content: "Styles set here are applied at 768px and up",
    breakpoint: "md",
    icon: <TabletIcon />,
    width: 800,
  },
  {
    title: "Tablet Landscape (LG)",
    content: "Styles set here are applied at 1024px and up unless edited at higher breakpoint",
    breakpoint: "lg",
    icon: <TabletIcon landscape />,
    width: 1024,
  },
  {
    title: "Desktop (XL)",
    content: "Styles set here are applied at 1280px and up unless edited at higher breakpoint",
    breakpoint: "xl",
    icon: <LaptopIcon className="h-4 w-4" />,
    width: 1420,
  },
  {
    title: "Large Desktop (2XL)",
    content: "Styles set here are applied at 1536px and up",
    breakpoint: "2xl",
    icon: <DesktopIcon className="h-4 w-4" />,
    width: 1920,
  },
];

const BreakpointCard = ({
  canvas = false,
  openDelay = 400,
  tooltip = true,
  title,
  content,
  currentBreakpoint,
  breakpoint,
  width,
  icon,
  onClick,
  buttonClass = "",
  activeButtonClass = "",
}: BreakpointCardProps) => {
  const { t } = useTranslation();

  if (!tooltip) {
    return (
      <Button
        onClick={() => onClick(width)}
        size="sm"
        className="h-7 w-7 rounded-md p-1"
        variant={breakpoint === currentBreakpoint ? "outline" : "ghost"}>
        {icon}
      </Button>
    );
  }

  return (
    <HoverCard openDelay={openDelay}>
      <HoverCardTrigger asChild>
        <Button
          onClick={() => onClick(width)}
          size="sm"
          className={cn("h-7 w-7 rounded-md p-1", breakpoint === currentBreakpoint ? activeButtonClass : buttonClass)}
          variant={breakpoint === currentBreakpoint ? "ghost" : "ghost"}>
          {icon}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-fit max-w-52 border-border">
        <div className="flex justify-between space-x-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{t(title)}</h4>
            {canvas && <p className="text-xs">{t(content)}</p>}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const Breakpoints = ({
  openDelay = 400,
  canvas = false,
  tooltip = true,
  buttonClass = "",
  activeButtonClass = "",
}: {
  openDelay?: number;
  canvas?: boolean;
  tooltip?: boolean;
  buttonClass?: string;
  activeButtonClass?: string;
}) => {
  const [currentWidth, , setNewWidth] = useScreenSizeWidth();
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useCanvasDisplayWidth();
  const [styleBreakpoints, setStyleBreakpoints] = useSelectedBreakpoints();

  const selectedBreakpoints = canvas ? styleBreakpoints : styleBreakpoints;
  const setSelectedBreakpoints = canvas ? setStyleBreakpoints : setStyleBreakpoints;
  const { t } = useTranslation();
  const breakpoints = useBuilderProp("breakpoints", WEB_BREAKPOINTS);

  const toggleBreakpoint = (newBreakPoint: string) => {
    if (selectedBreakpoints.includes(newBreakPoint)) {
      if (selectedBreakpoints.length > 2) {
        setSelectedBreakpoints(selectedBreakpoints.filter((bp) => bp !== newBreakPoint));
      }
    } else {
      setSelectedBreakpoints((prevSelected: string[]) => [...prevSelected, newBreakPoint]);
    }
  };

  const handleCanvasWidthChange = (width: number) => {
    if (canvas) {
      setCanvasDisplayWidth(width);
    } else {
      setNewWidth(width);
      setCanvasDisplayWidth(width);
    }
  };

  const breakpoint = getBreakpointValue(canvas ? canvasDisplayWidth : currentWidth).toLowerCase();

  if (breakpoints.length < 4) {
    return (
      <div className="flex items-center rounded-md">
        {map(breakpoints, (bp) => (
          <BreakpointCard
            canvas={canvas}
            {...bp}
            onClick={handleCanvasWidthChange}
            key={bp.breakpoint}
            currentBreakpoint={breakpoint}
            activeButtonClass="bg-gray-700"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between rounded-md">
      <div className="flex items-center">
        {map(
          breakpoints.filter((bp: BreakpointItemType) => includes(selectedBreakpoints, toUpper(bp.breakpoint))),
          (bp: BreakpointItemType) => (
            <BreakpointCard
              canvas={canvas}
              openDelay={openDelay}
              tooltip={tooltip}
              {...bp}
              onClick={handleCanvasWidthChange}
              key={bp.breakpoint}
              currentBreakpoint={breakpoint}
              buttonClass={buttonClass}
              activeButtonClass={activeButtonClass}
            />
          ),
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className="cursor-pointer rounded-md p-1 hover:bg-background">
            <ChevronDownIcon className="scale-90 transform" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 border-border text-xs">
          <DropdownMenuLabel>{t("Screen sizes")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {map(breakpoints, (bp: BreakpointItemType) => (
            <DropdownMenuCheckboxItem
              key={bp.breakpoint}
              disabled={bp.breakpoint === "xs"}
              onCheckedChange={() => toggleBreakpoint(toUpper(bp.breakpoint))}
              checked={includes(selectedBreakpoints, toUpper(bp.breakpoint))}
              onSelect={(event) => event.preventDefault()}>
              {t(bp.title)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
