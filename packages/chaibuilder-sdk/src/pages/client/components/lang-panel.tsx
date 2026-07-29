import { useSetAtom } from "jotai";
import { filter, find, get, isEmpty, map } from "lodash-es";
import { MoreHorizontal, PencilIcon, Power, StarIcon, TrashIcon } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useLanguages } from "~/hooks/use-languages";
import { addNewLangAtom } from "~/pages/atom/add-new-lang";
import { ChangeSlug } from "~/pages/client/components/change-slug";
import { LANGUAGES } from "~/pages/constants/LANGUAGES";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";
import { useWebsiteSetting } from "~/pages/hooks/project/use-website-settings";
import { ChaiPageType } from "~/types/actions";

const DeletePage = lazy(() => import("~/pages/client/components/delete-page"));
const UnpublishPage = lazy(() => import("~/pages/client/components/unpublish-page"));

const LangPanel = () => {
  const { t } = useTranslation();
  const setAddNewLang = useSetAtom(addNewLangAtom);
  const { selectedLang, fallbackLang, setSelectedLang } = useLanguages();
  const { data: languagePages, isFetching } = useLanguagePages();
  const { data: currentPage } = usePrimaryPage();
  const { data: pageTypes } = usePageTypes();

  const dynamicSlug = useMemo(() => {
    const pageType = pageTypes?.find((type: ChaiPageType) => type.key === currentPage?.pageType);
    return currentPage?.dynamic ? pageType?.dynamicSlug : "";
  }, [pageTypes, currentPage?.pageType, currentPage?.dynamic]);

  const [deletePage, setDeletePage] = useState(null);
  const [unpublishPage, setUnpublishPage] = useState(null);
  const [changeSlugPage, setChangeSlugPage] = useState(null);

  const { data } = useWebsiteSetting();
  const languages = filter(
    get(data, "languages") || ["en"],
    (lang: any) => !find(languagePages, { lang: lang }) && lang !== get(data, "fallbackLang"),
  );

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {isFetching ? (
          <div className="w-full space-y-3 py-4">
            <div className="h-8 w-full animate-pulse rounded bg-gray-300" />
            <div className="h-8 w-full animate-pulse rounded bg-gray-300" />
            <div className="h-8 w-full animate-pulse rounded bg-gray-300" />
          </div>
        ) : (
          map(languagePages, (langPage: any) => {
            const lang = langPage.lang;
            const slug = langPage.slug;
            const isFallback = !langPage.primaryPage;
            const isSelected = lang === selectedLang;
            return (
              <>
                <li
                  key={langPage.id}
                  className={`flex w-full cursor-pointer items-center justify-between rounded p-2 text-slate-500 ${isSelected ? "bg-gray-200" : "hover:bg-gray-100"}`}
                  onClick={() => setSelectedLang(lang)}>
                  <div className="flex-1 gap-x-3">
                    <div className={`flex items-center gap-x-2 text-[13px] text-slate-800`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${langPage.online ? "bg-green-300" : "bg-gray-300"}`} />
                      {get(LANGUAGES, isFallback ? fallbackLang : lang, lang)}
                    </div>
                    <div>
                      {slug && (
                        <div className="text-[11px] font-light text-slate-600">
                          Slug: <b className="font-mono font-medium">{dynamicSlug ? `${slug}/${dynamicSlug}` : slug}</b>
                        </div>
                      )}
                      <div className="text-[11px] font-light text-slate-600">
                        Name:
                        <b className="font-medium"> {langPage.name} </b>
                      </div>
                    </div>
                  </div>
                  {isFallback ? (
                    <div className="flex items-center gap-x-1 text-[11px] text-orange-500">
                      <StarIcon fill="orange" className="h-3 w-3" />
                      <b> Primary</b>
                    </div>
                  ) : (
                    <div className="flex items-center gap-x-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className={`h-8 w-8 p-0`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[9999] text-sm">
                          <DropdownMenuItem
                            className="flex cursor-pointer items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddNewLang({
                                edit: true,
                                id: langPage.id,
                                primaryPage: langPage.primaryPage,
                              });
                            }}>
                            <PencilIcon className="size-3" />
                            {t("Edit")}
                          </DropdownMenuItem>

                          {langPage?.online && (
                            <DropdownMenuItem
                              className="flex cursor-pointer items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnpublishPage(langPage);
                              }}>
                              <Power className="size-3" />
                              {t("Unpublish")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="flex cursor-pointer items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletePage(langPage);
                            }}>
                            <TrashIcon className="size-3" />
                            {t("Delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
                <div className="h-1 w-full border-b" />
              </>
            );
          })
        )}
      </ul>

      <div className="flex w-full justify-center">
        <Button
          variant="default"
          size="sm"
          disabled={isEmpty(languages)}
          onClick={() => {
            setAddNewLang({
              primaryPage: currentPage?.id,
              edit: false,
            });
          }}>
          {t("Add new language page")}
        </Button>
      </div>

      {deletePage && (
        <Suspense>
          <DeletePage page={deletePage} onClose={() => setDeletePage(null)} />
        </Suspense>
      )}

      {unpublishPage && (
        <Suspense>
          <UnpublishPage page={unpublishPage} onClose={() => setUnpublishPage(null)} />
        </Suspense>
      )}

      {changeSlugPage && (
        <Suspense>
          <ChangeSlug page={changeSlugPage} onClose={() => setChangeSlugPage(null)} />
        </Suspense>
      )}
    </div>
  );
};

export default LangPanel;
