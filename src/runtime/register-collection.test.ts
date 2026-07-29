import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChaiBlock } from "~/types/common";
import {
  COLLECTIONS,
  CollectionFetchParams,
  getChaiCollection,
  getChaiCollections,
  registerChaiCollection,
} from "./register-collection";

describe("Collection Registration", () => {
  // Clear COLLECTIONS before each test to ensure isolation
  beforeEach(() => {
    // Clear all registered collections
    Object.keys(COLLECTIONS).forEach((key) => {
      delete COLLECTIONS[key];
    });
  });

  describe("registerChaiCollection", () => {
    it("should register a basic collection", () => {
      // Arrange
      const id = "basic";
      const collectionOptions = {
        name: "Basic Collection",
        fetch: async () => ({ items: [] }),
      };

      // Act
      registerChaiCollection(id, collectionOptions);

      // Assert
      expect(COLLECTIONS[id]).toBeDefined();
      expect(COLLECTIONS[id].id).toBe(id);
      expect(COLLECTIONS[id].name).toBe(collectionOptions.name);
      expect(COLLECTIONS[id].fetch).toBe(collectionOptions.fetch);
    });

    it("should register a collection with all optional properties", () => {
      // Arrange
      const id = "complex";
      const collectionOptions = {
        name: "Complex Collection",
        icon: "collection-icon",
        filters: [
          { id: "filter1", name: "Filter 1" },
          { id: "filter2", name: "Filter 2" },
        ],
        sort: [
          { id: "sort1", name: "Sort 1" },
          { id: "sort2", name: "Sort 2" },
        ],
        fetch: async () => ({ items: [{ id: 1, name: "Item 1" }] }),
      };

      // Act
      registerChaiCollection(id, collectionOptions);

      // Assert
      expect(COLLECTIONS[id]).toBeDefined();
      expect(COLLECTIONS[id].id).toBe(id);
      expect(COLLECTIONS[id].name).toBe(collectionOptions.name);
      expect(COLLECTIONS[id].icon).toBe(collectionOptions.icon);
      expect(COLLECTIONS[id].filters).toEqual(collectionOptions.filters);
      expect(COLLECTIONS[id].sort).toEqual(collectionOptions.sort);
      expect(COLLECTIONS[id].fetch).toBe(collectionOptions.fetch);
    });

    it("should log a warning when registering a collection with an existing id", () => {
      // Arrange
      const id = "duplicate";
      const initialOptions = {
        name: "Initial Collection",
        fetch: async () => ({ items: [] }),
      };
      const updatedOptions = {
        name: "Updated Collection",
        fetch: async () => ({ items: [{ id: 1 }] }),
      };

      // Mock console.warn
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      registerChaiCollection(id, initialOptions);
      registerChaiCollection(id, updatedOptions);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Collection ${id} already registered`);
      expect(COLLECTIONS[id].name).toBe(updatedOptions.name);
      expect(COLLECTIONS[id].fetch).toBe(updatedOptions.fetch);

      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it("should override existing collection with the same id", () => {
      // Arrange
      const id = "overridden";
      const initialOptions = {
        name: "Initial Collection",
        fetch: async () => ({ items: [] }),
      };
      const updatedOptions = {
        name: "Updated Collection",
        icon: "new-icon",
        fetch: async () => ({ items: [{ id: 1 }] }),
      };

      // Act
      registerChaiCollection(id, initialOptions);
      const initialState = { ...COLLECTIONS[id] };
      registerChaiCollection(id, updatedOptions);

      // Assert
      expect(COLLECTIONS[id].name).toBe(updatedOptions.name);
      expect(COLLECTIONS[id].name).not.toBe(initialState.name);
      expect(COLLECTIONS[id].icon).toBe(updatedOptions.icon);
      expect(COLLECTIONS[id].fetch).toBe(updatedOptions.fetch);
    });
  });

  describe("getChaiCollection", () => {
    it("should return the collection for a valid key", () => {
      // Arrange
      const id = "valid";
      const collectionOptions = {
        name: "Valid Collection",
        fetch: async () => ({ items: [] }),
      };
      registerChaiCollection(id, collectionOptions);

      // Act
      const result = getChaiCollection(id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
      expect(result?.name).toBe(collectionOptions.name);
    });

    it("should return undefined for a non-existent collection key", () => {
      // Act
      const result = getChaiCollection("non-existent");

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("getChaiCollections", () => {
    it("should return an empty array when no collections are registered", () => {
      // Act
      const result = getChaiCollections();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return all registered collections", () => {
      // Arrange
      registerChaiCollection("collection1", {
        name: "Collection 1",
        fetch: async () => ({ items: [] }),
      });
      registerChaiCollection("collection2", {
        name: "Collection 2",
        fetch: async () => ({ items: [] }),
      });
      registerChaiCollection("collection3", {
        name: "Collection 3",
        fetch: async () => ({ items: [] }),
      });

      // Act
      const result = getChaiCollections();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(["collection1", "collection2", "collection3"]);
    });

    it("should return collections in the order they were registered", () => {
      // Arrange
      registerChaiCollection("z-collection", {
        name: "Z Collection",
        fetch: async () => ({ items: [] }),
      });
      registerChaiCollection("a-collection", {
        name: "A Collection",
        fetch: async () => ({ items: [] }),
      });
      registerChaiCollection("m-collection", {
        name: "M Collection",
        fetch: async () => ({ items: [] }),
      });

      // Act
      const result = getChaiCollections();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("z-collection");
      expect(result[1].id).toBe("a-collection");
      expect(result[2].id).toBe("m-collection");
    });
  });

  describe("COLLECTIONS object", () => {
    it("should be empty by default", () => {
      // Assert
      expect(Object.keys(COLLECTIONS)).toHaveLength(0);
    });

    it("should store collections as key-value pairs", () => {
      // Arrange
      registerChaiCollection("key1", {
        name: "Collection 1",
        fetch: async () => ({ items: [] }),
      });
      registerChaiCollection("key2", {
        name: "Collection 2",
        fetch: async () => ({ items: [] }),
      });

      // Assert
      expect(Object.keys(COLLECTIONS)).toHaveLength(2);
      expect(COLLECTIONS["key1"]).toBeDefined();
      expect(COLLECTIONS["key2"]).toBeDefined();
    });
  });

  describe("Integration tests", () => {
    it("should allow registering and retrieving collections", () => {
      // Arrange
      registerChaiCollection("products", {
        name: "Products",
        icon: "shopping-cart",
        fetch: async () => ({ items: [] }),
      });

      // Act
      const collection = getChaiCollection("products");
      const allCollections = getChaiCollections();

      // Assert
      expect(collection).toBeDefined();
      expect(collection?.id).toBe("products");
      expect(collection?.name).toBe("Products");
      expect(collection?.icon).toBe("shopping-cart");
      expect(allCollections).toHaveLength(1);
      expect(allCollections[0]).toBe(collection);
    });

    it("should handle complex collection with fetch function", async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        items: [
          { id: 1, name: "Product 1" },
          { id: 2, name: "Product 2" },
        ],
        totalItems: 2,
      });

      const mockParams: CollectionFetchParams = {
        block: { _id: "block1", _type: "block" } as ChaiBlock,
        inBuilder: true,
        draft: false,
        lang: "en",
        pageProps: {
          slug: "test-page",
          params: { category: "electronics" },
        },
      };

      // Act
      registerChaiCollection("products", {
        name: "Products",
        filters: [{ id: "category", name: "Category" }],
        sort: [{ id: "price", name: "Price" }],
        fetch: mockFetch,
      });

      const collection = getChaiCollection("products");

      // Assert
      expect(collection).toBeDefined();

      // Test fetch function
      if (collection?.fetch) {
        const result = await collection.fetch(mockParams);
        expect(mockFetch).toHaveBeenCalledWith(mockParams);

        expect(result).toHaveProperty("items");
        expect(result).toHaveProperty("totalItems");
        expect(result.totalItems).toBe(2);

        const { items } = result;
        expect(Array.isArray(items)).toBe(true);
        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(1);
        expect(items[0].name).toBe("Product 1");
        expect(items[1].id).toBe(2);
        expect(items[1].name).toBe("Product 2");
      }
    });

    it("should handle different return types from fetch function", async () => {
      // Arrange
      interface Product {
        id: number;
        name: string;
        price: number;
      }

      const mockFetch = vi.fn().mockResolvedValue({
        items: [
          { id: 1, name: "Product 1", price: 99.99 },
          { id: 2, name: "Product 2", price: 149.99 },
        ],
        totalItems: 2,
      });

      // Act
      registerChaiCollection<Product>("typed-products", {
        name: "Typed Products",
        fetch: mockFetch,
      });

      const collection = getChaiCollection("typed-products");

      // Assert
      expect(collection).toBeDefined();

      // Test fetch function with typed return
      if (collection?.fetch) {
        const result = await collection.fetch({} as CollectionFetchParams);

        expect(result).toHaveProperty("items");
        expect(result).toHaveProperty("totalItems");
        expect(result.totalItems).toBe(2);

        const { items } = result;
        expect(Array.isArray(items)).toBe(true);
        expect(items).toHaveLength(2);

        // Type checking
        expect(typeof items[0].id).toBe("number");
        expect(typeof items[0].name).toBe("string");
        expect(typeof items[0].price).toBe("number");
      }
    });
  });
});
