import { get, isEqual } from "lodash-es";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { useLanguages } from "~/hooks/use-languages";
import { usePermissions } from "~/hooks/use-permissions";
import { useSidebarActivePanel } from "~/hooks/use-sidebar-active-panel";
import { NestedPathSelector } from "~/pages/client/components/nested-path-selector/nested-path-selector";
import { PAGES_PERMISSIONS } from "~/pages/constants/PERMISSIONS";
import { ImagePicker } from "~/pages/digital-asset-manager";
import { useUpdatePage } from "~/pages/hooks/pages/mutations";
import { useCurrentLanguagePage } from "~/pages/hooks/pages/use-current-language-page";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useBuilderPageData } from "~/pages/hooks/pages/use-page-draft-blocks";
import { usePageType } from "~/pages/hooks/project/use-page-types";
import { usePagesProps } from "~/pages/hooks/utils/use-pages-props";
import { getSeoDefaults } from "./get-seo-defaults";
import { SeoLanguageSwitchDialog } from "./seo-language-switch-dialog";
import { SmartJsonInput } from "./smart-json-input";

// Add JSON validation function
const isValidJSONData = (str: string) => {
  if (!str) return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Add new helper function to insert field at cursor position
const insertFieldAtCursor = (inputElement: HTMLInputElement | HTMLTextAreaElement, field: string) => {
  const start = inputElement.selectionStart || 0;
  const end = inputElement.selectionEnd || 0;
  const value = inputElement.value;

  // Check for word boundaries and add spacing intelligently
  const textBeforeCursor = value.substring(0, start);
  const textAfterCursor = value.substring(end);

  // Check if we need to add space before the placeholder
  const needSpaceBefore = false;

  // Check if we need to add space after the placeholder
  const needSpaceAfter = false;

  // Build the new value with appropriate spacing
  const spaceBefore = needSpaceBefore ? " " : "";
  const spaceAfter = needSpaceAfter ? " " : "";

  const placeholder = `{{${field}}}`;
  const newValue =
    textBeforeCursor +
    (needSpaceBefore ? spaceBefore : "") +
    placeholder +
    (needSpaceAfter ? spaceAfter : "") +
    textAfterCursor;

  // Calculate new cursor position - place cursor at the end of the placeholder
  const newCursorPos =
    start +
    (needSpaceBefore ? 1 : 0) + // Account for space before if added
    placeholder.length; // Length of the placeholder

  return {
    value: newValue,
    newCursorPos: newCursorPos,
  };
};

const SeoPanel = ({ onCancel, inline = false }: { onCancel?: () => void; inline?: boolean }) => {
  const { t } = useTranslation();
  const [, setActivePanel] = useSidebarActivePanel();
  const { data: primaryPage } = usePrimaryPage();
  const { data: pageData } = useBuilderPageData();
  const { data: languagePage, isFetching } = useCurrentLanguagePage();
  const seoSetting = languagePage?.seo;
  // Keep the ref for direct cursor positioning
  const cursorPositionRef = useRef<{ id: string; position: number } | null>(null);
  const [tab, setTab] = useState("seo");

  // Get the page type for default SEO and JSON-LD values
  const pageId = primaryPage?.id;
  const pageType = primaryPage?.pageType;
  const pageTypeDetails = usePageType(pageType);
  const { selectedLang, fallbackLang } = useLanguages();
  const selectedLanguage = selectedLang || fallbackLang;

  // Track reset loading states
  const [isResettingSeo, setIsResettingSeo] = useState(false);
  const [isResettingJsonLd, setIsResettingJsonLd] = useState(false);

  // Language switch dialog state
  const [showLanguageSwitchDialog, setShowLanguageSwitchDialog] = useState(false);
  const [pendingLanguageSwitch, setPendingLanguageSwitch] = useState<{
    fromLang: string;
    toLang: string;
    switchHandler: () => void;
  } | null>(null);

  const [formValues, setFormValues] = useState({
    keyword: "",
    title: "",
    description: "",
    cononicalUrl: "",
    noIndex: false,
    noFollow: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogImageId: "",
    searchTitle: "",
    searchDescription: "",
    jsonLD: "{}",
    metaOther: "{}",
    ...seoSetting,
  });
  // Store initial form values for dirty check per language
  const initialFormValuesRef = useRef<Record<string, typeof formValues>>({});

  const { mutate: updatePage, isPending: isUpdating } = useUpdatePage();
  const loading = isUpdating || isResettingSeo || isResettingJsonLd;

  const { hasPermission } = usePermissions();
  const editSeo = hasPermission(PAGES_PERMISSIONS.EDIT_SEO);
  const [pagesProps] = usePagesProps();
  const resetSeoToDefault = get(pagesProps, "flags.resetSeoToDefault", false);

  const hasJsonLdForSelectedLang = !selectedLang || formValues.jsonLD !== "{}";

  useEffect(() => {
    if (!isFetching && seoSetting && pageId) {
      const newFormValues = {
        keyword: "",
        title: "",
        description: "",
        cononicalUrl: "",
        noIndex: false,
        noFollow: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        ogImageId: "",
        searchTitle: "",
        searchDescription: "",
        jsonLD: "",
        metaOther: "",
        ...seoSetting,
      };
      // Set form values and store as initial values for dirty check per language
      setFormValues(newFormValues);
      initialFormValuesRef.current[selectedLanguage] = newFormValues;
    }
  }, [isFetching, seoSetting, selectedLanguage, pageId]);

  /**
   * Handle language switch attempts with unsaved SEO changes protection.
   * Listens for custom events from language switcher and shows warning dialog
   * if current language has unsaved changes.
   */
  useEffect(() => {
    const handleLanguageSwitchCheck = (event: CustomEvent) => {
      const { fromLang, toLang, switchHandler } = event.detail;

      // Simple dirty check: compare current form values with initial values for current language
      const initialValues = initialFormValuesRef.current[selectedLanguage];
      const isFormDirty = initialValues ? !isEqual(initialValues, formValues) : false;

      if (isFormDirty) {
        // Unsaved changes detected - show confirmation dialog
        setPendingLanguageSwitch({ fromLang, toLang, switchHandler });
        setShowLanguageSwitchDialog(true);
      } else {
        // No changes to lose - proceed with language switch
        switchHandler();
      }
    };

    window.addEventListener("seo-language-switch-check", handleLanguageSwitchCheck as EventListener);

    return () => {
      window.removeEventListener("seo-language-switch-check", handleLanguageSwitchCheck as EventListener);
    };
  }, [pageId, formValues, selectedLanguage]);

  // Handler for resetting SEO fields to default values
  const handleResetSEO = async () => {
    if (!pageTypeDetails || !selectedLanguage) return;

    try {
      setIsResettingSeo(true);
      const defaultValues = getSeoDefaults(pageTypeDetails, selectedLanguage);
      // Update only the SEO-related fields, preserve JSON-LD
      const newFormValues = {
        ...formValues,
        keyword: get(defaultValues, "seo.keyword", ""),
        title: get(defaultValues, "seo.title", ""),
        description: get(defaultValues, "seo.description", ""),
        cononicalUrl: get(defaultValues, "seo.canonicalUrl", ""),
        noIndex: get(defaultValues, "seo.noIndex", false),
        noFollow: get(defaultValues, "seo.noFollow", false),
        ogTitle: get(defaultValues, "seo.ogTitle", ""),
        ogDescription: get(defaultValues, "seo.ogDescription", ""),
        // Keep jsonLD as is
      };

      setFormValues(newFormValues);
      toast.success(t("SEO fields reset to defaults"));
    } catch (error) {
      toast.error(t("Failed to reset SEO fields"));
      console.error("Reset SEO error:", error);
    } finally {
      setIsResettingSeo(false);
    }
  };

  // Handler for resetting JSON-LD to default values
  const handleResetJSONLD = async () => {
    if (!pageTypeDetails || !selectedLanguage) return;

    try {
      setIsResettingJsonLd(true);
      const defaultValues = getSeoDefaults(pageTypeDetails, selectedLanguage);

      // Only update the JSON-LD field
      const newFormValues = {
        ...formValues,
        jsonLD: get(defaultValues, "seo.jsonLD", ""),
      };

      setFormValues(newFormValues);
      toast.success(t("JSON-LD reset to default"));
    } catch (error) {
      toast.error(t("Failed to reset JSON-LD"));
      console.error("Reset JSON-LD error:", error);
    } finally {
      setIsResettingJsonLd(false);
    }
  };
  // Handler for resetting both OG fields and OG Additional
  const handleResetOpenGraph = async () => {
    if (!pageTypeDetails || !selectedLanguage) return;

    try {
      setIsResettingSeo(true);
      const defaultValues = getSeoDefaults(pageTypeDetails, selectedLanguage);

      const newFormValues = {
        ...formValues,
        ogTitle: get(defaultValues, "seo.ogTitle", ""),
        ogDescription: get(defaultValues, "seo.ogDescription", ""),
        ogImage: get(defaultValues, "seo.ogImage", ""),
        ogImageId: get(defaultValues, "seo.ogImageId", ""),
        metaOther: get(defaultValues, "seo.metaOther", "{}"),
      };

      setFormValues(newFormValues);
      toast.success(t("Meta Tag fields reset to defaults"));
    } catch (error) {
      toast.error(t("Failed to reset Meta Tag fields"));
      console.error("Reset Meta Tag error:", error);
    } finally {
      setIsResettingSeo(false);
    }
  };

  const onSubmit = async () => {
    updatePage(
      { id: languagePage?.id, seo: formValues, primaryPage: pageId },
      {
        onSuccess: () => {
          console.log("SEO & JSON-LD updated successfully", formValues);
          initialFormValuesRef.current[selectedLanguage] = formValues;
          toast.success("SEO & JSON-LD updated successfully");
        },
      },
    );
  };

  // Note: copyFromSEO function was removed as it's no longer used
  // The reset functionality now handles setting default values

  // Modify handleInputChange to handle field insertion
  const handleFieldInsert = (fieldName: string, inputId: string) => {
    const inputElement = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement;
    if (inputElement) {
      const { value, newCursorPos } = insertFieldAtCursor(inputElement, fieldName);

      // Store the cursor position for after the state update
      cursorPositionRef.current = {
        id: inputId,
        position: newCursorPos,
      };

      // Check if it's an input or textarea
      const isInput = inputElement.tagName.toLowerCase() === "input";

      // For inputs, we need a more aggressive approach
      if (isInput) {
        // First, directly set the value on the DOM element to ensure it's updated
        inputElement.value = value;

        // Then update React state
        setFormValues((prev: any) => ({
          ...prev,
          [inputElement.name]: value,
        }));

        // Immediately try to set the cursor position
        inputElement.focus();
        inputElement.setSelectionRange(newCursorPos, newCursorPos);

        // Then use multiple attempts with increasing delays
        const attempts = [0, 10, 50, 100, 200];
        attempts.forEach((delay) => {
          setTimeout(() => {
            const el = document.getElementById(inputId) as HTMLInputElement;
            if (el) {
              el.focus();
              el.setSelectionRange(newCursorPos, newCursorPos);
            }
          }, delay);
        });
      } else {
        // For textareas, use the existing approach which seems to work
        setFormValues((prev: any) => ({
          ...prev,
          [inputElement.name]: value,
        }));

        // Force cursor position after React's state update using requestAnimationFrame
        requestAnimationFrame(() => {
          const element = document.getElementById(inputId) as HTMLTextAreaElement;
          if (element) {
            element.focus();
            element.setSelectionRange(newCursorPos, newCursorPos);

            // Try again with a small delay as a fallback
            setTimeout(() => {
              const el = document.getElementById(inputId) as HTMLTextAreaElement;
              if (el) {
                el.focus();
                el.setSelectionRange(newCursorPos, newCursorPos);
              }
            }, 50);
          }
        });
      }
    }
  };

  // Handle Input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = {
      ...formValues,
      [e.target.name]: e.target.name === "noIndex" || e.target.name === "noFollow" ? e.target.checked : e.target.value,
    };
    setFormValues(newData);
  };

  const copyJsonLDFromDefaultPage = () => {
    const defaultPageJsonLd = get(primaryPage, "seo.jsonLD", "{}");
    if (defaultPageJsonLd?.trim() === "{}") {
      toast.error("Default page JSON-LD is empty");
      return;
    }
    const e = { target: { name: "jsonLD", value: defaultPageJsonLd } } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(e);
  };

  return (
    <div className="relative flex h-full flex-col" data-panel-id="seo">
      {!editSeo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
          <Alert variant="default" className="w-[80%] max-w-md text-xs">
            <AlertDescription>
              {t("You don't have permission to edit SEO settings. Contact your administrator for access.")}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="no-scrollbar flex-grow overflow-y-auto px-2 pb-20">
        <div className="mb-4 flex w-full items-center justify-between rounded-md bg-gray-100 px-2 py-1 text-left text-sm">
          <span>
            <div className="font-medium">{languagePage?.name}</div>
            <span className="font-mono text-xs leading-tight text-gray-500">{languagePage?.slug}</span>
          </span>
        </div>
        <form className="space-y-8">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className={`mb-4 grid w-full grid-cols-3`}>
              <TabsTrigger value="seo">{t("SEO")}</TabsTrigger>
              <TabsTrigger value="opengraph">{t("Meta Tags")}</TabsTrigger>
              <TabsTrigger value="jsonld">{t("JSON-LD")}</TabsTrigger>
            </TabsList>
            <div className={tab === "seo" ? "" : "sr-only"}>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" htmlFor="keyword">
                      {t("Keyword")}
                    </Label>
                    {editSeo && (
                      <NestedPathSelector
                        dataType="value"
                        data={pageData ?? {}}
                        onSelect={(field) => handleFieldInsert(field, "keyword")}
                      />
                    )}
                  </div>
                  <Input
                    type="text"
                    id="keyword"
                    name="keyword"
                    value={formValues.keyword}
                    onChange={handleInputChange}
                    disabled={loading || !editSeo}
                    placeholder={t("Enter keyword")}
                    readOnly={!editSeo}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" htmlFor="title">
                      {t("SEO Title")}
                    </Label>
                    <div className="flex items-center justify-end gap-2">
                      {editSeo && (
                        <NestedPathSelector
                          dataType="value"
                          data={pageData ?? {}}
                          onSelect={(field) => handleFieldInsert(field, "title")}
                        />
                      )}
                    </div>
                  </div>
                  <Input
                    type="text"
                    id="title"
                    name="title"
                    value={formValues.title}
                    onChange={handleInputChange}
                    disabled={loading || !editSeo}
                    placeholder={t("Enter SEO title")}
                    readOnly={!editSeo}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" htmlFor="description">
                      {t("SEO Description")}
                    </Label>
                    <div className="flex items-center gap-2">
                      {editSeo && (
                        <NestedPathSelector
                          data={pageData ?? {}}
                          onSelect={(field) => handleFieldInsert(field, "description")}
                        />
                      )}
                    </div>
                  </div>
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={formValues.description}
                    onChange={handleInputChange as any}
                    disabled={loading || !editSeo}
                    placeholder={t("Enter SEO description")}
                    readOnly={!editSeo}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" htmlFor="title">
                      {t("Canonical URL")}
                    </Label>
                    {editSeo && (
                      <NestedPathSelector
                        dataType="value"
                        data={pageData ?? {}}
                        onSelect={(field) => handleFieldInsert(field, "canonicalUrl")}
                      />
                    )}
                  </div>
                  <Input
                    type="text"
                    id="canonicalUrl"
                    name="canonicalUrl"
                    value={formValues.canonicalUrl}
                    onChange={handleInputChange}
                    disabled={loading || !editSeo}
                    placeholder={t("Enter Canonical URL")}
                    readOnly={!editSeo}
                  />
                </div>

                <div className="">
                  <div className="flex items-center gap-x-2">
                    <Input
                      type="checkbox"
                      id="noIndex"
                      name="noIndex"
                      checked={formValues.noIndex}
                      onChange={handleInputChange}
                      disabled={loading || !editSeo}
                      className="h-4 w-4"
                    />
                    <Label className="pb-1 text-xs" htmlFor="noIndex">
                      {t("No Index")}
                    </Label>
                  </div>
                  <p className="mt-0 text-[10px] font-light leading-4 text-gray-400">
                    {t("Check this if you don't want search engines to index this page.")}
                  </p>
                </div>

                <div className="">
                  <div className="flex items-center gap-x-2">
                    <Input
                      type="checkbox"
                      id="noFollow"
                      name="noFollow"
                      checked={formValues.noFollow}
                      onChange={handleInputChange}
                      disabled={loading || !editSeo}
                      className="h-4 w-4"
                    />
                    <Label className="pb-1 text-xs" htmlFor="noIndex">
                      {t("No Follow")}
                    </Label>
                  </div>
                  <p className="text-[10px] font-light leading-4 text-gray-400">
                    {t("Check this if you don't want search engines to follow links on this page.")}
                  </p>
                </div>
              </div>
            </div>
            <div className={tab === "opengraph" ? "" : "sr-only"}>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-4 font-semibold text-slate-700">{t("Open Graph")}</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs" htmlFor="ogTitle">
                          {t("OG Title")}
                        </Label>
                        <div className="flex items-center gap-2">
                          {editSeo && (
                            <NestedPathSelector
                              dataType="value"
                              data={pageData ?? {}}
                              onSelect={(field) => handleFieldInsert(field, "ogTitle")}
                            />
                          )}
                        </div>
                      </div>
                      <Input
                        type="text"
                        id="ogTitle"
                        name="ogTitle"
                        value={formValues.ogTitle}
                        onChange={handleInputChange}
                        disabled={loading || !editSeo}
                        placeholder={t("Enter OG title")}
                        readOnly={!editSeo}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs" htmlFor="ogDescription">
                          {t("OG Description")}
                        </Label>
                        <div className="flex items-center gap-2">
                          {editSeo && (
                            <NestedPathSelector
                              dataType="value"
                              data={pageData ?? {}}
                              onSelect={(field) => handleFieldInsert(field, "ogDescription")}
                            />
                          )}
                        </div>
                      </div>
                      <Textarea
                        id="ogDescription"
                        name="ogDescription"
                        rows={5}
                        value={formValues.ogDescription}
                        onChange={handleInputChange as any}
                        disabled={loading || !editSeo}
                        placeholder={t("Enter OG description")}
                        readOnly={!editSeo}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs" htmlFor="ogImage">
                          {t("OG Image")}
                        </Label>
                        {editSeo && (
                          <NestedPathSelector
                            dataType="value"
                            data={pageData ?? {}}
                            onSelect={(field) => {
                              setFormValues({
                                ...formValues,
                                ogImage: `{{${field}}}`,
                                ogImageId: "",
                              });
                            }}
                          />
                        )}
                      </div>
                      <ImagePicker
                        assetId={formValues.ogImageId}
                        assetUrl={formValues.ogImage}
                        onChange={(asset) => {
                          setFormValues({
                            ...formValues,
                            ogImage: asset.url,
                            ogImageId: asset.id,
                          });
                        }}
                        disabled={loading || !editSeo}
                        placeholder={t("Select OG image")}
                        className="mb-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs" htmlFor="metaOther">
                          {t("Meta Tags")}
                        </Label>
                      </div>
                      <SmartJsonInput
                        id="metaOther"
                        value={formValues.metaOther}
                        onChange={(value) => {
                          const e = {
                            target: { name: "metaOther", value },
                          } as React.ChangeEvent<HTMLInputElement>;
                          handleInputChange(e);
                        }}
                        placeholder={t("Enter Meta Tags JSON")}
                        disabled={loading || !editSeo}
                        readOnly={!editSeo}
                        pageData={pageData || {}}
                        rows={8}
                        handleFieldInsert={handleFieldInsert}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={tab === "jsonld" ? "" : "sr-only"}>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" htmlFor="jsonLD">
                      {t("JSON-LD")}
                    </Label>
                    {hasJsonLdForSelectedLang && <div className="flex items-center gap-2"></div>}
                  </div>
                  {/* Log pageData to see what's available */}
                  <div className="hidden">{JSON.stringify(pageData)}</div>
                  <SmartJsonInput
                    id="jsonLD"
                    value={formValues.jsonLD}
                    onChange={(value) => {
                      const e = { target: { name: "jsonLD", value } } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(e);
                    }}
                    placeholder={t("Enter JSON-LD")}
                    disabled={loading || !editSeo}
                    readOnly={!editSeo}
                    pageData={pageData || {}}
                    rows={12}
                    handleFieldInsert={handleFieldInsert}
                    hasJsonLdForSelectedLang={hasJsonLdForSelectedLang}
                    copyJsonLDFromDefaultPage={copyJsonLDFromDefaultPage}
                  />
                </div>
              </div>
            </div>
          </Tabs>
        </form>
      </div>

      {editSeo && (
        <div
          className={
            inline
              ? "flex w-full shrink-0 items-center justify-between border-t bg-background p-3"
              : "fixed bottom-0 left-0 right-0 flex w-full flex-shrink-0 items-center justify-between border-t bg-background p-4"
          }>
          {resetSeoToDefault ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (tab === "jsonld") {
                  handleResetJSONLD();
                } else if (tab === "opengraph") {
                  handleResetOpenGraph();
                } else {
                  handleResetSEO();
                }
              }}
              disabled={loading || !editSeo || !pageTypeDetails}>
              {isResettingSeo
                ? t("Resetting...")
                : t(
                    `Reset to ${tab === "jsonld" ? "Default JSON-LD" : tab === "opengraph" ? "Default Open Graph" : "Default SEO"}`,
                  )}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-4">
            <Button
              onClick={onSubmit}
              disabled={
                !isValidJSONData(formValues?.jsonLD) ||
                (initialFormValuesRef.current[selectedLanguage]
                  ? isEqual(initialFormValuesRef.current[selectedLanguage], formValues)
                  : false) ||
                loading ||
                !editSeo
              }>
              {isUpdating ? t("Saving...") : t("Save")}
            </Button>
            <Button
              variant="link"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => (onCancel ? onCancel() : setActivePanel("outline"))}>
              {t("Cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Dialog */}
      <SeoLanguageSwitchDialog
        isOpen={showLanguageSwitchDialog}
        onClose={() => {
          setShowLanguageSwitchDialog(false);
          setPendingLanguageSwitch(null);
        }}
        onSave={async () => {
          if (pendingLanguageSwitch) {
            // Save changes and proceed with language switch
            await onSubmit();
            // Initial values are updated in onSubmit success callback
            pendingLanguageSwitch.switchHandler();
            setShowLanguageSwitchDialog(false);
            setPendingLanguageSwitch(null);
          }
        }}
        onDiscard={() => {
          if (pendingLanguageSwitch) {
            // Discard changes and restore original values
            const initialValues = initialFormValuesRef.current[selectedLanguage];
            if (initialValues) {
              setFormValues(initialValues);
            }
            // Proceed with language switch
            pendingLanguageSwitch.switchHandler();
            setShowLanguageSwitchDialog(false);
            setPendingLanguageSwitch(null);
          }
        }}
        isSaving={isUpdating}
        fromLanguage={pendingLanguageSwitch?.fromLang || selectedLanguage}
        toLanguage={pendingLanguageSwitch?.toLang || ""}
      />
    </div>
  );
};

SeoPanel.displayName = "SeoPanel";

export default SeoPanel;
