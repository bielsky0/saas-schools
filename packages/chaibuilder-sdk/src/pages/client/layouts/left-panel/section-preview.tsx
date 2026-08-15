import { memo, useMemo, type ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { RenderChaiBlocks } from "~/render";
import { getBlockDefaultProps, getRegisteredChaiBlock } from "~/runtime";
import type { ChaiBlock } from "~/types/common";

export const SECTION_PREVIEW_WIDTH = 240;
export const SECTION_PREVIEW_HEIGHT = 320;

const FallbackThumbnail = memo(({ type }: { type: string }) => (
  <div
    className="flex h-full w-full items-center justify-center rounded-md border border-dashed"
    style={{ width: SECTION_PREVIEW_WIDTH, height: SECTION_PREVIEW_HEIGHT }}
    aria-hidden="true">
    <span className="px-4 text-center text-sm font-medium text-muted-foreground">{type}</span>
  </div>
));
FallbackThumbnail.displayName = "SectionPreviewFallback";

const buildPreviewBlock = (type: string): ChaiBlock | null => {
  const registered = getRegisteredChaiBlock(type);
  if (registered?.dataProvider) return null;
  const defaults = getBlockDefaultProps(type);
  if (!defaults || Object.keys(defaults).length === 0) return null;
  return {
    _id: `section-preview-${type}`,
    _type: type,
    _parent: null,
    ...defaults,
  } as ChaiBlock;
};

export const SectionPreview = memo(({ type }: { type: string }) => {
  const block = useMemo(() => buildPreviewBlock(type), [type]);

  if (!block) return <FallbackThumbnail type={type} />;

  return (
    <div
      className="pointer-events-none select-none overflow-hidden rounded-md border bg-background"
      style={{ width: SECTION_PREVIEW_WIDTH, height: SECTION_PREVIEW_HEIGHT }}
      aria-hidden="true">
      <RenderChaiBlocks blocks={[block]} lang="en" fallbackLang="en" />
    </div>
  );
});
SectionPreview.displayName = "SectionPreview";

export const SectionHoverCard = memo(
  ({ type, children }: { type: string; children: ReactNode }) => {
    return (
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>{children}</HoverCardTrigger>
        <HoverCardContent
          className="w-auto border-0 bg-transparent p-0 shadow-none"
          align="start"
          sideOffset={8}>
          <SectionPreview type={type} />
        </HoverCardContent>
      </HoverCard>
    );
  },
);
SectionHoverCard.displayName = "SectionHoverCard";
