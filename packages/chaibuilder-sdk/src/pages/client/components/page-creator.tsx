import { find, isEmpty, pick, set } from "lodash-es";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useLanguages } from "~/hooks/use-languages";
import { usePermissions } from "~/hooks/use-permissions";
import { DynamicSlugInput } from "~/pages/client/components/dynamic-slug-input";
import { ParentPageSelector } from "~/pages/client/components/parent-page-selector";
import { SlugInput } from "~/pages/client/components/slug-input";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { PAGES_PERMISSIONS } from "~/pages/constants/PERMISSIONS";
import { useCreatePage, useUpdatePage } from "~/pages/hooks/pages/mutations";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useChangePage } from "~/pages/hooks/use-change-page";
import { combineParentChildSlugs, removeSlugExtension } from "~/pages/utils/slug-utils";
import { useChaiFeatureFlag } from "~/runtime/client";
import { getSeoDefaults } from "./get-seo-defaults";
import ChaiCommandList from "./ui/chai-command-list";
// Simple utility to conditionally join class names
const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ");

interface PageType {
  name: string;
  key: string;
  helpText?: string;
  dynamicSegments?: string;
  dynamicSlug?: string;
  hasSlug?: boolean;
  isSystem?: boolean;
  seoDefault?: Record<string, any>;
  jsonLDDefault?: Record<string, any>;
  trackingDefault?: Record<string, any>;
}

interface PageCreatorProps {
  addEditPage:
    | {
        name: string;
        slug: string;
        id: string;
        pageType: string;
        parent: string;
        dynamic?: boolean;
        dynamicSlugCustom?: string;
      }
    | null
    | undefined;
  close: () => void;
  closePanel: () => void;
}

