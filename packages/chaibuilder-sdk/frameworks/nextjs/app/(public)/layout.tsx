import { registerFonts } from "@/fonts";
import type { Metadata } from "next";
import "./public.css";

registerFonts();

export const metadata: Metadata = {
  title: "Chai Builder",
  description: "Chai Builder",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
