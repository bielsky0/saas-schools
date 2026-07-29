import { getBlocksFromHTML, getSanitizedHTML } from "~/core/import-html/html-to-json";

describe("getSanitizedHTML", () => {
  test("should remove $name attributes", () => {
    const input = '<div $name="test" data-chai-name="test">Content</div>';
    const expected = '<div data-chai-name="test">Content</div>';
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should remove escaped quotes and backslashes from attributes", () => {
    const input = '<div class=\\"test\\" data-value=\\"123\\">Content</div>';
    const expected = '<div class="test" data-value="123">Content</div>';
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should replace escaped newlines and whitespace characters with spaces", () => {
    const input = "Line 1\\nLine 2\\n<div>\\n  Content\\n</div>";
    const expected = "Line 1 Line 2 <div> Content </div>";
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should remove script tags and their content", () => {
    const input = '<div>Before<script>alert("test");</script>After</div>';
    const expected = "<div>BeforeAfter</div>";
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should convert body tags to div tags", () => {
    const input = '<body class="body-class">Content</body>';
    const expected = '<div class="body-class">Content</div>';
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should remove excessive whitespace between tags", () => {
    const input = "<div>  <span>  Content  </span>  </div>";
    const expected = "<div><span> Content </span></div>";
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should handle multiple attributes with escaped values", () => {
    const input = '<div class=\\"c1\\" id=\\"id1\\" data-value=\\"test\\">Content</div>';
    const expected = '<div class="c1" id="id1" data-value="test">Content</div>';
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should handle empty input", () => {
    expect(getSanitizedHTML("")).toBe("");
  });

  test("should preserve valid HTML structure", () => {
    const input = `
      <div class="container">
        <h1>Title</h1>
        <p>Paragraph</p>
      </div>
    `;
    const expected = '<div class="container"><h1>Title</h1><p>Paragraph</p></div>';
    expect(getSanitizedHTML(input)).toBe(expected);
  });

  test("should handle HTML with escaped special characters", () => {
    const input = '<div data-special=\\"<>/?\\">Content</div>';
    const expected = '<div data-special="<>/?">Content</div>';
    expect(getSanitizedHTML(input)).toBe(expected);
  });
});

describe("getBlocksFromHTML - RichText handling", () => {
  test("should detect div with 'rte' class as RichText block", () => {
    const html = '<div class="rte"><p>Rich text content</p><strong>Bold text</strong></div>';
    const blocks = getBlocksFromHTML(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]._type).toBe("Paragraph");
    expect(blocks[0].content).toContain("<p>Rich text content</p>");
    expect(blocks[0].content).toContain("<strong>Bold text</strong>");
  });

  test("should detect div with 'rte' class among other classes as Paragraph block", () => {
    const html = '<div class="container rte text-lg"><p>Content</p></div>';
    const blocks = getBlocksFromHTML(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]._type).toBe("Paragraph");
  });

  test("should detect element with data-chai-richtext attribute as Paragraph block", () => {
    const html = "<div data-chai-richtext><p>Rich text content</p></div>";
    const blocks = getBlocksFromHTML(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]._type).toBe("Paragraph");
  });

  test("should not treat regular div without rte class as Paragraph", () => {
    const html = '<div class="container"><p>Regular content</p></div>';
    const blocks = getBlocksFromHTML(html);

    expect(blocks[0]._type).toBe("Box");
  });
});
