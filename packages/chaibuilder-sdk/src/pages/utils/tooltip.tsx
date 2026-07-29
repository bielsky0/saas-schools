import { Tooltip as _Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

export default function Tooltip({
  children,
  content,
  side = "bottom",
  delayDuration = 700,
  showTooltip = true,
}: {
  children: any;
  content: any;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  showTooltip?: boolean;
}) {
  if (!showTooltip) return children;

  return (
    <TooltipProvider>
      <_Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={10}>
          <p>{content}</p>
        </TooltipContent>
      </_Tooltip>
    </TooltipProvider>
  );
}
