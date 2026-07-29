import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TooltipProvider } from "~/components/ui/tooltip";
import PageManagerSearchAndFilter from "~/pages/client/components/page-manager/page-manager-search-and-filter";

const mockUsePageTypes = vi.fn();

vi.mock("~/pages/hooks/project/use-page-types", () => ({
  usePageTypes: () => mockUsePageTypes(),
}));

vi.mock("~/pages/hooks/utils/use-page-expand-manager", () => ({
  usePageExpandManager: () => ({
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    expandedPages: [],
  }),
}));

vi.mock("~/pages/hooks/use-fallback-lang", () => ({
  useFallbackLang: () => "en",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

const renderPageManagerSearchAndFilter = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PageManagerSearchAndFilter
          pages={[]}
          search=""
          setSearch={vi.fn()}
          languages={["en"]}
          selectedLanguage="en"
          setSelectedLanguage={vi.fn()}
          selectedPageType="all"
          setSelectedPageType={vi.fn()}
          onAddPage={vi.fn()}
          showUntranslatedPages={false}
          setShowUntranslatedPages={vi.fn()}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
};

describe("PageManagerSearchAndFilter", () => {
  it("hides page type dropdown when only default page types exist", () => {
    mockUsePageTypes.mockReturnValue({
      data: [
        { key: "page", name: "Page", hasSlug: true },
        { key: "global", name: "Global", hasSlug: false },
      ],
    });

    renderPageManagerSearchAndFilter();

    expect(screen.queryByText("All")).toBeNull();
  });

  it("shows page type dropdown when custom page types exist", () => {
    mockUsePageTypes.mockReturnValue({
      data: [
        { key: "page", name: "Page", hasSlug: true },
        { key: "global", name: "Global", hasSlug: false },
        { key: "landing", name: "Landing", hasSlug: true },
      ],
    });

    renderPageManagerSearchAndFilter();

    expect(screen.getByText("All")).not.toBeNull();
  });
});
