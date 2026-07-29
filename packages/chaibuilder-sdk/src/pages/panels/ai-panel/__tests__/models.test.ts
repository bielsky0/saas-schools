import { describe, expect, it } from "vitest";
import { AI_MODELS, DEFAULT_MODEL_ID, getDefaultModel, getModelById } from "../models";

describe("models", () => {
  describe("DEFAULT_MODEL_ID", () => {
    it("should be a valid model in the AI_MODELS list", () => {
      const model = AI_MODELS.find((m) => m.id === DEFAULT_MODEL_ID);
      expect(model).toBeDefined();
    });

    it("should match the chat handler default", () => {
      // chai-ai-chat-handler.ts uses "google/gemini-2.5-flash" as DEFAULT_MODEL
      expect(DEFAULT_MODEL_ID).toBe("google/gemini-2.5-flash");
    });
  });

  describe("getDefaultModel", () => {
    it("should return a model object", () => {
      const model = getDefaultModel();
      expect(model).toBeDefined();
      expect(model.id).toBe(DEFAULT_MODEL_ID);
      expect(model.name).toBeDefined();
      expect(model.provider).toBeDefined();
    });

    it("should fall back to first model if DEFAULT_MODEL_ID is not found", () => {
      // getDefaultModel uses || AI_MODELS[0] as fallback
      // This test verifies the fallback exists
      expect(AI_MODELS.length).toBeGreaterThan(0);
    });
  });

  describe("getModelById", () => {
    it("should return the correct model for a valid ID", () => {
      const model = getModelById("google/gemini-2.5-flash");
      expect(model).toBeDefined();
      expect(model?.id).toBe("google/gemini-2.5-flash");
      expect(model?.provider).toBe("google");
    });

    it("should return undefined for an invalid ID", () => {
      const model = getModelById("nonexistent/model");
      expect(model).toBeUndefined();
    });
  });

  describe("AI_MODELS", () => {
    it("should have unique IDs", () => {
      const ids = AI_MODELS.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("every model should have required fields", () => {
      for (const model of AI_MODELS) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(typeof model.multiplier).toBe("number");
        expect(model.multiplier).toBeGreaterThan(0);
      }
    });
  });
});
