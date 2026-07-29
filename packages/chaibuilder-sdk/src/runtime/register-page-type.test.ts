import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_TYPES, getChaiPageType, getChaiPageTypes, registerChaiPageType } from "~/runtime/register-page-type";
import { ChaiPageType } from "~/types/actions";

describe("Page Type Registration", () => {
  // Clear PAGE_TYPES before each test to ensure isolation
  beforeEach(() => {
    // Clear all registered page types
    Object.keys(PAGE_TYPES).forEach((key) => {
      delete PAGE_TYPES[key];
    });
  });

  describe("registerChaiPageType", () => {
    it("should register a basic page type", () => {
      // Arrange
      const key = "basic";
      const pageTypeOptions: Omit<ChaiPageType, "key"> = {
        name: "Basic Page",
      };

      // Act
      registerChaiPageType(key, pageTypeOptions);

      // Assert
      expect(PAGE_TYPES[key]).toBeDefined();
      expect(PAGE_TYPES[key].key).toBe(key);
      expect(PAGE_TYPES[key].name).toBe(pageTypeOptions.name);
      expect(PAGE_TYPES[key].hasSlug).toBe(true); // Default value
    });

    it("should register a page type with all optional properties", () => {
      // Arrange
      const key = "complex";
      const pageTypeOptions: Omit<ChaiPageType, "key"> = {
        name: "Complex Page",
        helpText: "This is a complex page type",
        icon: "page-icon",
        dynamicSegments: "(?:/[\\d]+)?",
        dynamicSlug: "dynamic-slug",
        search: vi.fn(),
        resolveLink: vi.fn(),
        onCreate: vi.fn(),
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        dataProvider: vi.fn(),
      };

      // Act
      registerChaiPageType(key, pageTypeOptions);

      // Assert
      expect(PAGE_TYPES[key]).toBeDefined();
      expect(PAGE_TYPES[key].key).toBe(key);
      expect(PAGE_TYPES[key].name).toBe(pageTypeOptions.name);
      expect(PAGE_TYPES[key].helpText).toBe(pageTypeOptions.helpText);
      expect(PAGE_TYPES[key].icon).toBe(pageTypeOptions.icon);
      expect(PAGE_TYPES[key].hasSlug).toBe(true);
      expect(PAGE_TYPES[key].dynamicSegments).toBe(pageTypeOptions.dynamicSegments);
      expect(PAGE_TYPES[key].dynamicSlug).toBe(pageTypeOptions.dynamicSlug);
      expect(PAGE_TYPES[key].search).toBe(pageTypeOptions.search);
      expect(PAGE_TYPES[key].resolveLink).toBe(pageTypeOptions.resolveLink);
      expect(PAGE_TYPES[key].onCreate).toBe(pageTypeOptions.onCreate);
      expect(PAGE_TYPES[key].onUpdate).toBe(pageTypeOptions.onUpdate);
      expect(PAGE_TYPES[key].onDelete).toBe(pageTypeOptions.onDelete);
      expect(PAGE_TYPES[key].dataProvider).toBe(pageTypeOptions.dataProvider);
    });

    it("should override existing page type with the same key", () => {
      // Arrange
      const key = "overridden";
      const initialOptions: Omit<ChaiPageType, "key"> = {
        name: "Initial Page",
      };
      const updatedOptions: Omit<ChaiPageType, "key"> = {
        name: "Updated Page",
        helpText: "This page was updated",
      };

      // Act
      registerChaiPageType(key, initialOptions);
      const initialState = { ...PAGE_TYPES[key] };
      registerChaiPageType(key, updatedOptions);

      // Assert
      expect(PAGE_TYPES[key].name).toBe(updatedOptions.name);
      expect(PAGE_TYPES[key].name).not.toBe(initialState.name);
      expect(PAGE_TYPES[key].helpText).toBe(updatedOptions.helpText);
    });

    it("should handle name as a function returning Promise<string>", async () => {
      // Arrange
      const key = "async-name";
      const nameFunction = async () => "Async Page Name";
      const pageTypeOptions: Omit<ChaiPageType, "key"> = {
        name: nameFunction,
      };

      // Act
      registerChaiPageType(key, pageTypeOptions);

      // Assert
      expect(PAGE_TYPES[key]).toBeDefined();
      expect(typeof PAGE_TYPES[key].name).toBe("function");
      const resolvedName = await (PAGE_TYPES[key].name as () => Promise<string>)();
      expect(resolvedName).toBe("Async Page Name");
    });
  });

  describe("getChaiPageType", () => {
    it("should return the registered page type by key", () => {
      // Arrange
      const key = "get-test";
      const pageTypeOptions: Omit<ChaiPageType, "key"> = {
        name: "Get Test Page",
      };
      registerChaiPageType(key, pageTypeOptions);

      // Act
      const result = getChaiPageType(key);

      // Assert
      expect(result).toBeDefined();
      expect(result?.key).toBe(key);
      expect(result?.name).toBe(pageTypeOptions.name);
    });

    it("should return undefined for non-existent page type", () => {
      // Act
      const result = getChaiPageType("non-existent" as any);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("getChaiPageTypes", () => {
    it("should return an empty array when no page types are registered", () => {
      // Act
      const result = getChaiPageTypes();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return all registered page types", () => {
      // Arrange
      registerChaiPageType("page1", { name: "Page 1" });
      registerChaiPageType("page2", { name: "Page 2" });
      registerChaiPageType("page3", { name: "Page 3" });

      // Act
      const result = getChaiPageTypes();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((p: ChaiPageType) => p.key)).toEqual(["page1", "page2", "page3"]);
    });

    it("should return page types in the order they were registered", () => {
      // Arrange
      registerChaiPageType("z-page", { name: "Z Page" });
      registerChaiPageType("a-page", { name: "A Page" });
      registerChaiPageType("m-page", { name: "M Page" });

      // Act
      const result = getChaiPageTypes();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].key).toBe("z-page");
      expect(result[1].key).toBe("a-page");
      expect(result[2].key).toBe("m-page");
    });
  });

  describe("PAGE_TYPES object", () => {
    it("should be empty by default", () => {
      // Assert
      expect(Object.keys(PAGE_TYPES)).toHaveLength(0);
    });

    it("should store page types as key-value pairs", () => {
      // Arrange
      registerChaiPageType("key1", { name: "Page 1" });
      registerChaiPageType("key2", { name: "Page 2" });

      // Assert
      expect(Object.keys(PAGE_TYPES)).toHaveLength(2);
      expect(PAGE_TYPES["key1"]).toBeDefined();
      expect(PAGE_TYPES["key2"]).toBeDefined();
    });
  });

  describe("Integration tests", () => {
    it("should allow registering and retrieving page types", () => {
      // Arrange
      registerChaiPageType("blog", {
        name: "Blog",
        dynamicSegments: "(?:/[\\d]+)?",
      });

      // Act
      const pageType = getChaiPageType("blog");
      const allPageTypes = getChaiPageTypes();

      // Assert
      expect(pageType).toBeDefined();
      expect(pageType?.key).toBe("blog");
      expect(pageType?.name).toBe("Blog");
      expect(allPageTypes).toHaveLength(1);
      expect(allPageTypes[0]).toBe(pageType);
    });

    it("should handle complex page type with callbacks", async () => {
      // Arrange
      const mockSearch = vi.fn().mockResolvedValue([{ id: "1", name: "Test Result" }]);
      const mockResolveLink = vi.fn().mockResolvedValue("/test/1");
      const mockOnCreate = vi.fn().mockResolvedValue(undefined);
      const mockDataProvider = vi.fn().mockResolvedValue({ data: "test data" });
      const mockGetDynamicPages = vi.fn().mockResolvedValue([
        { id: "1", slug: "dynamic-page-1", name: "Dynamic Page 1" },
        { id: "2", slug: "dynamic-page-2", name: "Dynamic Page 2" },
      ]);

      // Act
      registerChaiPageType("complex", {
        name: "Complex Page",
        search: mockSearch,
        resolveLink: mockResolveLink,
        onCreate: mockOnCreate,
        dataProvider: mockDataProvider,
        getDynamicPages: mockGetDynamicPages,
      });

      const pageType = getChaiPageType("complex");

      // Assert
      expect(pageType).toBeDefined();

      // Test search callback
      if (pageType?.search) {
        const searchResults = await pageType.search("test");
        expect(mockSearch).toHaveBeenCalledWith("test");
        expect(Array.isArray(searchResults)).toBe(true);
      }

      // Test resolveLink callback
      if (pageType?.resolveLink) {
        const link = await pageType.resolveLink("1", true, "en");
        expect(mockResolveLink).toHaveBeenCalledWith("1", true, "en");
        expect(link).toBe("/test/1");
      }

      // Test getDynamicPages callback
      if (pageType?.getDynamicPages) {
        const dynamicPages = await pageType.getDynamicPages({ query: "test" });
        expect(mockGetDynamicPages).toHaveBeenCalledWith({ query: "test" });
        expect(Array.isArray(dynamicPages)).toBe(true);
        expect(dynamicPages).toHaveLength(2);
        expect(dynamicPages[0].id).toBe("1");
        expect(dynamicPages[0].slug).toBe("dynamic-page-1");
        expect(dynamicPages[0].name).toBe("Dynamic Page 1");
      }

      // Test onCreate callback
      if (pageType?.onCreate) {
        await pageType.onCreate({
          id: "1",
          name: "New Page",
          slug: "new-page",
          lang: "en",
          online: true,
        });
        expect(mockOnCreate).toHaveBeenCalledWith({
          id: "1",
          name: "New Page",
          slug: "new-page",
          lang: "en",
          online: true,
        });
      }

      // Test dataProvider callback
      if (pageType?.dataProvider) {
        const data = await pageType.dataProvider({
          lang: "en",
          draft: false,
          inBuilder: true,
          pageProps: {} as any,
        });
        expect(mockDataProvider).toHaveBeenCalledWith({
          lang: "en",
          draft: false,
          inBuilder: true,
          pageProps: {},
        });
        expect(data).toEqual({ data: "test data" });
      }
    });
  });

  describe("getDynamicPages", () => {
    it("should handle getDynamicPages with query parameter", async () => {
      // Arrange
      const mockGetDynamicPages = vi.fn().mockResolvedValue([
        { id: "1", slug: "blog-post-1", name: "Blog Post 1" },
        { id: "2", slug: "blog-post-2", name: "Blog Post 2" },
      ]);

      registerChaiPageType("blog", {
        name: "Blog",
        getDynamicPages: mockGetDynamicPages,
      });

      const pageType = getChaiPageType("blog");

      // Act & Assert
      if (pageType?.getDynamicPages) {
        const dynamicPages = await pageType.getDynamicPages({ query: "post" });

        // Verify the mock was called with correct parameters
        expect(mockGetDynamicPages).toHaveBeenCalledWith({ query: "post" });

        // Verify the returned data structure
        expect(Array.isArray(dynamicPages)).toBe(true);
        expect(dynamicPages).toHaveLength(2);
        expect(dynamicPages[0]).toEqual({
          id: "1",
          slug: "blog-post-1",
          name: "Blog Post 1",
        });
        expect(dynamicPages[1]).toEqual({
          id: "2",
          slug: "blog-post-2",
          name: "Blog Post 2",
        });
      } else {
        // Fail the test if getDynamicPages is not defined
        expect(pageType?.getDynamicPages).toBeDefined();
      }
    });

    it("should handle getDynamicPages with uuid parameter", async () => {
      // Arrange
      const mockGetDynamicPages = vi.fn().mockImplementation(({ uuid }) => {
        if (uuid === "123") {
          return Promise.resolve([{ id: "123", slug: "specific-page", name: "Specific Page" }]);
        }
        return Promise.resolve([]);
      });

      registerChaiPageType("product", {
        name: "Product",
        getDynamicPages: mockGetDynamicPages,
      });

      const pageType = getChaiPageType("product");

      // Act & Assert
      if (pageType?.getDynamicPages) {
        const dynamicPages = await pageType.getDynamicPages({ uuid: "123" });

        // Verify the mock was called with correct parameters
        expect(mockGetDynamicPages).toHaveBeenCalledWith({ uuid: "123" });

        // Verify the returned data structure
        expect(Array.isArray(dynamicPages)).toBe(true);
        expect(dynamicPages).toHaveLength(1);
        expect(dynamicPages[0]).toEqual({
          id: "123",
          slug: "specific-page",
          name: "Specific Page",
        });

        // Test with non-existent UUID
        const emptyResult = await pageType.getDynamicPages({ uuid: "non-existent" });
        expect(mockGetDynamicPages).toHaveBeenCalledWith({ uuid: "non-existent" });
        expect(emptyResult).toEqual([]);
      } else {
        // Fail the test if getDynamicPages is not defined
        expect(pageType?.getDynamicPages).toBeDefined();
      }
    });

    it("should handle getDynamicPages with both query and uuid parameters", async () => {
      // Arrange
      const mockGetDynamicPages = vi
        .fn()
        .mockResolvedValue([{ id: "abc", slug: "combined-search", name: "Combined Search Result" }]);

      registerChaiPageType("article", {
        name: "Article",
        getDynamicPages: mockGetDynamicPages,
      });

      const pageType = getChaiPageType("article");

      // Act & Assert
      if (pageType?.getDynamicPages) {
        const dynamicPages = await pageType.getDynamicPages({
          query: "search",
          uuid: "abc",
        });

        // Verify the mock was called with correct parameters
        expect(mockGetDynamicPages).toHaveBeenCalledWith({
          query: "search",
          uuid: "abc",
        });

        // Verify the returned data structure
        expect(Array.isArray(dynamicPages)).toBe(true);
        expect(dynamicPages).toHaveLength(1);
        expect(dynamicPages[0]).toEqual({
          id: "abc",
          slug: "combined-search",
          name: "Combined Search Result",
        });
      } else {
        // Fail the test if getDynamicPages is not defined
        expect(pageType?.getDynamicPages).toBeDefined();
      }
    });

    it("should handle getDynamicPages with primaryPage property", async () => {
      // Arrange
      const mockGetDynamicPages = vi.fn().mockResolvedValue([
        {
          id: "child1",
          slug: "child-page",
          name: "Child Page",
          primaryPage: "parent123",
        },
      ]);

      registerChaiPageType("hierarchical", {
        name: "Hierarchical",
        getDynamicPages: mockGetDynamicPages,
      });

      const pageType = getChaiPageType("hierarchical");

      // Act & Assert
      if (pageType?.getDynamicPages) {
        const dynamicPages = await pageType.getDynamicPages({});

        // Verify the mock was called
        expect(mockGetDynamicPages).toHaveBeenCalledWith({});

        // Verify the returned data structure with primaryPage
        expect(dynamicPages[0].primaryPage).toBe("parent123");
        expect(dynamicPages[0]).toEqual({
          id: "child1",
          slug: "child-page",
          name: "Child Page",
          primaryPage: "parent123",
        });
      } else {
        // Fail the test if getDynamicPages is not defined
        expect(pageType?.getDynamicPages).toBeDefined();
      }
    });

    it("should handle error in getDynamicPages function", async () => {
      // Arrange
      const mockGetDynamicPages = vi.fn().mockRejectedValue(new Error("Failed to fetch dynamic pages"));

      registerChaiPageType("error-page", {
        name: "Error Page",
        getDynamicPages: mockGetDynamicPages,
      });

      const pageType = getChaiPageType("error-page");

      // Act & Assert
      if (pageType?.getDynamicPages) {
        await expect(pageType.getDynamicPages({})).rejects.toThrow("Failed to fetch dynamic pages");
        expect(mockGetDynamicPages).toHaveBeenCalledWith({});
      } else {
        // Fail the test if getDynamicPages is not defined
        expect(pageType?.getDynamicPages).toBeDefined();
      }
    });
  });
});
