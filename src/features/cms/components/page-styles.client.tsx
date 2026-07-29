"use client";

export function PageStyles({ css }: { css: string }) {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
