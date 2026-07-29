import { cn } from "~/core/functions/common-functions";
import { registerChaiBlockProps } from "~/runtime";
import { ChaiBlockComponentProps } from "~/types/blocks";

import { CodeIcon } from "@radix-ui/react-icons";
import { useEffect, useRef } from "react";

export type CustomScriptBlockProps = {
  scripts: string;
};

const CustomScript = (props: ChaiBlockComponentProps<CustomScriptBlockProps>) => {
  const { scripts, inBuilder, blockProps } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inBuilder || !scripts) return;
    const container = containerRef.current;
    if (!container) return;

    const existingScripts = container.querySelectorAll("script");
    existingScripts.forEach((s) => s.remove());

    // Advanced feature: dynamically inject and execute custom scripts in preview/live mode.
    // We parse the HTML string for <script> tags and recreate them as real DOM elements
    // so the browser executes them. Plain dangerouslySetInnerHTML would NOT execute scripts.
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = scripts;
    const scriptElements = tempDiv.querySelectorAll("script");
    scriptElements.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      newScript.textContent = oldScript.textContent;
      container.appendChild(newScript);
    });
  }, [scripts, inBuilder]);

  if (inBuilder)
    return (
      <div {...blockProps}>
        <div className={cn("pointer-events-none flex flex-col items-center justify-center p-2", "")}>
          <div className="h-full w-full rounded bg-gray-200 p-1 dark:bg-gray-800">
            <p className="text-left text-xs text-gray-400">
              Scripts will be only executed in preview and live mode. Place your script at the bottom of the
            </p>
          </div>
        </div>
      </div>
    );
  return <div ref={containerRef} />;
};

const Config = {
  type: "CustomScript",
  description: "similar to a script element in HTML",
  label: "Custom Script",
  category: "core",
  icon: CodeIcon,
  hidden: true,
  group: "advanced",
  props: registerChaiBlockProps({
    properties: {
      scripts: {
        type: "string",
        title: "Script",
        default: "",
        format: "code",
        placeholder: "<script>console.log('Hello, world!');</script>",
      },
    },
  }),
};

export { CustomScript as Component, Config };
