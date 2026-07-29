import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./builder.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chai Builder Editor",
  description: "Chai Builder Editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
