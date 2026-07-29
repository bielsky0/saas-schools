import type { ReactNode } from "react";

import "@chaibuilder/sdk/styles";
import "./public-output.css";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html className="scroll-smooth" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
