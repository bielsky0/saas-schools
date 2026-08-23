import { describe, expect, it } from "vitest";
import { getFieldPriority, hideFieldsInUiSchema } from "./field-priority";

describe("field-priority", () => {
  const properties = {
    title: {},
    subtitle: {},
    image: {},
    variant: {},
    filter: {},
  };

  it("keeps required and filled fields visible", () => {
    const result = getFieldPriority(properties, { title: "Hello", variant: "primary" }, ["title"]);
    expect(result.visible).toEqual(expect.arrayContaining(["title", "variant"]));
    expect(result.extra).toEqual(expect.arrayContaining(["subtitle", "image", "filter"]));
  });

  it("treats empty-string, null, empty array and empty object as empty", () => {
    const result = getFieldPriority(properties, {
      title: "",
      subtitle: null,
      image: [],
      variant: {},
    });
    expect(result.extra).toEqual(expect.arrayContaining(["title", "subtitle", "image", "variant"]));
  });

  it("keeps booleans and zero visible", () => {
    const result = getFieldPriority(properties, { variant: false, title: 0 });
    expect(result.visible).toEqual(expect.arrayContaining(["variant", "title"]));
  });

  it("returns empty extra for undefined properties or formData", () => {
    expect(getFieldPriority(undefined, undefined)).toEqual({ visible: [], extra: [] });
    expect(getFieldPriority(properties, undefined)).toEqual({
      visible: [],
      extra: Object.keys(properties),
    });
  });

  it("hides the given fields in a uiSchema copy", () => {
    const uiSchema = { title: { "ui:widget": "text" } };
    const next = hideFieldsInUiSchema(uiSchema, ["image", "filter"]);
    expect(next.image["ui:hidden"]).toBe(true);
    expect(next.filter["ui:hidden"]).toBe(true);
    expect(next.title["ui:hidden"]).toBeUndefined();
    expect(uiSchema).not.toHaveProperty("image");
  });
});