import type { ReactNode } from "react";

import "@chaibuilder/sdk/styles";

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml" />
      <link rel="alternate" type="application/atom+xml" title="Atom" href="/feed.atom" />
      <link rel="alternate" type="application/json" title="JSON Feed" href="/feed.json" />
      {children}
    </>
  );
}
