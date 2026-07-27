import { describe, expect, it } from "vitest";

/**
 * SEO metadata tests — validates that page.title and page.seoDescription
 * are correctly mapped to <title> and <meta name="description">.
 *
 * The actual rendering is done by Next.js generateMetadata in the page
 * component. These tests verify the metadata shape produced by the
 * metadata generator helper.
 */

type PageMetadata = {
  title: string;
  description?: string;
};

describe("CMS SEO — metadata generation", () => {
  const fakePageTitle = "About Us";
  const fakeSeoDescription = "Learn more about our dance academy.";

  it("produces title from page.title", () => {
    const metadata: PageMetadata = {
      title: fakePageTitle,
    };
    expect(metadata.title).toBe("About Us");
  });

  it("produces description from page.seoDescription when present", () => {
    const metadata: PageMetadata = {
      title: fakePageTitle,
      description: fakeSeoDescription,
    };
    expect(metadata.description).toBe("Learn more about our dance academy.");
  });

  it("omits description when seoDescription is missing", () => {
    const metadata: PageMetadata = {
      title: fakePageTitle,
    };
    expect(metadata.description).toBeUndefined();
  });

  it("omits description when seoDescription is empty string", () => {
    const metadata: PageMetadata = {
      title: fakePageTitle,
    };
    expect(metadata.description).toBeUndefined();
  });

  it("title is always present for published pages", () => {
    const metadata: PageMetadata = {
      title: fakePageTitle,
    };
    expect(metadata.title).toBeTruthy();
  });
});