export default function PageCreator({ addEditPage, close, closePanel }: PageCreatorProps) {
  const { data: _additionalPageTypes } = usePageTypes();
  const additionalPageTypes: any[] = useMemo(() => _additionalPageTypes ?? [], [_additionalPageTypes]);
  const changePage = useChangePage();
  const isEdit = addEditPage?.id ? true : false;
  const { data: pages } = useWebsitePrimaryPages();
  const { mutate: createPage, isPending: isCreating } = useCreatePage();
  const { mutate: updatePage, isPending: isUpdating } = useUpdatePage();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSlugValid, setIsSlugValid] = useState(true);
  const [pageType, setPageType] = useState<string>(addEditPage?.pageType ?? "page");
  const { hasPermission } = usePermissions();
  const canEditPageType = hasPermission(PAGES_PERMISSIONS.CHANGE_PAGE_TYPE);
  const [showPageTypeWarning, setShowPageTypeWarning] = useState(false);
  const [newPageType, setNewPageType] = useState<string>("");
  const { selectedLang, fallbackLang } = useLanguages();

  const currentLang = selectedLang || fallbackLang;
  const [pageTypeSearch, setPageTypeSearch] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isPartial = useMemo(() => {
    const currentType = additionalPageTypes.find((type) => type.key === pageType);
    return currentType?.hasSlug === false;
  }, [pageType, additionalPageTypes]);

  const [parentPage, setParentPage] = useState<string>(addEditPage?.parent ?? "");
  const [name, setName] = useState(addEditPage?.name ?? "");
  const [useDynamicSlug, setUseDynamicSlug] = useState(addEditPage?.dynamic ?? false);
  const [slug, setSlug] = useState(useDynamicSlug ? "" : (addEditPage?.slug ?? "").split("/").pop() || "");
  const [dynamicSlugCustom, setDynamicSlugCustom] = useState(addEditPage?.dynamicSlugCustom ?? "");
  const [isDynamicSlugValid, setIsDynamicSlugValid] = useState(true);
  const [showSlugChangeWarning, setShowSlugChangeWarning] = useState(false);

  const isPending = isCreating || isUpdating;
  const isSearchAndSelectEnabled = useChaiFeatureFlag("enable-add-page-dropdown");

  // Check if current page is published
  const currentPageData = useMemo(() => {
    if (!isEdit || !addEditPage?.id || !pages) return null;
    return pages.find((page: any) => page.id === addEditPage.id);
  }, [isEdit, addEditPage?.id, pages]);

  const isCurrentPagePublished = currentPageData?.online || false;

  // Check if current page has nested pages (children)
  const hasNestedPages = useMemo(() => {
    if (!isEdit || !addEditPage?.id || !pages) return false;
    return pages.some((page: any) => page.parent === addEditPage.id);
  }, [isEdit, addEditPage?.id, pages]);

  const currentPageType = additionalPageTypes.find((type) => type.key === pageType);

  const handlePageTypeChange = (value: string) => {
    if (isEdit && pageType !== value) {
      setNewPageType(value);
      setShowPageTypeWarning(true);
      setPageTypeSearch("");
      setIsPopoverOpen(false);
      return;
    }
    setPageType(value);
    setPageTypeSearch("");
    setIsPopoverOpen(false);
  };

  const handleConfirmPageTypeChange = () => {
    setPageType(newPageType);
    setShowPageTypeWarning(false);
    setUseDynamicSlug(false);
  };

  const handleDynamicSlugToggle = (checked: boolean) => {
    setUseDynamicSlug(checked);
    if (checked) {
      // When enabling dynamic slug, clear regular slug but keep any existing dynamic slug
      setSlug("");
    } else {
      // When disabling dynamic slug, clear the dynamic slug
      setDynamicSlugCustom("");
    }
  };

  const handleParentPageChange = (value: string) => {
    setParentPage(value);
    if (value && value !== "none") {
      const parentPageData = pages?.find((page: { id: string }) => page.id === value);
      const parentSlug = parentPageData?.slug || "";
      if (slug.startsWith(parentSlug)) {
        const childPart = slug.slice(parentSlug.length).replace(/^\/+/, "");
        setSlug(childPart);
      } else {
        setSlug(slug.replace(/^\/+/, ""));
      }
    } else {
      setSlug(slug ? `${slug}` : "");
    }
  };

  /**
   * Validates the basic form inputs
   * @returns True if valid, false otherwise
   */
  const validateBasicInputs = (): boolean => {
    // Validate name
    if (!name.trim()) {
      toast.error("Name is required");
      return false;
    }

    // If using dynamic slug, ensure regular slug is empty
    if (useDynamicSlug && !isEmpty(slug)) {
      setSubmitError("Slug must be empty when using dynamic slug");
      return false;
    }

    // If using dynamic slug, ensure dynamic slug is valid
    if (useDynamicSlug && !isDynamicSlugValid) {
      setSubmitError("Dynamic slug is invalid");
      return false;
    }

    return true;
  };

  /**
   * Handles the submission for partial pages (no slug)
   */
  const handlePartialPageSubmit = () => {
    const result = {
      pageType: currentPageType?.key,
      name,
      slug: "",
      hasSlug: false,
    };

    if (isEdit) {
      updatePage(
        { id: addEditPage?.id, name },
        {
          onSuccess: () => {
            toast.success(currentPageType?.name + " updated successfully");
            close();
          },
        },
      );
    } else {
      createPage(result, {
        onSuccess: (response: any) => {
          close();
          changePage(response.page.id, closePanel);
        },
      });
    }
  };

  /**
   * Validates a child page slug
   * @param childSlug The child slug to validate
   * @param parentPageSlug The parent page slug
   * @returns True if valid, false otherwise
   */
  const validateChildPageSlug = (childSlug: string, parentPageSlug: string): boolean => {
    // Child page must have a slug if not using dynamic slug
    if (!childSlug.trim() && !useDynamicSlug) {
      setSubmitError("Child page slug is required");
      return false;
    }

    // Clean parent slug by removing any extension
    const cleanParentSlug = removeSlugExtension(parentPageSlug);

    // Combine parent and child slugs for the final slug
    const finalSlug = combineParentChildSlugs(cleanParentSlug, childSlug);

    // Check if slug starts with a language code
    const languageCodes = Object.keys(LANGUAGES);
    const slugStartsWithLangCode = languageCodes.some((code) => {
      return finalSlug === `/${code}` || finalSlug?.startsWith(`/${code}/`);
    });

    if (slugStartsWithLangCode) {
      setSubmitError("Slugs cannot start with a language code for primary page");
      return false;
    }

    return true;
  };

  /**
   * Creates or updates a child page
   * @param childSlug The child slug
   * @param parentPageSlug The parent page slug
   */
  const handleChildPageSubmit = (childSlug: string, parentPageSlug: string) => {
    // Clean parent slug by removing any extension
    const cleanParentSlug = removeSlugExtension(parentPageSlug);

    // Combine parent and child slugs for the final slug
    const finalSlug = combineParentChildSlugs(cleanParentSlug, childSlug);

    // Prepare the result with combined slug
    const result: {
      pageType: string;
      name: string;
      slug: string;
      parent: string;
      dynamic: boolean;
      hasSlug: boolean;
      template?: string;
      dynamicSlugCustom?: string;
      tracking?: Record<string, any>;
      seo?: Record<string, any>;
      jsonLD?: Record<string, any>;
    } = {
      pageType,
      name,
      slug: finalSlug.replace(/\/$/, ""), // remove trailing slashes
      parent: parentPage,
      dynamic: useDynamicSlug,
      hasSlug: true,
      template: undefined,
      tracking: {},
      seo: {},
      jsonLD: {},
    };

    // If using dynamic slug, add it as a separate property
    if (useDynamicSlug) {
      result.dynamicSlugCustom = dynamicSlugCustom;
    }

    if (isEdit) {
      const updateFields = pick(result, ["pageType", "parent", "name", "slug", "dynamic", "dynamicSlugCustom"]);
      updatePage(
        { id: addEditPage?.id, ...updateFields },
        {
          onSuccess: () => {
            toast.success("Page updated successfully");
            close();
          },
        },
      );
    } else {
      // add SEO defaults
      const pageTypeDetails = find(additionalPageTypes, { key: pageType });
      if (pageTypeDetails?.trackingDefault) {
        result.tracking = pageTypeDetails.trackingDefault;
      }
      const { seo, jsonLD } = getSeoDefaults(pageTypeDetails, currentLang);
      set(result, "seo", seo);
      set(result, "jsonLD", jsonLD);
      createPage(result, {
        onSuccess: (response: any) => {
          close();
          changePage(response.page.id, closePanel);
        },
      });
    }
  };

  /**
   * Creates or updates a root-level page
   */
  const handleRootPageSubmit = () => {
    const result: {
      pageType: string;
      name: string;
      slug: string;
      template?: string;
      parent: null;
      tracking?: Record<string, any>;
      seo?: Record<string, any>;
      jsonLD?: Record<string, any>;
    } = {
      pageType,
      name,
      slug: slug === "" ? "/" : `/${slug.replace(/\/$/, "")}`,
      template: undefined,
      parent: null,
      tracking: {},
    };

    // Root pages cannot have dynamic slugs, so we don't add those properties here

    if (isEdit) {
      updatePage(
        { id: addEditPage?.id, ...result },
        {
          onSuccess: () => {
            toast.success("Page updated successfully");
            close();
          },
        },
      );
    } else {
      // add SEO defaults
      const pageTypeDetails = find(additionalPageTypes, { key: pageType });
      if (pageTypeDetails?.trackingDefault) {
        result.tracking = pageTypeDetails.trackingDefault;
      }
      const { seo, jsonLD } = getSeoDefaults(pageTypeDetails, currentLang);
      set(result, "seo", seo);
      set(result, "jsonLD", jsonLD);
      createPage(result, {
        onSuccess: (response: any) => {
          if (response?.page?.id) {
            changePage(response.page.id, closePanel);
          }
          close();
        },
      });
    }
  };

  /**
   * Main form submission handler
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Basic validation
    if (!validateBasicInputs()) {
      return;
    }

    // For partial pages (no slug)
    if (!currentPageType?.hasSlug) {
      handlePartialPageSubmit();
      return;
    }

    // For child pages
    if (parentPage && parentPage !== "none") {
      // Get parent page slug
      const parentPageData = pages?.find((page: { id: string }) => page.id === parentPage);
      const parentSlug = parentPageData?.slug || "";

      // Validate child page slug
      if (!validateChildPageSlug(slug, parentSlug)) {
        return;
      }

      // Handle child page submission
      handleChildPageSubmit(slug, parentSlug);
    } else {
      // Handle root-level page submission
      handleRootPageSubmit();
    }
  };
  /**
   * Page types offered by the type picker: system pages are seeded per-tenant,
   * not user-creatable, so they stay out of creation options. When EDITING a
   * system page the current type is kept so the control shows a valid value.
   */
  const pickerPageTypes = useMemo<PageType[]>(() => {
    const creatable = additionalPageTypes.filter((type) => !type.isSystem);
    if (isEdit && currentPageType?.isSystem && currentPageType) {
      return [currentPageType, ...creatable];
    }
    return creatable;
  }, [additionalPageTypes, isEdit, currentPageType]);

  const { pagesType, partialsType } = useMemo(() => {
    const filterPageTypes = (type: PageType) => {
      if (!pageTypeSearch) return true;
      return (
        type.name.toLowerCase().includes(pageTypeSearch.toLowerCase()) ||
        type.key.toLowerCase().includes(pageTypeSearch.toLowerCase())
      );
    };

    return {
      pagesType: pickerPageTypes.filter((type) => type.hasSlug !== false && filterPageTypes(type)),
      partialsType: pickerPageTypes.filter((type) => type.hasSlug === false && filterPageTypes(type)),
    };
  }, [pickerPageTypes, pageTypeSearch]);

  // Show only name field for Global Block
  if (!currentPageType?.hasSlug) {
    return (
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
        <div className="space-y-0.5">
          <Label htmlFor="pageType" className="text-sm">
            Type
          </Label>
          {isSearchAndSelectEnabled ? (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={isEdit && (!canEditPageType || currentPageType?.isSystem)}
                  className={cn(
                    "w-full justify-between",
                    isEdit && (!canEditPageType || currentPageType?.isSystem) ? "cursor-not-allowed text-gray-500" : "",
                  )}>
                  {currentPageType?.name || "Select page type"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <div className="sticky top-0 z-10 bg-white px-3 py-2">
                    <div className="relative">
                      <Search strokeWidth={2} className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search page types..."
                        className="h-8 pl-8 text-xs"
                        value={pageTypeSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageTypeSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <ChaiCommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No page type found.</CommandEmpty>
                    <CommandGroup heading="Partials">
                      {partialsType.map((type) => (
                        <CommandItem
                          key={type.key}
                          value={type.key}
                          onSelect={() => {
                            handlePageTypeChange(type.key);
                            setIsPopoverOpen(false);
                          }}
                          className="flex cursor-pointer items-center justify-between">
                          {type.name}
                          <Check className={cn("mr-2 h-4 w-4", pageType === type.key ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </ChaiCommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <select
              id="pageType"
              value={pageType}
              disabled={isEdit && (!canEditPageType || currentPageType?.isSystem)}
              onChange={(e) => handlePageTypeChange(e.target.value)}
              className={`w-full rounded-md border border-gray-300 px-3 py-2 ${isEdit && (!canEditPageType || currentPageType?.isSystem) ? "cursor-not-allowed text-gray-500" : ""}`}>
              <optgroup label="Partials">
                {pickerPageTypes
                  .filter((type) => type.hasSlug === false)
                  .map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          )}
          {showPageTypeWarning && (
            <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                Changing the page type may impact the page data. Are you sure you want to proceed?
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPageTypeWarning(false)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleConfirmPageTypeChange}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">{additionalPageTypes.find((type) => type.key === pageType)?.helpText}</p>
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="name" className="text-sm">
            Name
          </Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required aria-required="true" />
        </div>

        <Button disabled={isPending} type="submit" className="w-full">
          {isEdit
            ? isPending
              ? "Updating..."
              : "Update " + currentPageType?.name
            : isPending
              ? "Creating..."
              : "Create " + currentPageType?.name}
        </Button>
      </form>
    );
  }

  // Return original form for other page types
  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
      <div className="space-y-0.5">
        <Label htmlFor="pageType" className="text-sm">
          Type
        </Label>
        {isSearchAndSelectEnabled ? (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                disabled={isEdit && !canEditPageType}
                className={cn(
                  "w-full justify-between",
                  isEdit && !canEditPageType ? "cursor-not-allowed text-gray-500" : "",
                )}>
                {currentPageType?.name || "Select page type"}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <div className="sticky top-0 z-10 bg-white px-3 py-2">
                  <div className="relative">
                    <Search strokeWidth={2} className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search page types..."
                      className="h-8 pl-8 text-xs"
                      value={pageTypeSearch}
                      onChange={(e) => setPageTypeSearch(e.target.value)}
                    />
                  </div>
                </div>
                <ChaiCommandList className="overflow-y-auto">
                  <CommandEmpty>No page type found.</CommandEmpty>
                  {isEdit ? (
                    isPartial ? (
                      <CommandGroup heading="Partials">
                        {partialsType.map((type) => (
                          <CommandItem
                            key={type.key}
                            value={type.key}
                            onSelect={() => handlePageTypeChange(type.key)}
                            className="flex cursor-pointer items-center justify-between">
                            {type.name}
                            <Check
                              className={cn("mr-2 h-4 w-4", pageType === type.key ? "opacity-100" : "opacity-0")}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      <CommandGroup heading="Pages">
                        {pagesType.map((type) => (
                          <CommandItem
                            key={type.key}
                            value={type.key}
                            onSelect={() => handlePageTypeChange(type.key)}
                            className="flex cursor-pointer items-center justify-between">
                            {type.name}
                            <Check
                              className={cn("mr-2 h-4 w-4", pageType === type.key ? "opacity-100" : "opacity-0")}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  ) : (
                    <>
                      {pagesType.length > 0 && (
                        <CommandGroup heading="Pages">
                          {pagesType.map((type) => (
                            <CommandItem
                              key={type.key}
                              value={type.key}
                              onSelect={() => handlePageTypeChange(type.key)}
                              className="flex cursor-pointer items-center justify-between">
                              {type.name}
                              <Check
                                className={cn("mr-2 h-4 w-4", pageType === type.key ? "opacity-100" : "opacity-0")}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {partialsType.length > 0 && (
                        <CommandGroup heading="Partials">
                          {partialsType.map((type) => (
                            <CommandItem
                              key={type.key}
                              value={type.key}
                              onSelect={() => handlePageTypeChange(type.key)}
                              className="flex cursor-pointer items-center justify-between">
                              {type.name}
                              <Check
                                className={cn("mr-2 h-4 w-4", pageType === type.key ? "opacity-100" : "opacity-0")}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </>
                  )}
                </ChaiCommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <select
            id="pageType"
            value={pageType}
            disabled={isEdit && (!canEditPageType || currentPageType?.isSystem)}
            onChange={(e) => handlePageTypeChange(e.target.value)}
            className={`w-full rounded-md border border-gray-300 px-3 py-2 ${isEdit && (!canEditPageType || currentPageType?.isSystem) ? "cursor-not-allowed text-gray-500" : ""}`}>
            {isEdit ? (
              isPartial ? (
                <optgroup label="Partials">
                  {pickerPageTypes
                    .filter((type) => type.hasSlug === false)
                    .map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.name}
                      </option>
                    ))}
                </optgroup>
              ) : (
                <optgroup label="Pages">
                  {pickerPageTypes
                    .filter((type) => type.hasSlug !== false)
                    .map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.name}
                      </option>
                    ))}
                </optgroup>
              )
            ) : (
              <>
                <optgroup label="Pages">
                  {pickerPageTypes
                    .filter((type) => type.hasSlug !== false)
                    .map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Partials">
                  {pickerPageTypes
                    .filter((type) => type.hasSlug === false)
                    .map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.name}
                      </option>
                    ))}
                </optgroup>
              </>
            )}
          </select>
        )}
        {showPageTypeWarning && (
          <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              Changing the page type may impact the page data. Are you sure you want to proceed?
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPageTypeWarning(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleConfirmPageTypeChange}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>

      <ParentPageSelector
        pages={pages}
        selectedParentId={parentPage}
        onChange={handleParentPageChange}
        currentPage={addEditPage as any}
      />

      <div className="space-y-0.5">
        <Label htmlFor="name" className="text-sm">
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-required="true"
          placeholder="Enter page name"
        />
      </div>

      {currentPageType?.dynamicSegments && parentPage && parentPage !== "none" && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useDynamicSlug"
              checked={useDynamicSlug}
              onChange={(e) => handleDynamicSlugToggle(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="useDynamicSlug" className="text-sm">
              Use Dynamic Slug
            </Label>
          </div>
          {useDynamicSlug && (
            <div className="space-y-2">
              <div className="space-y-0.5">
                <DynamicSlugInput
                  value={dynamicSlugCustom}
                  onChange={setDynamicSlugCustom}
                  dynamicPattern={currentPageType?.dynamicSlug || "{{id}}"}
                  placeholder="Enter custom slug part (optional)"
                  onValidationChange={setIsDynamicSlugValid}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {(!currentPageType?.dynamicSegments || !useDynamicSlug) && (
        <div className="space-y-0.5">
          <Label htmlFor="slug" className="text-sm">
            Slug
          </Label>
          <SlugInput
            value={slug}
            onChange={(newSlug) => {
              setSlug(newSlug);
              // Show warning if this is an edit and slug is changing for a published page or page with nested pages
              if (isEdit && newSlug !== (addEditPage?.slug?.split("/").pop() || "")) {
                if (isCurrentPagePublished || hasNestedPages) {
                  setShowSlugChangeWarning(true);
                } else {
                  setShowSlugChangeWarning(false);
                }
              } else {
                setShowSlugChangeWarning(false);
              }
            }}
            placeholder={
              parentPage && parentPage !== "none"
                ? "Enter page slug"
                : pageType === "page"
                  ? "Leave empty for home page"
                  : "Required - e.g. your-slug"
            }
            parentSlug={
              parentPage && parentPage !== "none"
                ? pages?.find((page: { id: string }) => page.id === parentPage)?.slug
                : undefined
            }
            onValidationChange={setIsSlugValid}
          />
          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
          {showSlugChangeWarning && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800">Slug Change Warning</h3>
                  <div className="mt-1 text-sm text-amber-700">
                    <p>
                      The previous URL and any child pages will become inaccessible. You may want to set up a redirect
                      to avoid broken links.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        disabled={
          isPending ||
          // Disable if regular slug is invalid and we're not using dynamic slug
          (!isSlugValid && (!currentPageType?.dynamicSegments || !useDynamicSlug)) ||
          // Disable if dynamic slug is invalid and we are using dynamic slug
          (useDynamicSlug && !isDynamicSlugValid)
        }
        type="submit"
        className="w-full">
        {isEdit ? (isPending ? "Updating..." : "Update page") : isPending ? "Creating..." : "Create Page"}
      </Button>
    </form>
  );
}
