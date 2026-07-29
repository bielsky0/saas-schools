import { describe, expect, it } from "vitest";
import {
  hasBindings,
  isSimplePath,
  resolveBindingPath,
  resolveExpressionIndex,
  toEtaTemplate,
  renderBinding,
  resolveStringBinding,
} from "./binding-engine";

describe("hasBindings", () => {
  it("should detect bindings in a string", () => {
    expect(hasBindings("Hello {{user.name}}")).toBe(true);
  });

  it("should return false for strings without bindings", () => {
    expect(hasBindings("Hello World")).toBe(false);
  });

  it("should detect multiple bindings", () => {
    expect(hasBindings("{{a}} and {{b}}")).toBe(true);
  });

  it("should return false for empty string", () => {
    expect(hasBindings("")).toBe(false);
  });

  it("should detect expression bindings", () => {
    expect(hasBindings("{{a > 1 ? 'yes' : 'no'}}")).toBe(true);
  });
});

describe("isSimplePath", () => {
  it("should return true for simple dot paths", () => {
    expect(isSimplePath("user.name")).toBe(true);
    expect(isSimplePath("a.b.c.d")).toBe(true);
  });

  it("should return true for single identifiers", () => {
    expect(isSimplePath("name")).toBe(true);
  });

  it("should return true for $index paths", () => {
    expect(isSimplePath("$index")).toBe(true);
    expect(isSimplePath("$index.name")).toBe(true);
  });

  it("should return false for expressions with operators", () => {
    expect(isSimplePath("a > 1")).toBe(false);
    expect(isSimplePath("a + b")).toBe(false);
    expect(isSimplePath("a === b")).toBe(false);
  });

  it("should return false for ternary expressions", () => {
    expect(isSimplePath("a ? 'yes' : 'no'")).toBe(false);
  });

  it("should return false for function calls", () => {
    expect(isSimplePath("fn()")).toBe(false);
    expect(isSimplePath("a.toString()")).toBe(false);
  });

  it("should return false for bracket access", () => {
    expect(isSimplePath("a[0]")).toBe(false);
  });
});

describe("resolveBindingPath", () => {
  it("should return binding as-is when index is -1", () => {
    expect(resolveBindingPath("user.name", -1, "")).toBe("user.name");
  });

  it("should resolve $index to repeater item", () => {
    expect(resolveBindingPath("$index", 0, "{{items}}")).toBe("items.0");
    expect(resolveBindingPath("$index", 2, "{{items}}")).toBe("items.2");
  });

  it("should resolve $index.field to repeater item field", () => {
    expect(resolveBindingPath("$index.name", 1, "{{items}}")).toBe("items.1.name");
  });

  it("should resolve $index with nested repeater key", () => {
    expect(resolveBindingPath("$index.title", 0, "{{data.posts}}")).toBe("data.posts.0.title");
  });

  it("should resolve $index with deeply nested field", () => {
    expect(resolveBindingPath("$index.author.name", 2, "{{posts}}")).toBe("posts.2.author.name");
  });

  it("should not modify non-$index bindings even with index set", () => {
    expect(resolveBindingPath("user.name", 0, "{{items}}")).toBe("user.name");
  });
});

describe("resolveExpressionIndex", () => {
  it("should return expression as-is when index is -1", () => {
    expect(resolveExpressionIndex("a > 1 ? 'yes' : 'no'", -1, "")).toBe("a > 1 ? 'yes' : 'no'");
  });

  it("should return expression as-is when repeaterKey is empty", () => {
    expect(resolveExpressionIndex("a > 1", 0, "")).toBe("a > 1");
  });

  it("should replace $index. with safeGet accessor", () => {
    const result = resolveExpressionIndex("$index.name.length > 3 ? 'long' : 'short'", 1, "{{items}}");
    expect(result).toBe('safeGet(it, "items.1").name.length > 3 ? \'long\' : \'short\'');
  });

  it("should replace standalone $index with safeGet accessor", () => {
    const result = resolveExpressionIndex("$index > 3", 2, "{{items}}");
    expect(result).toBe('safeGet(it, "items.2") > 3');
  });

  it("should replace multiple $index occurrences", () => {
    const result = resolveExpressionIndex("$index.a + $index.b", 0, "{{items}}");
    expect(result).toBe('safeGet(it, "items.0").a + safeGet(it, "items.0").b');
  });
});

