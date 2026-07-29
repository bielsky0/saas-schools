import clarity from "@microsoft/clarity";
import { useEffect } from "react";

declare global {
  interface Window {
    clarity: any;
  }
}

interface MicrosoftClarityProps {
  clarityId: string;
}

export function MicrosoftClarity({ clarityId }: MicrosoftClarityProps) {
  useEffect(() => {
    // Skip if no Clarity ID is provided
    if (!clarityId) {
      console.warn("Microsoft Clarity ID is not provided");
      return;
    }

    // Initialize Clarity
    clarity.init(clarityId);
  }, [clarityId]);

  return null;
}
