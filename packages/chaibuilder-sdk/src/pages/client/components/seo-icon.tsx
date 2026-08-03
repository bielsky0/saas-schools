import { cn } from "~/core/functions/common-functions";

export const SeoIcon = ({ className }: { className?: string }) => (
  <svg
    stroke="currentColor"
    fill="none"
    className={cn("h-4 w-4", className)}
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M7 8h-3a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-3"></path>
    <path d="M14 16h-4v-8h4"></path>
    <path d="M11 12h2"></path>
    <path d="M17 8m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"></path>
  </svg>
);

export default SeoIcon;
