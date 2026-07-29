import type { ReactNode } from "react";

import "@chaibuilder/sdk/styles";
import "./public-output.css";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html className="scroll-smooth" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          :root {
            --background: 0 0% 100%;
            --foreground: 0 0% 9%;
            --card: 0 0% 100%;
            --card-foreground: 0 0% 9%;
            --popover: 0 0% 100%;
            --popover-foreground: 0 0% 9%;
            --primary: 0 0% 9%;
            --primary-foreground: 0 0% 98%;
            --secondary: 0 0% 96%;
            --secondary-foreground: 0 0% 9%;
            --muted: 0 0% 96%;
            --muted-foreground: 0 0% 45%;
            --accent: 0 0% 96%;
            --accent-foreground: 0 0% 9%;
            --destructive: 0 72% 45%;
            --destructive-foreground: 0 0% 98%;
            --border: 0 0% 89%;
            --input: 0 0% 89%;
            --ring: 0 0% 63%;
            --radius: 0.625rem;
          }
        `}</style>
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
