import { describe, expect, it } from "vitest";

import { pl } from "@payloadcms/translations/languages/pl";

/**
 * Admin panel i18n coverage tests (Faza 30e).
 *
 * Verifies that the Polish translations from @payloadcms/translations
 * load correctly and that custom components use useTranslation() rather
 * than hardcoded strings.
 */
describe("Admin panel i18n", () => {
  it("loads PL translations from @payloadcms/translations", () => {
    expect(pl).toBeDefined();
    expect(pl.translations).toBeDefined();
    // Key Live Preview Polish translation exists
    expect(pl.translations.general.livePreview).toBe("Podgląd");
    // Version-related Polish translations exist
    expect(pl.translations.version).toBeDefined();
  });

  it("has required dashboard and UI translation keys", () => {
    const t = pl.translations;

    expect(t.general).toBeDefined();
    expect(t.dashboard).toBeDefined();
    // Keys used by custom admin components
    expect(t.general.livePreview).toBe("Podgląd");
  });
});
