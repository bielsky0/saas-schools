import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import { startTransition, useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CanvasTopBar } from "~/core/components/canvas/topbar/canvas-top-bar";
import { LanguageButton } from "~/routes/demo/lang-button";
import RightTop from "~/routes/demo/right-top";

const Logo = () => {
  return (
    <div className="flex w-96 items-center gap-2">
      <a href="https://chaibuilder.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <img src="/chaibuilder-logo.png" alt="Chai Builder" width={32} height={32} className="rounded-md" />
        <span className="font-mono font-bold tracking-tight">ChaiBuilder</span>
      </a>

      <a href="https://github.com/chaibuilder/sdk" target="_blank" rel="noopener noreferrer">
        <img src="https://img.shields.io/github/stars/chaibuilder/sdk" alt="Chai Builder" className="rounded-md" />
      </a>
    </div>
  );
};

const DemoAlert = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("demo-alert-dismissed");
    if (dismissed === "true") {
      startTransition(() => setIsVisible(false));
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("demo-alert-dismissed", "true");
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      variant="default"
      className="fixed bottom-2 left-2 z-50 h-fit max-w-[310px] border-b border-border px-4 py-2 text-blue-600">
      <AlertDescription className="flex flex-col items-start gap-2 text-xs leading-tight">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <InfoCircledIcon className="h-4 w-4" />
            <span className="font-bold">Demo mode</span>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
            aria-label="Dismiss alert">
            <Cross2Icon className="h-3 w-3" />
          </button>
        </div>
        <span>Changes are saved in your browser local storage.</span>
      </AlertDescription>
    </Alert>
  );
};

export default function Topbar() {
  return (
    <div className="flex w-full items-center justify-between px-2">
      <Logo />
      <div>
        <CanvasTopBar />
      </div>
      <div className="flex items-center gap-2">
        <LanguageButton />
        <RightTop />
      </div>
      <DemoAlert />
    </div>
  );
}
