import { useSetAtom } from "jotai";
import { get } from "lodash-es";
import { File, Hash, Loader, MoreHorizontal, MoreVertical } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "~/components/ui/button";
import { useLanguages } from "~/hooks/use-languages";
import { addNewLangAtom } from "~/pages/atom/add-new-lang";
import { useCurrentActivePage } from "~/pages/hooks/pages/use-current-page";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { PageActionsDropdown } from "./page-action-dropdown";
import { usePageLockStatus } from "./page-lock/page-lock-hook";

const AddNewPage = lazy(() => import("./add-new-page"));
const DeletePage = lazy(() => import("./delete-page"));
const DuplicatePage = lazy(() => import("./duplicate-page"));
const MarkAsTemplate = lazy(() => import("./mark-as-template"));
const UnmarkAsTemplate = lazy(() => import("./unmark-as-template"));
const UnpublishPage = lazy(() => import("./unpublish-page"));

export const PageDropdownInHeader = () => {
  // Modal states
  const [deletePageModal, setDeletePageModal] = useState<any>(null);
  const [unpublishPageModal, setUnpublishPageModal] = useState<any>(null);
  const [markAsTemplateModal, setMarkAsTemplateModal] = useState<any>(null);
  const [unmarkAsTemplateModal, setUnmarkAsTemplateModal] = useState<any>(null);
  const [duplicatePageModal, setDuplicatePageModal] = useState<any>(null);
  const [addEditPageModal, setAddEditPageModal] = useState<any>(null);

  const { data: page, isFetching } = useCurrentActivePage();
  const { selectedLang, fallbackLang } = useLanguages();
  const { data: languagePages } = useLanguagePages();
  const currentLangPage = languagePages?.find((langPage) => langPage.lang === selectedLang);
  const { isLocked } = usePageLockStatus();
  const isPartial = !page?.slug;
  const setAddNewLang = useSetAtom(addNewLangAtom);

  if (!page) return null;

  const handleAddEditPage = (page: any) => {
    if (selectedLang.length > 0 && selectedLang !== fallbackLang) {
      setAddNewLang({
        edit: true,
        id: page?.id,
        primaryPage: page?.primaryPage,
      });
    } else {
      setAddEditPageModal(page);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded px-[2px] transition-colors duration-200">
        <p className="flex h-7 max-w-[200px] items-center truncate rounded px-1 text-xs font-medium">
          {isFetching ? (
            <Loader className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <span className="flex items-end overflow-hidden text-ellipsis whitespace-nowrap rounded-sm text-xs font-medium">
              {isPartial ? <Hash className="mr-1 h-4 w-4" /> : <File className="mr-1 h-4 w-4" />}
              {get(currentLangPage || page, "name") ?? ""}
            </span>
          )}
        </p>
        {isLocked ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-not-allowed rounded opacity-50 hover:bg-transparent">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        ) : (
          <PageActionsDropdown
            page={page}
            setDuplicatePage={(page) => setDuplicatePageModal(page)}
            setAddEditPage={(page) => handleAddEditPage(page)}
            setUnpublishPage={(page) => setUnpublishPageModal(page)}
            setDeletePage={(page) => setDeletePageModal(page)}
            isLanguagePage={selectedLang.length > 0 && selectedLang !== fallbackLang}>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </PageActionsDropdown>
        )}
      </div>

      {/* Modal Components */}
      {addEditPageModal && (
        <Suspense>
          <AddNewPage
            closePanel={() => setAddEditPageModal(null)}
            editPage={() => {}}
            addEditPage={addEditPageModal}
            setAddEditPage={setAddEditPageModal}
          />
        </Suspense>
      )}

      {deletePageModal && (
        <Suspense>
          <DeletePage page={deletePageModal} onClose={() => setDeletePageModal(null)} />
        </Suspense>
      )}

      {unpublishPageModal && (
        <Suspense>
          <UnpublishPage page={unpublishPageModal} onClose={() => setUnpublishPageModal(null)} />
        </Suspense>
      )}

      {markAsTemplateModal && (
        <Suspense>
          <MarkAsTemplate page={markAsTemplateModal} onClose={() => setMarkAsTemplateModal(null)} />
        </Suspense>
      )}

      {unmarkAsTemplateModal && (
        <Suspense>
          <UnmarkAsTemplate page={unmarkAsTemplateModal} onClose={() => setUnmarkAsTemplateModal(null)} />
        </Suspense>
      )}

      {duplicatePageModal && (
        <Suspense>
          <DuplicatePage
            page={duplicatePageModal}
            onClose={() => setDuplicatePageModal(null)}
            closePanel={() => setAddEditPageModal(null)}
          />
        </Suspense>
      )}
    </>
  );
};
