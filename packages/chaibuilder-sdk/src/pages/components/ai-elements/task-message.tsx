"use client";

import { cn } from "~/lib/utils";
import { HTMLAttributes } from "react";
import { Shimmer } from "./shimmer";

export type TaskMessageProps = HTMLAttributes<HTMLDivElement> & {
  content: string;
  isLoading?: boolean;
};

export const TaskMessage = ({ className, content, isLoading = false, ...props }: TaskMessageProps) => {
  return (
    <div className={cn("is-assistant flex w-full max-w-[80%] flex-col gap-2", className)} {...props}>
      <div className="flex w-fit flex-col gap-2 overflow-hidden text-sm">
        <div className="flex items-center gap-2 rounded-lg border border-muted-foreground/20 bg-muted/50 p-3">
          <div className="flex flex-1 items-center gap-2">
            {isLoading && <Shimmer duration={1.5}>{content}</Shimmer>}
            {!isLoading && <div className="text-xs text-muted-foreground">{content}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
