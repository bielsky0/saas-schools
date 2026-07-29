import { filter, find, startsWith } from "lodash-es";
import { Loader } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useLanguages } from "~/hooks/use-languages";
import { useSidebarActivePanel } from "~/hooks/use-sidebar-active-panel";
import { SlugInput } from "~/pages/client/components/slug-input";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { useCreatePage, useUpdatePage } from "~/pages/hooks/pages/mutations";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { useWebsitePrimaryPages } from "~/pages/hooks/pages/use-project-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useWebsiteSetting } from "~/pages/hooks/project/use-website-settings";
import { useFallbackLang } from "~/pages/hooks/use-fallback-lang";
import { useSearchParams } from "~/pages/hooks/utils/use-search-params";
import { parseSlugForEdit, removeSlugExtension } from "~/pages/utils/slug-utils";

/**
 * Props for the AddNewLanguagePage component.
 */
type AddNewLanguagePageProps = {
  primaryPage: string; // ID of the primary language page
  edit: boolean; // Flag to determine if it's an edit operation
  id?: string; // Page ID, required if edit is true
  preselectedLang?: string; // Pre-selected language
  isOpen: boolean; // To control the dialog visibility
  onClose: () => void; // Callback for closing the dialog
};

/**
 * AddNewLanguagePage
 * A reusable dialog for adding or editing a language-specific page.
 * - Decoupled from current page context: receives data via props.
 * - Retains all validations, logic, and UX from original AddNewLanguage.
 * - Slightly cleaner and more maintainable structure.
 */
/**
 * Props for LanguageSelect component
 */
interface LanguageSelectProps {
  edit: boolean;
  lang: string;
  languages: string[];
  name: string;
  setLang: (lang: string) => void;
  setName: (name: string) => void;
  primaryPageObject: any;
}

/**
 * Language selection dropdown
 */
