"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Copy, Check } from "lucide-react";

/**
 * Copy-the-registration-link action for the group-types table.
 *
 * Client-only: the clipboard call must run in the browser, so this button cannot
 * live in the server page component (`page.tsx`) — passing an `onClick` from a
 * Server Component to a Client Component is what triggered
 * "Event handlers cannot be passed to Client Component props".
 */
export function CopyGroupLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/zapisy/${slug}`);
    setCopied(true);
    toast.success("Skopiowano link");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="text-green-600 hover:text-green-700"
      aria-label="Kopiuj link do zapisów"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}