describe("toEtaTemplate", () => {
  it("should wrap simple paths in safeGet", () => {
    expect(toEtaTemplate("Hello {{user.name}}", -1, "")).toBe('Hello {{safeGet(it, "user.name") ?? ""}}');
  });

  it("should pass expressions through directly", () => {
    expect(toEtaTemplate("{{a > 1 ? 'yes' : 'no'}}", -1, "")).toBe("{{a > 1 ? 'yes' : 'no'}}");
  });

  it("should handle mixed simple paths and expressions", () => {
    const result = toEtaTemplate("Name: {{user.name}}, Status: {{user.age > 18 ? 'adult' : 'minor'}}", -1, "");
    expect(result).toBe('Name: {{safeGet(it, "user.name") ?? ""}}, Status: {{user.age > 18 ? \'adult\' : \'minor\'}}');
  });

  it("should resolve $index in simple paths", () => {
    expect(toEtaTemplate("{{$index.name}}", 1, "{{items}}")).toBe('{{safeGet(it, "items.1.name") ?? ""}}');
  });

  it("should resolve $index in expressions", () => {
    const result = toEtaTemplate("{{$index.name.length > 3 ? 'long' : 'short'}}", 1, "{{items}}");
    expect(result).toContain('safeGet(it, "items.1")');
  });
});

describe("renderBinding", () => {
  it("should render simple path bindings", () => {
    expect(renderBinding("Hello {{user.name}}", { user: { name: "John" } }, -1, "")).toBe("Hello John");
  });

  it("should render multiple bindings", () => {
    expect(renderBinding("{{first}} {{last}}", { first: "John", last: "Doe" }, -1, "")).toBe("John Doe");
  });

  it("should render empty string for missing paths", () => {
    expect(renderBinding("Hello {{user.missing}}", { user: { name: "John" } }, -1, "")).toBe("Hello ");
  });

  it("should render empty string for deeply missing paths", () => {
    expect(renderBinding("{{a.b.c.d}}", { a: {} }, -1, "")).toBe("");
  });

  it("should render ternary expressions", () => {
    expect(renderBinding("{{age > 18 ? 'adult' : 'minor'}}", { age: 25 }, -1, "")).toBe("adult");
    expect(renderBinding("{{age > 18 ? 'adult' : 'minor'}}", { age: 10 }, -1, "")).toBe("minor");
  });

  it("should render expressions with string methods", () => {
    expect(renderBinding("{{name.toUpperCase()}}", { name: "john" }, -1, "")).toBe("JOHN");
  });

  it("should render expressions with array length", () => {
    expect(renderBinding("{{items.length}}", { items: [1, 2, 3] }, -1, "")).toBe("3");
  });

  it("should render expressions with math", () => {
    expect(renderBinding("{{price * quantity}}", { price: 10, quantity: 3 }, -1, "")).toBe("30");
  });

  it("should render $index in repeater context", () => {
    expect(renderBinding("Item: {{$index}}", { items: ["a", "b", "c"] }, 1, "{{items}}")).toBe("Item: b");
  });

  it("should render $index.field in repeater context", () => {
    const data = { items: [{ name: "Alice" }, { name: "Bob" }] };
    expect(renderBinding("{{$index.name}}", data, 0, "{{items}}")).toBe("Alice");
    expect(renderBinding("{{$index.name}}", data, 1, "{{items}}")).toBe("Bob");
  });

  it("should render $index expressions in repeater context", () => {
    const data = { items: [{ name: "Al" }, { name: "Bobby" }] };
    expect(renderBinding("{{$index.name.length > 3 ? 'long' : 'short'}}", data, 0, "{{items}}")).toBe("short");
    expect(renderBinding("{{$index.name.length > 3 ? 'long' : 'short'}}", data, 1, "{{items}}")).toBe("long");
  });

  it("should render static text without bindings as-is", () => {
    expect(renderBinding("Hello World", {}, -1, "")).toBe("Hello World");
  });

  it("should handle boolean expression results", () => {
    expect(renderBinding("{{a === b}}", { a: 1, b: 1 }, -1, "")).toBe("true");
    expect(renderBinding("{{a === b}}", { a: 1, b: 2 }, -1, "")).toBe("false");
  });

  it("should handle numeric expression results", () => {
    expect(renderBinding("{{a + b}}", { a: 1, b: 2 }, -1, "")).toBe("3");
  });

  // Error handling
  it("should return empty string for malformed expressions", () => {
    expect(renderBinding("{{a >}}", {}, -1, "")).toBe("");
  });

  it("should return empty string for incomplete ternary", () => {
    expect(renderBinding("{{a ? 'yes' :}}", {}, -1, "")).toBe("");
  });

  it("should return empty string for syntax errors", () => {
    expect(renderBinding("{{if (true) {}}", {}, -1, "")).toBe("");
  });

  it("should return empty string when referencing undefined top-level var in expression", () => {
    expect(renderBinding("{{missing.prop ? 'yes' : 'no'}}", {}, -1, "")).toBe("");
  });

  it("should handle expression typed mid-edit gracefully", () => {
    expect(renderBinding("{{user.name.}}", { user: { name: "John" } }, -1, "")).toBe("");
    expect(renderBinding("{{user.}}", { user: { name: "John" } }, -1, "")).toBe("");
  });

  it("should handle empty binding gracefully", () => {
    expect(renderBinding("{{}}", {}, -1, "")).toBe("");
  });
});