const LanguageSelect: React.FC<LanguageSelectProps> = ({
  edit,
  lang,
  languages,
  name,
  setLang,
  setName,
  primaryPageObject,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <Label htmlFor="lang">{t("Language")}</Label>
      <select
        value={edit ? "" : lang}
        disabled={edit || !languages.length}
        onChange={(e) => {
          const newLang = e.target.value;
          setLang(newLang);
          if (!edit && (startsWith(name, primaryPageObject?.name) || name.length === 0)) {
            setName(`${primaryPageObject?.name} - ${LANGUAGES[newLang]}`);
          }
        }}
        className="col-span-3 flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        <option value="" disabled>
          {edit
            ? LANGUAGES[lang] || lang
            : !languages.length
              ? t("All available language page is created.")
              : t("Choose language")}
        </option>
        {languages.map((l: string) => (
          <option value={l} key={l}>
            {LANGUAGES[l] || l}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Props for NameInput component
 */
interface NameInputProps {
  lang: string;
  name: string;
  setName: (name: string) => void;
  parentHasSelectedLanguagePage: boolean;
}

/**
 * Name input field
 */
const NameInput: React.FC<NameInputProps> = ({ lang, name, setName, parentHasSelectedLanguagePage }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <Label htmlFor="name">{t("Page Name")}</Label>
      <Input
        id="name"
        value={lang ? name : ""}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder={!lang ? t("Choose language to add slug") : t("Enter page name")}
        disabled={!parentHasSelectedLanguagePage || !lang}
      />
    </div>
  );
};

/**
 * Props for SlugSection component
 */
interface SlugSectionProps {
  dynamic: boolean;
  isNonSlugPageType: boolean;
  isRootPage: boolean;
  lang: string;
  useLanguagePrefix: boolean;
  setUseLanguagePrefix: (val: boolean) => void;
  isHomePage: boolean;
  parentSlug: string | undefined;
  parentHasSelectedLanguagePage: boolean;
  slug: string;
  setSlug: (slug: string) => void;
  isSlugValid: boolean;
  setIsSlugValid: (valid: boolean) => void;
  getSlug: () => string;
}

/**
 * Slug section (conditionally rendered)
 */
const SlugSection: React.FC<SlugSectionProps> = ({
  dynamic,
  isNonSlugPageType,
  isRootPage,
  lang,
  useLanguagePrefix,
  setUseLanguagePrefix,
  isHomePage,
  parentSlug,
  parentHasSelectedLanguagePage,
  slug,
  setSlug,
  setIsSlugValid,
  getSlug,
}) => {
  const { t } = useTranslation();
  if (isNonSlugPageType) return null;
  return (
    <div className="space-y-1">
      {isRootPage && lang && (
        <div className="flex items-center space-x-2 pb-1">
          <input
            type="checkbox"
            id="useLanguagePrefix"
            checked={useLanguagePrefix}
            onChange={(e) => setUseLanguagePrefix(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="useLanguagePrefix" className="text-sm font-normal leading-tight">
            Add language code (<span className="font-mono text-gray-900">/{lang}</span>) as slug prefix
          </Label>
        </div>
      )}
      <Label htmlFor="slug">{t("Slug")}</Label>
      {dynamic ? (
        <Alert variant="default" className="p-2 text-xs font-medium italic text-muted-foreground">
          {t("This page will use dynamic slug as defined in primary page")}
        </Alert>
      ) : (
        <SlugInput
          disabled={!lang || !parentHasSelectedLanguagePage}
          value={slug}
          onChange={setSlug}
          placeholder={
            !lang
              ? t("Choose language to add slug")
              : isHomePage && useLanguagePrefix
                ? t("Leave empty for home page")
                : t("Enter page slug")
          }
          parentSlug={parentSlug}
          onValidationChange={setIsSlugValid}
          fullSlug={getSlug()}
        />
      )}
    </div>
  );
};

/**
 * Props for DialogFooterSection component
 */
interface DialogFooterSectionProps {
  parentHasSelectedLanguagePage: boolean;
  name: string;
  lang: string;
  slug: string;
  edit: boolean;
  id: any;
  primaryPageObject: any;
  pages: any[];
  isNonSlugPageType: boolean;
  isHomePage: boolean;
  useLanguagePrefix: boolean;
  isSlugValid: boolean;
  isPending: boolean;
}

/**
 * Dialog footer section (action button/alert)
 */
const DialogFooterSection: React.FC<DialogFooterSectionProps> = ({
  parentHasSelectedLanguagePage,
  name,
  lang,
  slug,
  edit,
  id,
  primaryPageObject,
  pages,
  isNonSlugPageType,
  isHomePage,
  useLanguagePrefix,
  isSlugValid,
  isPending,
}) => {
  const { t } = useTranslation();
  // Compute button disabled state
  const isBtnDisabled =
    isPending ||
    !name ||
    !lang ||
    pages.some((p: any) => (edit ? p.id !== id : true) && p.parent === primaryPageObject?.id && p.lang === lang) ||
    (!isNonSlugPageType && !(isHomePage && useLanguagePrefix) && (!isSlugValid || !slug));

  return (
    <DialogFooter>
      {parentHasSelectedLanguagePage ? (
        <>
          <Button type="submit" disabled={isBtnDisabled && !primaryPageObject.dynamic}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="loader mr-2"></span>
                {edit ? t("Updating...") : t("Adding...")}
              </span>
            ) : edit ? (
              t("Update")
            ) : (
              t("Add new language page")
            )}
          </Button>
          {pages.some(
            (p: any) => (edit ? p.id !== id : true) && p.parent === primaryPageObject?.id && p.lang === lang,
          ) && <p className="mt-2 text-xs text-red-500">{t("A page for this language already exists.")}</p>}
        </>
      ) : (
        lang && (
          <Alert variant="destructive">
            <p className="mx-auto w-5/6 text-center">
              {t("You need to create the")} <span className="font-medium">{LANGUAGES[lang]}</span>{" "}
              {t("page in the parent to add here.")}
            </p>
          </Alert>
        )
      )}
    </DialogFooter>
  );
};

/**
 * Props for AddNewLanguagePageContentForNoSlugPage component
 */
interface AddNewLanguagePageContentForNoSlugPageProps {
  onSubmit: (e: FormEvent) => void;
  edit: boolean;
  lang: string;
  languages: string[];
  name: string;
  setLang: (lang: string) => void;
  setName: (name: string) => void;
  primaryPageObject: any;
  parentHasSelectedLanguagePage: boolean;
  id: any;
  pages: any[];
  isNonSlugPageType: boolean;
  isHomePage: boolean;
  useLanguagePrefix: boolean;
  slug: string;
  isSlugValid: boolean;
  isPending: boolean;
}

/**
 * Handles dialog content for page types that do not use slugs.
 * All business logic and validation is preserved.
 */
const AddNewLanguagePageContentForNoSlugPage: React.FC<AddNewLanguagePageContentForNoSlugPageProps> = ({
  onSubmit,
  edit,
  lang,
  languages,
  name,
  setLang,
  setName,
  primaryPageObject,
  parentHasSelectedLanguagePage,
  id,
  pages,
  isNonSlugPageType,
  isHomePage,
  useLanguagePrefix,
  slug,
  isSlugValid,
  isPending,
}) => (
  <form onSubmit={onSubmit}>
    <div className="grid gap-4 py-4">
      <LanguageSelect
        edit={edit}
        lang={lang}
        languages={languages}
        name={name}
        setLang={setLang}
        setName={setName}
        primaryPageObject={primaryPageObject}
      />
      <NameInput
        lang={lang}
        name={name}
        setName={setName}
        parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
      />
      {/* No slug input section for non-slug page types */}
    </div>
    <DialogFooterSection
      parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
      name={name}
      lang={lang}
      slug={slug}
      edit={edit}
      id={id}
      primaryPageObject={primaryPageObject}
      pages={pages}
      isNonSlugPageType={isNonSlugPageType}
      isHomePage={isHomePage}
      useLanguagePrefix={useLanguagePrefix}
      isSlugValid={isSlugValid}
      isPending={isPending}
    />
  </form>
);

/**
 * Props for AddNewLanguagePageContent component
 */
interface AddNewLanguagePageContentProps {
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
  edit: boolean;
  lang: string;
  languages: string[];
  name: string;
  setLang: (lang: string) => void;
  setName: (name: string) => void;
  primaryPageObject: any;
  parentHasSelectedLanguagePage: boolean;
  isNonSlugPageType: boolean;
  isRootPage: boolean;
  useLanguagePrefix: boolean;
  setUseLanguagePrefix: (val: boolean) => void;
  isHomePage: boolean;
  parentSlug: string | undefined;
  slug: string;
  setSlug: (slug: string) => void;
  isSlugValid: boolean;
  setIsSlugValid: (valid: boolean) => void;
  getSlug: () => string;
  isPending: boolean;
  id: any;
  pages: any[];
}

/**
 * Handles the main dialog content (loading, form, subcomponents).
 * Separated for clarity and maintainability. All logic/validation is passed via props.
 */
const AddNewLanguagePageContent: React.FC<AddNewLanguagePageContentProps> = ({
  loading,
  onSubmit,
  edit,
  lang,
  languages,
  name,
  setLang,
  setName,
  primaryPageObject,
  parentHasSelectedLanguagePage,
  isNonSlugPageType,
  isRootPage,
  useLanguagePrefix,
  setUseLanguagePrefix,
  isHomePage,
  parentSlug,
  slug,
  setSlug,
  isSlugValid,
  setIsSlugValid,
  getSlug,
  isPending,
  id,
  pages,
}) => {
  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader className="animate-spin" />
      </div>
    );
  }
  if (isNonSlugPageType) {
    return (
      <AddNewLanguagePageContentForNoSlugPage
        onSubmit={onSubmit}
        edit={edit}
        lang={lang}
        languages={languages}
        name={name}
        setLang={setLang}
        setName={setName}
        primaryPageObject={primaryPageObject}
        parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
        id={id}
        pages={pages}
        isNonSlugPageType={isNonSlugPageType}
        isHomePage={isHomePage}
        useLanguagePrefix={useLanguagePrefix}
        slug={slug}
        isSlugValid={isSlugValid}
        isPending={isPending}
      />
    );
  }
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <LanguageSelect
          edit={edit}
          lang={lang}
          languages={languages}
          name={name}
          setLang={setLang}
          setName={setName}
          primaryPageObject={primaryPageObject}
        />
        <NameInput
          lang={lang}
          name={name}
          setName={setName}
          parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
        />
        <SlugSection
          dynamic={primaryPageObject?.dynamic}
          isNonSlugPageType={isNonSlugPageType}
          isRootPage={isRootPage}
          lang={lang}
          useLanguagePrefix={useLanguagePrefix}
          setUseLanguagePrefix={setUseLanguagePrefix}
          isHomePage={isHomePage}
          parentSlug={parentSlug}
          parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
          slug={slug}
          setSlug={setSlug}
          isSlugValid={isSlugValid}
          setIsSlugValid={setIsSlugValid}
          getSlug={getSlug}
        />
      </div>
      <DialogFooterSection
        parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
        name={name}
        lang={lang}
        slug={slug}
        edit={edit}
        id={id}
        primaryPageObject={primaryPageObject}
        pages={pages}
        isNonSlugPageType={isNonSlugPageType}
        isHomePage={isHomePage}
        useLanguagePrefix={useLanguagePrefix}
        isSlugValid={isSlugValid}
        isPending={isPending}
      />
    </form>
  );
};

// Main AddNewLanguagePage orchestrator
const AddNewLanguagePage = ({
  id,
  isOpen,
  onClose,
  primaryPage,
  edit = false,
  preselectedLang,
}: AddNewLanguagePageProps) => {
  // Fetch all pages and find the primary page object
  const { data: pages = [] } = useWebsitePrimaryPages();
  const primaryPageObject = useMemo(() => pages.find((p: any) => p.id === primaryPage), [pages, primaryPage]);

  // State for form fields
  const [name, setName] = useState("");
  const [lang, setLang] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugValid, setIsSlugValid] = useState(true);
  const [useLanguagePrefix, setUseLanguagePrefix] = useState(true);

  // API mutation hooks
  const { mutate: addNewPage, isPending: isAdding } = useCreatePage();
  const { mutate: updatePage, isPending: isUpdating } = useUpdatePage();
  const isPending = isAdding || isUpdating;

  // Hooks for language and page context
  const { data: websiteData, isFetching: isFetchingWebsiteData } = useWebsiteSetting();
  const fallbackLang = useFallbackLang();
  const { data: languagePages, isFetching: isFetchingLanguagePages } = useLanguagePages(primaryPage);
  const { data: parentLanguagePages = [], isFetching: isFetchingParentLanguagePages } = useLanguagePages(
    primaryPageObject?.parent,
  );
  const { data: pageTypes = [], isFetching: isFetchingPageTypes } = usePageTypes();
  const { setSelectedLang } = useLanguages();
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const [, setActivePanel] = useSidebarActivePanel();
  const loading =
    isFetchingWebsiteData || isFetchingLanguagePages || isFetchingParentLanguagePages || isFetchingPageTypes;

  const languages = useMemo(() => {
    return filter(websiteData?.languages, (lang) => {
      return !find(languagePages, { lang });
    });
  }, [websiteData, languagePages]);

  // Memoized values for easier computation
  const pageTypeObject = useMemo(
    () => pageTypes.find((type: any) => type.key === primaryPageObject?.pageType),
    [pageTypes, primaryPageObject?.pageType],
  );
  const isNonSlugPageType = !pageTypeObject?.hasSlug;
  const isHomePage = primaryPageObject?.slug === "/";

  /**
   * Effect: Pre-fill form fields for edit mode, including slug prefix logic.
   * For new, pre-fill name from primary.
   */
  useEffect(() => {
    if (!edit && primaryPageObject && preselectedLang) {
      setLang(preselectedLang);
      setName(`${primaryPageObject.name} - ${LANGUAGES[preselectedLang]}`);
    }

    if (!edit || !primaryPageObject) return;
    const pageToEdit = languagePages?.find((p: any) => p.id === id);

    if (!pageToEdit) return;

    setName(pageToEdit.name);
    setLang(pageToEdit.lang);

    // Slug prefix logic for edit mode (moved to slug-utils)
    const fullSlug = pageToEdit.slug || "";
    const { initSlug, prefix } = parseSlugForEdit(fullSlug, primaryPageObject);
    setSlug(initSlug);
    setUseLanguagePrefix(prefix);
  }, [edit, id, languagePages, primaryPageObject, preselectedLang]);

  // Effect: Set pre-selected language if provided or if there's only one language available
  useEffect(() => {
    if (preselectedLang) {
      setLang(preselectedLang);
    } else if (languages?.length === 1 && !edit) {
      // * Auto-select the only available language when adding a new language
      const onlyLang = languages[0];
      if (!onlyLang || !LANGUAGES[onlyLang]) return;
      setLang(onlyLang);
      // Also update the name if it's not set or is using the default pattern
      if (!name || name === primaryPageObject?.name) {
        setName(`${primaryPageObject?.name} - ${LANGUAGES[onlyLang]}`);
      }
    }
  }, [preselectedLang, languages, edit, name, primaryPageObject]);

  // Compute parent slug and root status
  const { parentSlug, isRootPage } = useMemo(() => {
    if (isHomePage || !lang) {
      return { parentSlug: undefined, isRootPage: !primaryPageObject?.parent };
    }
    if (!primaryPageObject?.parent) {
      return {
        parentSlug: useLanguagePrefix ? `/${lang}` : undefined,
        isRootPage: true,
      };
    }
    const parentPage = parentLanguagePages?.find((page: any) => page.lang === lang);
    return { parentSlug: parentPage?.slug, isRootPage: false };
  }, [primaryPageObject?.parent, parentLanguagePages, useLanguagePrefix, lang, isHomePage]);

  // Check if the parent page for the selected language exists
  // If not, show alert and disable submit
  const parentHasSelectedLanguagePage: boolean = useMemo(() => {
    if (isRootPage) return true;
    return Boolean(parentLanguagePages?.some((page: any) => page?.lang === lang));
  }, [lang, parentLanguagePages, isRootPage]);

  // Function to generate the final slug (matches original logic)
  const getSlug = () => {
    let finalSlug = "";
    if (isRootPage) {
      finalSlug = `/${useLanguagePrefix ? [lang, slug].filter(Boolean).join("/") : slug}`;
    } else {
      finalSlug = `${removeSlugExtension(parentSlug)}/${slug}`;
    }
    // Replace double slashes with a single slash, remove trailing slash
    return finalSlug.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  };

  // Update URL with new language (for non-edit flow)
  const updateUrlWithLang = (newLang: string) => {
    const currentParams = new URLSearchParams(window.location.search);
    if (fallbackLang && newLang === fallbackLang) {
      currentParams.delete("lang");
    } else {
      currentParams.set("lang", newLang);
    }
    setSearchParams(currentParams);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Form submission handler
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      lang,
      primaryPage: primaryPageObject?.id,
      slug: isNonSlugPageType ? "" : getSlug(),
      pageType: primaryPageObject?.pageType,
      ...(edit && { id }),
    };
    const handleSuccess = () => {
      if (!edit && lang) {
        setSelectedLang(lang);
        updateUrlWithLang(lang);
      }
      setActivePanel("outline");
      onClose();
    };
    if (edit) {
      updatePage(payload, { onSuccess: handleSuccess });
    } else {
      addNewPage(payload, { onSuccess: handleSuccess });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <DialogContent className="text-slate-600 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{edit ? t("Edit language") : t("Add new language page")}</DialogTitle>
            <DialogDescription className="font-light">{t("Enter the details for the language")}</DialogDescription>
          </DialogHeader>
          {/* Main dialog content separated for clarity and maintainability */}
          <AddNewLanguagePageContent
            id={id}
            pages={pages}
            loading={loading}
            onSubmit={onSubmit}
            edit={edit}
            lang={lang}
            languages={languages}
            name={name}
            setLang={setLang}
            setName={setName}
            primaryPageObject={primaryPageObject}
            parentHasSelectedLanguagePage={parentHasSelectedLanguagePage}
            isNonSlugPageType={isNonSlugPageType}
            isRootPage={isRootPage}
            useLanguagePrefix={useLanguagePrefix}
            setUseLanguagePrefix={setUseLanguagePrefix}
            isHomePage={isHomePage}
            parentSlug={parentSlug}
            slug={slug}
            setSlug={setSlug}
            isSlugValid={isSlugValid}
            setIsSlugValid={setIsSlugValid}
            getSlug={getSlug}
            isPending={isPending}
          />
        </DialogContent>
      )}
    </Dialog>
  );
};

export default AddNewLanguagePage;
