import { describe, expect, it } from "vitest";
import { Message } from "../ai-panel-helper";

/**
 * Tests for the conversation history filtering and capping logic
 * used in ai-panel-default-lang.tsx handleSend.
 *
 * The logic:
 *   [...messages, userMessageObj]
 *     .filter(m => !m.isReasoning && !m.isTask && (m.role === "user" || m.role === "assistant"))
 *     .slice(-MAX_HISTORY)
 *     .map(m => ({ role: m.role, content: m.content }))
 */
const MAX_HISTORY = 10;

function buildConversationMessages(messages: Message[], userMessageObj: Message) {
  return [...messages, userMessageObj]
    .filter((m) => !m.isReasoning && !m.isTask && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

const makeUserMsg = (id: string, content: string): Message => ({
  id,
  role: "user",
  content,
});

const makeAssistantMsg = (id: string, content: string): Message => ({
  id,
  role: "assistant",
  content,
});

const makeReasoningMsg = (id: string): Message => ({
  id,
  role: "assistant",
  content: "Thinking...",
  isReasoning: true,
  isStreaming: true,
});

const makeTaskMsg = (id: string, content: string): Message => ({
  id,
  role: "assistant",
  content,
  isTask: true,
  isTaskLoading: true,
});

describe("conversation history", () => {
  it("should include only user and assistant messages", () => {
    const messages: Message[] = [
      makeUserMsg("1", "create a hero"),
      makeReasoningMsg("2"),
      makeAssistantMsg("3", "Here is a hero section"),
      makeTaskMsg("4", "Adding section..."),
    ];
    const newMsg = makeUserMsg("5", "make it bigger");

    const result = buildConversationMessages(messages, newMsg);

    expect(result).toEqual([
      { role: "user", content: "create a hero" },
      { role: "assistant", content: "Here is a hero section" },
      { role: "user", content: "make it bigger" },
    ]);
  });

  it("should filter out reasoning messages", () => {
    const messages: Message[] = [
      makeUserMsg("1", "hello"),
      makeReasoningMsg("2"),
    ];
    const newMsg = makeUserMsg("3", "world");

    const result = buildConversationMessages(messages, newMsg);

    expect(result.every((m) => m.content !== "Thinking...")).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("should filter out task messages", () => {
    const messages: Message[] = [
      makeUserMsg("1", "create a navbar"),
      makeTaskMsg("2", "Generating navbar..."),
      makeAssistantMsg("3", "Done"),
    ];
    const newMsg = makeUserMsg("4", "add a logo");

    const result = buildConversationMessages(messages, newMsg);

    expect(result.every((m) => m.content !== "Generating navbar...")).toBe(true);
  });

  it("should cap at MAX_HISTORY (10) messages", () => {
    const messages: Message[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push(makeUserMsg(`u${i}`, `user msg ${i}`));
      messages.push(makeAssistantMsg(`a${i}`, `assistant msg ${i}`));
    }
    const newMsg = makeUserMsg("final", "last message");

    const result = buildConversationMessages(messages, newMsg);

    expect(result).toHaveLength(MAX_HISTORY);
    // Should include the latest message
    expect(result[result.length - 1].content).toBe("last message");
  });

  it("should keep all messages when under the cap", () => {
    const messages: Message[] = [
      makeUserMsg("1", "first"),
      makeAssistantMsg("2", "response"),
    ];
    const newMsg = makeUserMsg("3", "second");

    const result = buildConversationMessages(messages, newMsg);

    expect(result).toHaveLength(3);
  });

  it("should work with empty history", () => {
    const messages: Message[] = [];
    const newMsg = makeUserMsg("1", "hello");

    const result = buildConversationMessages(messages, newMsg);

    expect(result).toEqual([{ role: "user", content: "hello" }]);
  });

  it("should strip extra fields and only return role and content", () => {
    const messages: Message[] = [
      { id: "1", role: "user", content: "hello", userMessage: "display text" },
    ];
    const newMsg = makeUserMsg("2", "world");

    const result = buildConversationMessages(messages, newMsg);

    expect(Object.keys(result[0])).toEqual(["role", "content"]);
  });

  it("should preserve message order with newest at end", () => {
    const messages: Message[] = [
      makeUserMsg("1", "first"),
      makeAssistantMsg("2", "first response"),
      makeUserMsg("3", "second"),
      makeAssistantMsg("4", "second response"),
    ];
    const newMsg = makeUserMsg("5", "third");

    const result = buildConversationMessages(messages, newMsg);

    expect(result.map((m) => m.content)).toEqual([
      "first",
      "first response",
      "second",
      "second response",
      "third",
    ]);
  });
});
