import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { registerChaiBlock, registerChaiBlockProps } from "~/runtime";
import { SectionHoverCard, SectionPreview } from "./section-preview";

const registerPreviewBlock = (type: string, content: string) => {
  const Component = ({ content: text }: { content: string }) => (
    <div data-testid="preview-content">{text}</div>
  );
  registerChaiBlock(Component as never, {
    type,
    label: type,
    group: "Test",
    category: "core",
    props: registerChaiBlockProps({
      properties: {
        content: { type: "string", default: content },
      },
    }),
  });
};

registerPreviewBlock("TestPreviewBlock", "Hello preview");
registerPreviewBlock("TestDataBlock", "Should not render");

const withDataProvider = () => {
  const Component = () => <div>provider content</div>;
  registerChaiBlock(Component as never, {
    type: "TestDataBlock",
    label: "TestDataBlock",
    group: "Test",
    category: "core",
    dataProvider: () => ({}) as never,
    props: registerChaiBlockProps({
      properties: {
        content: { type: "string", default: "Should not render" },
      },
    }),
  });
};
withDataProvider();

describe("SectionPreview", () => {
  it("renders block content from default props", () => {
    render(<SectionPreview type="TestPreviewBlock" />);
    expect(screen.getByTestId("preview-content").textContent).toBe("Hello preview");
  });

  it("falls back to a placeholder for unknown types", () => {
    render(<SectionPreview type="NoSuchBlock" />);
    expect(screen.getByText("NoSuchBlock")).toBeTruthy();
  });

  it("falls back to a placeholder for data-provider blocks", () => {
    render(<SectionPreview type="TestDataBlock" />);
    expect(screen.getByText("TestDataBlock")).toBeTruthy();
    expect(screen.queryByText("provider content")).toBeNull();
  });
});

describe("SectionHoverCard", () => {
  it("renders the trigger content and nests a preview", () => {
    render(
      <SectionHoverCard type="TestPreviewBlock">
        <button>My section card</button>
      </SectionHoverCard>,
    );
    expect(screen.getByRole("button", { name: "My section card" })).toBeTruthy();
  });
});
