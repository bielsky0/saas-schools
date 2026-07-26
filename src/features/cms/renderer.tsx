import React, { type ComponentType } from "react";

import { getBlockComponent, isRegisteredBlock } from "./block-registry";
import { sanitizeLexicalJson } from "./sanitize-lexical";

const MAX_RENDER_DEPTH = 10;

let _richText: ComponentType<{ data: unknown }> | null = null;

async function getRichText(): Promise<ComponentType<{ data: unknown }>> {
  if (!_richText) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("@payloadcms/richtext-lexical/react");
    _richText = (mod.LexicalRenderer ?? mod.default) as ComponentType<{ data: unknown }>;
  }
  return _richText;
}

type RendererProps = {
  blocks: unknown[];
  depth?: number;
};

export function CmsRenderer({ blocks, depth = 0 }: RendererProps) {
  if (!Array.isArray(blocks)) return null;
  if (depth > MAX_RENDER_DEPTH) {
    return <div className="text-muted-foreground text-sm">Nesting depth exceeded</div>;
  }

  return (
    <>
      {blocks.map((block, index) => {
        if (!block || typeof block !== "object") return null;

        const b = block as Record<string, unknown>;
        const blockType = b.blockType as string | undefined;

        if (!blockType || !isRegisteredBlock(blockType)) {
          return (
            <div key={index} className="border-destructive/30 bg-destructive/5 rounded-md border p-4 text-sm text-destructive">
              Unknown block: {String(blockType ?? "undefined")}
            </div>
          );
        }

        const Component = getBlockComponent(blockType);
        if (!Component) {
          return (
            <div key={index} className="text-muted-foreground text-sm">
              Unsupported block: {blockType}
            </div>
          );
        }

        const sanitized = sanitizeLexicalJson(b);

        return (
          <Component
            key={index}
            {...(sanitized as Record<string, unknown>)}
            renderBlock={(nestedBlock: unknown, nestedDepth: number) => (
              <CmsRenderer blocks={[nestedBlock]} depth={nestedDepth + 1} />
            )}
            RenderLexical={(data: unknown) => <LexicalRenderer data={data} />}
            depth={depth + 1}
          />
        );
      })}
    </>
  );
}

function LexicalRenderer({ data }: { data: unknown }) {
  if (!data) return null;

  const sanitized = sanitizeLexicalJson(data);

  return (
    <React.Suspense fallback={<div className="text-muted-foreground text-sm italic">Loading text content...</div>}>
      <LexicalContent data={sanitized} />
    </React.Suspense>
  );
}

async function LexicalContent({ data }: { data: unknown }) {
  const RichText = await getRichText();
  return <RichText data={data} />;
}
