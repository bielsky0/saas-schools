import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getBlocksFromHTML } from "~/core/import-html/html-to-json";
import { useAddBlock } from "~/hooks/use-add-block";
import { useRemoveBlocks } from "~/hooks/use-remove-blocks";
import { useReplaceBlock } from "~/hooks/use-replace-block";
import { Message } from "./ai-panel-helper";

interface ActionData {
  type: "ADD" | "REMOVE" | "EDIT";
  parentId?: string;
  position?: number;
  ids?: string[];
  blockId?: string;
  html?: string;
  message?: string;
}

interface StreamState {
  isInAction: boolean;
  currentAction: ActionData | null;
  htmlBuffer: string;
  isCapturingHtml: boolean;
}

export const useProcessAiStream = () => {
  // TODO: Verify correct SDK function signatures
  const { addPredefinedBlock } = useAddBlock();
  const replaceBlock = useReplaceBlock();
  const removeBlocks = useRemoveBlocks();
  const queryClient = useQueryClient();

  const handleAddAction = async (action: ActionData, html: string) => {
    if (!html) return;

    const blocks = getBlocksFromHTML(html);
    await addPredefinedBlock(blocks, action.parentId, action.position);
  };

  const handleEditAction = async (action: ActionData, html: string) => {
    if (!action.blockId || !html) return;
    const blocks = getBlocksFromHTML(html);
    await replaceBlock(action.blockId, blocks);
  };

  const handleRemoveAction = async (action: ActionData) => {
    if (!action.ids || action.ids.length === 0) return;
    await removeBlocks(action.ids);
  };

  let canvasElement: HTMLElement | null = null;
  /** Block hidden with display:none during EDIT stream preview; restored on abort/cleanup */
  let editHiddenBlockEl: HTMLElement | null = null;

  const applyStreamCanvasLayout = (el: HTMLElement) => {
    el.style.width = "100%";
    el.style.maxWidth = "100%";
    el.style.boxSizing = "border-box";
    el.style.display = "block";
  };

  const cleanupStreamCanvasPreview = () => {
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    const doc = iframeDoc?.contentDocument;
    doc?.querySelectorAll("[data-stream-canvas]").forEach((node) => node.remove());
    if (editHiddenBlockEl) {
      editHiddenBlockEl.style.removeProperty("display");
      editHiddenBlockEl = null;
    }
    canvasElement = null;
  };

  const getCanvasElement = (parentId?: string, position?: number): HTMLElement | null => {
    // Always create a fresh canvas element for proper positioning
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    if (!iframeDoc) {
      return null;
    }
    const iframeDocument = iframeDoc?.contentDocument;
    if (!iframeDocument) {
      return null;
    }

    // Remove any existing canvas elements first
    const existingCanvases = iframeDocument.querySelectorAll("[data-stream-canvas]");
    existingCanvases.forEach((canvas) => canvas.remove());

    let targetContainer: HTMLElement | null = null;

    if (parentId && parentId !== "undefined") {
      // Try to find the parent block
      targetContainer = iframeDocument.querySelector(`[data-block-id="${parentId}"]`);
    }

    // If no parent found, fall back to body
    if (!targetContainer) {
      targetContainer = iframeDocument.body;
    }

    if (!targetContainer) {
      return null;
    }

    // Create new canvas element
    canvasElement = iframeDocument.createElement("div");
    canvasElement.setAttribute("data-stream-canvas", "true");
    applyStreamCanvasLayout(canvasElement);

    // Position the canvas based on the position parameter
    if (position !== undefined && position >= 0 && targetContainer.children) {
      const insertIndex = Math.min(position, targetContainer.children.length);
      if (insertIndex < targetContainer.children.length) {
        targetContainer.insertBefore(canvasElement, targetContainer.children[insertIndex]);
      } else {
        targetContainer.appendChild(canvasElement);
      }
    } else {
      // Default to appending at the end
      targetContainer.appendChild(canvasElement);
    }

    return canvasElement;
  };

  const getCanvasElementForEdit = (blockId: string): HTMLElement | null => {
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    if (!iframeDoc) {
      return null;
    }
    const iframeDocument = iframeDoc?.contentDocument;
    if (!iframeDocument) {
      return null;
    }

    // Remove any existing canvas elements first
    const existingCanvases = iframeDocument.querySelectorAll("[data-stream-canvas]");
    existingCanvases.forEach((canvas) => canvas.remove());

    // Find the block to edit
    const targetBlock = iframeDocument.querySelector(`[data-block-id="${blockId}"]`);
    if (!targetBlock) {
      return null;
    }

    // Create new canvas element to replace the target block temporarily
    canvasElement = iframeDocument.createElement("div");
    canvasElement.setAttribute("data-stream-canvas", "true");
    applyStreamCanvasLayout(canvasElement);

    // Insert the canvas element right after the target block
    targetBlock.parentNode?.insertBefore(canvasElement, targetBlock.nextSibling);

    // Hide the original block during streaming
    const hidden = targetBlock as HTMLElement;
    hidden.style.display = "none";
    editHiddenBlockEl = hidden;

    return canvasElement;
  };

  const scrollElementIntoView = (element: HTMLElement) => {
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    const iframeWindow = iframeDoc?.contentWindow;
    if (iframeWindow) {
      // Always scroll to keep the bottom of the element in view as content streams
      element.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const streamHtmlToCanvasForAdd = (html: string, parentId?: string, position?: number) => {
    const element = getCanvasElement(parentId, position);
    if (element) {
      element.innerHTML = html;
      scrollElementIntoView(element);
    }
  };

  const streamHtmlToCanvasForEdit = (html: string, blockId: string) => {
    const element = getCanvasElementForEdit(blockId);
    if (element) {
      element.innerHTML = html;
      scrollElementIntoView(element);
    }
  };

  const parseActionLine = (line: string): ActionData | null => {
    const actionMatch = line.match(/^--ACTION=(.+)--$/);
    if (!actionMatch) return null;

    const actionContent = actionMatch[1];

    // Extract IDS first if present

    let actionParts: string[] = actionContent.replace(/--/g, "").split("|");

    const type = actionParts[0] as "ADD" | "REMOVE" | "EDIT";
    const action: ActionData = { type };

    // Parse other parts
    actionParts.forEach((part) => {
      const trimmedPart = part.trim();
      if (trimmedPart.startsWith("PARENT=")) {
        const parentId = trimmedPart.substring(7);
        action.parentId = parentId === "undefined" ? undefined : parentId;
      } else if (trimmedPart.startsWith("POS=")) {
        action.position = parseInt(trimmedPart.substring(4));
      } else if (trimmedPart.startsWith("ID=")) {
        action.blockId = trimmedPart.substring(3);
      } else if (trimmedPart.startsWith("IDS=")) {
        action.ids = trimmedPart
          .substring(4)
          .split(",")
          .map((id) => id.trim());
      }
    });

    return action;
  };

  return useCallback(
    async (
      reader: ReadableStreamDefaultReader,
      setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
    ) => {
      cleanupStreamCanvasPreview();

      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";
      let isStarted = false;
      let currentTaskMessageId: string | null = null;

      const state: StreamState = {
        isInAction: false,
        currentAction: null,
        htmlBuffer: "",
        isCapturingHtml: false,
      };

      const processLine = async (line: string) => {
        const trimmedLine = line.trim();

        if (trimmedLine === "--START--") {
          isStarted = true;
          return;
        }

        if (!isStarted) return;

        if (trimmedLine === "--END--") {
          // Process any remaining action
          if (state.currentAction && (state.htmlBuffer || state.currentAction.type === "REMOVE")) {
            await processAction(state.currentAction, state.htmlBuffer);
          }

          // Clean up canvas
          if (canvasElement) {
            canvasElement.remove();
            canvasElement = null;
          }
          editHiddenBlockEl = null;
          return;
        }

        if (trimmedLine.startsWith("--THINKING=")) {
          const thinkingContent = trimmedLine.substring(11);

          // Update the reasoning message or create it if it doesn't exist
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage && lastMessage.role === "assistant" && lastMessage.isReasoning) {
              // Update existing reasoning message
              lastMessage.content = thinkingContent;
              lastMessage.isStreaming = false;
            } else {
              // Create new reasoning message
              const reasoningMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: thinkingContent,
                isReasoning: true,
                isStreaming: false,
              };
              updated.push(reasoningMessage);
            }

            return updated;
          });
          return;
        }

        if (trimmedLine.startsWith("--TASK=")) {
          const taskContent = trimmedLine.substring(7);

          // Create task message with loading state using unique ID
          const taskMessageId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const taskMessage: Message = {
            id: taskMessageId,
            role: "assistant",
            content: taskContent.replace(/--$/, ""),
            isTask: true,
            isTaskLoading: true,
            isTaskCompleted: false,
          };

          currentTaskMessageId = taskMessageId;
          setMessages((prev) => [...prev, taskMessage]);
          return;
        }

        if (trimmedLine.startsWith("--MSG=")) {
          const messageContent = trimmedLine.substring(6);

          // --MSG= creates plain assistant messages
          const newMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: messageContent.replace(/--$/g, ""),
            isReasoning: false,
            isStreaming: false,
          };

          setMessages((prev) => [...prev, newMessage]);
          return;
        }

        if (trimmedLine.startsWith("--ACTION=")) {
          // Process previous action if exists
          if (state.currentAction && (state.htmlBuffer || state.currentAction.type === "REMOVE")) {
            await processAction(state.currentAction, state.htmlBuffer);
          }

          state.currentAction = parseActionLine(trimmedLine);
          state.htmlBuffer = "";
          state.isInAction = true;
          return;
        }

        if (trimmedLine === "--ENDACTION--") {
          if (state.currentAction && (state.htmlBuffer || state.currentAction.type === "REMOVE")) {
            await processAction(state.currentAction, state.htmlBuffer);
          }

          // Remove completed task message from the list
          if (currentTaskMessageId) {
            setMessages((prev) => {
              return prev.map((msg) => {
                if (!msg.isTask) return msg;
                return { ...msg, isTaskCompleted: true };
              });
            });
            currentTaskMessageId = null;
          }

          state.currentAction = null;
          state.htmlBuffer = "";
          state.isInAction = false;
          return;
        }

        if (trimmedLine === "--HTML--") {
          state.isCapturingHtml = true;
          return;
        }

        if (trimmedLine === "--ENDHTML--") {
          state.isCapturingHtml = false;
          return;
        }

        // Handle inline HTML (--HTML--content--ENDHTML-- on same line)
        if (trimmedLine.startsWith("--HTML--") && trimmedLine.includes("--ENDHTML--")) {
          const htmlMatch = trimmedLine.match(/^--HTML--(.+?)--ENDHTML--$/);
          if (htmlMatch && state.currentAction) {
            const htmlContent = htmlMatch[1];
            state.htmlBuffer += htmlContent;

            // Stream HTML to canvas for real-time preview
            if (state.currentAction.type === "ADD") {
              streamHtmlToCanvasForAdd(state.htmlBuffer, state.currentAction.parentId, state.currentAction.position);
            } else if (state.currentAction.type === "EDIT" && state.currentAction.blockId) {
              streamHtmlToCanvasForEdit(state.htmlBuffer, state.currentAction.blockId);
            }
          }
          return;
        }

        // Capture HTML content
        if (state.isCapturingHtml && state.currentAction) {
          state.htmlBuffer += line + "\n";

          // Stream HTML to canvas for real-time preview
          if (state.currentAction.type === "ADD") {
            streamHtmlToCanvasForAdd(state.htmlBuffer, state.currentAction.parentId, state.currentAction.position);
          } else if (state.currentAction.type === "EDIT" && state.currentAction.blockId) {
            streamHtmlToCanvasForEdit(state.htmlBuffer, state.currentAction.blockId);
          }
        }
      };

      const processAction = async (action: ActionData, html: string) => {
        try {
          switch (action.type) {
            case "ADD":
              await handleAddAction(action, html);
              break;
            case "EDIT":
              await handleEditAction(action, html);
              break;
            case "REMOVE":
              await handleRemoveAction(action);
              break;
          }
          setMessages((prev) => prev.filter((m) => !m.isTask));
        } catch (er) {
          console.log(er);
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            await processLine(line);
          }
        }

        // Process any remaining content in buffer
        if (buffer) {
          await processLine(buffer);
        }
        queryClient.invalidateQueries({
          queryKey: ["AI_USAGE"],
        });
      } catch (e) {
        console.log(e);
      } finally {
        cleanupStreamCanvasPreview();
      }
    },
    [removeBlocks],
  );
};
