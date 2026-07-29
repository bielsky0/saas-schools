"use client";

import { ChevronDownIcon, GearIcon, ImageIcon, StackIcon, TextIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import React, { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TooltipProvider } from "~/components/ui/tooltip";
import { BlockAttributesEditor } from "~/core/components/settings/new-panel/block-attributes-editor";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import {
  ChaiBlockPropsEditor,
  ChaiBlockStyleEditor,
  ChaiBuilderCanvas,
  ChaiOutline,
  ChaiScreenSizes,
  ChaiUndoRedo,
} from "~/core/main";
import { usePubSub } from "~/hooks/use-pub-sub";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";

const BlockEditor = () => {
  const [showAttributes, setShowAttributes] = useState(true);
  const selectedBlock = useSelectedBlock();
  return (
    <>
      <ChaiBlockPropsEditor />
      <ChaiBlockStyleEditor />
      {selectedBlock ? (
        <>
          <div
            onClick={() => setShowAttributes(!showAttributes)}
            className="flex cursor-default items-center justify-between border-b border-gray-300 py-2 text-sm font-bold hover:bg-gray-50">
            <span>Attributes</span>
            <span>
              <ChevronDownIcon className={"h-4 w-4 text-gray-500 " + (showAttributes ? "rotate-180" : "")} />
            </span>
          </div>
          {showAttributes && <BlockAttributesEditor />}
        </>
      ) : null}
    </>
  );
};

export default function CustomLayout() {
  const [activePanelIndex, setActivePanelIndex] = useState<number | null>(0);
  const { t } = useTranslation();
  const [, setSelectedIds] = useSelectedBlockIds();

  useEffect(() => {
    setTimeout(() => {
      const canvasIframe = document.getElementById("canvas-iframe") as HTMLIFrameElement;
      if (!canvasIframe) return;
      const iframeDoc = canvasIframe.contentDocument || canvasIframe.contentWindow?.document;
      if (!iframeDoc) return;
      // Inject CSS inside iframe
      const style = iframeDoc.createElement("style");
      style.innerHTML = `
        /* Match by ID */
        #active-inline-editing-element {
          outline: 2px solid #60A5FA !important;  /* blue-300 */
          outline-offset: 2px !important;
        }
      `;
      iframeDoc.head.appendChild(style);
    }, 400);
  }, []);

  // PubSub listener for GOTO_BLOCK_SETTINGS event
  usePubSub(CHAI_BUILDER_EVENTS.GOTO_BLOCK_SETTINGS, (id?: string) => {
    if (id) {
      setSelectedIds([id]);
      setActivePanelIndex(1);
    }
  });

  const menuItems = [
    { icon: <StackIcon className="h-6 w-6" />, label: "Outline", component: ChaiOutline },
    { icon: <GearIcon className="h-6 w-6" />, label: "Settings", component: BlockEditor },
    { icon: <TextIcon className="h-6 w-6" />, label: "Typography", component: () => <div>Typography</div> },
    { icon: <ImageIcon className="h-6 w-6" />, label: "Images", component: () => <div>Images</div> },
  ];

  const handleMenuItemClick = (index: number) => {
    setActivePanelIndex(activePanelIndex === index ? null : index);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex h-16 items-center justify-between bg-neutral-900 px-4 text-white">
          <h1 className="ml-4 font-bold">Custom Layout Example</h1>
          <div className={`flex items-center space-x-2`}>
            <ChaiScreenSizes
              buttonClass={"text-yellow-500 hover:text-yellow-500"}
              activeButtonClass={"text-green-500 hover:text-green-500"}
            />
            |
            <ChaiUndoRedo />
          </div>
          <div className="space-x-2">buttons</div>
        </div>

        <div className="flex max-h-full flex-1">
          {/* Sidebar */}
          <div className="flex w-16 flex-col items-center bg-neutral-900 py-4">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className={`mb-4 rounded-lg p-2 text-white transition-colors ${
                  activePanelIndex === index ? "bg-blue-500 text-white" : "hover:bg-gray-300"
                }`}
                onClick={() => handleMenuItemClick(index)}>
                {item.icon}
              </button>
            ))}
          </div>

          {/* Side Panel */}
          <motion.div
            className="h-full max-h-full overflow-hidden border-r border-gray-300 bg-white"
            initial={{ width: 300 }}
            animate={{ width: activePanelIndex !== null ? 300 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}>
            {activePanelIndex !== null && (
              <ScrollArea className="h-full">
                <div className="flex flex-col p-4">
                  <h2 className="h-10 text-base font-bold">{t(menuItems[activePanelIndex].label)}</h2>

                  <div className="flex-1">
                    <Suspense fallback={<div>Loading...</div>}>
                      {React.createElement(menuItems[activePanelIndex].component, {})}
                    </Suspense>
                  </div>
                </div>
              </ScrollArea>
            )}
          </motion.div>

          {/* Main Content / Canvas */}
          <motion.div
            className="flex-1 bg-gray-100"
            animate={{ marginLeft: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}>
            <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-transparent">
              <div className="mt-1 w-full flex-1">
                <Suspense fallback={<div>Loading...</div>}>
                  <ChaiBuilderCanvas />
                </Suspense>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