describe("resolveStringBinding", () => {
  // Simple path resolution
  it("should resolve simple path bindings", () => {
    expect(resolveStringBinding("Hello {{user.name}}", { user: { name: "John" } }, -1, "")).toBe("Hello John");
  });

  it("should resolve nested paths", () => {
    expect(resolveStringBinding("{{a.b.c}}", { a: { b: { c: "deep" } } }, -1, "")).toBe("deep");
  });

  it("should return empty string for missing paths", () => {
    expect(resolveStringBinding("Hello {{missing}}", {}, -1, "")).toBe("Hello ");
  });

  it("should return string as-is when no bindings", () => {
    expect(resolveStringBinding("Hello World", {}, -1, "")).toBe("Hello World");
  });

  // Array handling
  it("should return array when binding resolves to array", () => {
    const data = { items: ["a", "b", "c"] };
    expect(resolveStringBinding("{{items}}", data, -1, "")).toEqual(["a", "b", "c"]);
  });

  it("should return array of objects", () => {
    const data = { users: [{ name: "A" }, { name: "B" }] };
    expect(resolveStringBinding("{{users}}", data, -1, "")).toEqual([{ name: "A" }, { name: "B" }]);
  });

  // Image property handling
  it("should fully replace image property value", () => {
    expect(
      resolveStringBinding("https://default.jpg{{user.avatar}}", { user: { avatar: "https://avatar.jpg" } }, -1, "", "image"),
    ).toBe("https://avatar.jpg");
  });

  it("should fully replace mobileImage property value", () => {
    expect(
      resolveStringBinding(
        "https://default.jpg{{user.avatar}}",
        { user: { avatar: "https://mobile.jpg" } },
        -1,
        "",
        "mobileImage",
      ),
    ).toBe("https://mobile.jpg");
  });

  it("should not fully replace non-image properties", () => {
    expect(
      resolveStringBinding("https://default.com{{page.slug}}", { page: { slug: "/about" } }, -1, "", "url"),
    ).toBe("https://default.com/about");
  });

  // Repeater $index
  it("should resolve $index in repeater context", () => {
    expect(resolveStringBinding("{{$index}}", { items: ["a", "b", "c"] }, 1, "{{items}}")).toBe("b");
  });

  it("should resolve $index.field in repeater context", () => {
    const data = { items: [{ value: "apple" }, { value: "banana" }] };
    expect(resolveStringBinding("Item: {{$index.value}}", data, 1, "{{items}}")).toBe("Item: banana");
  });

  // Expressions
  it("should evaluate ternary expressions", () => {
    expect(resolveStringBinding("{{age > 18 ? 'adult' : 'minor'}}", { age: 25 }, -1, "")).toBe("adult");
  });

  it("should evaluate expressions with $index in repeater", () => {
    const data = { items: [{ score: 50 }, { score: 90 }] };
    expect(resolveStringBinding("{{$index.score > 80 ? 'pass' : 'fail'}}", data, 0, "{{items}}")).toBe("fail");
    expect(resolveStringBinding("{{$index.score > 80 ? 'pass' : 'fail'}}", data, 1, "{{items}}")).toBe("pass");
  });

  // Error handling
  it("should return empty string for broken expressions", () => {
    expect(resolveStringBinding("{{broken >}}", {}, -1, "")).toBe("");
  });

  it("should return empty string for undefined variable in expression", () => {
    expect(resolveStringBinding("{{notDefined.prop}}", {}, -1, "")).toBe("");
  });

  // Multiple bindings
  it("should resolve multiple bindings in one string", () => {
    expect(
      resolveStringBinding("{{first}} {{last}}", { first: "John", last: "Doe" }, -1, ""),
    ).toBe("John Doe");
  });

  it("should handle mix of resolved and missing bindings", () => {
    expect(
      resolveStringBinding("{{name}} - {{missing}}", { name: "John" }, -1, ""),
    ).toBe("John - ");
  });

  // Edge cases
  it("should handle numeric values", () => {
    expect(resolveStringBinding("Count: {{count}}", { count: 42 }, -1, "")).toBe("Count: 42");
  });

  it("should handle boolean values", () => {
    expect(resolveStringBinding("Active: {{active}}", { active: true }, -1, "")).toBe("Active: true");
  });

  it("should handle zero value", () => {
    expect(resolveStringBinding("{{count}}", { count: 0 }, -1, "")).toBe("0");
  });
});
