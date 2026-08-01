import { find } from "lodash-es";
import { CopyPlusIcon, Pencil, Power, SquareLibrary, Trash } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { usePermissions } from "~/hooks/use-permissions";
import { PAGES_PERMISSIONS } from "~/pages/constants/PERMISSIONS";
import { usePageTypes } from "~/pages/hooks/project/use-page-types";

interface PageActionsDropdownProps {
  page: any;
  setDuplicatePage: (page: any) => void;
  setAddEditPage: (page: any) => void;
  setUnpublishPage: (page: any) => void;
  setDeletePage: (page: any) => void;
  setMarkAsTemplate?: (page: any) => void;
  setUnmarkAsTemplate?: (page: any) => void;
  children: React.ReactNode;
  isLanguagePage?: boolean;
}

export const PageActionsDropdown = ({
  page,
  setDuplicatePage,
  setAddEditPage,
  setUnpublishPage,
  setDeletePage,
  setMarkAsTemplate,
  setUnmarkAsTemplate,
  children,
  isLanguagePage,
}: PageActionsDropdownProps) => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const { data: pageTypes } = usePageTypes();
  const pageType = useMemo(() => find(pageTypes, { key: page.pageType }), [pageTypes, page.pageType]);

  const hasSlug = pageType?.hasSlug !== false;
  const isTemplate = page.pageType === "template";

  const noMoreActions =
    !hasPermission(PAGES_PERMISSIONS.EDIT_PAGE) &&
    !hasPermission(PAGES_PERMISSIONS.DELETE_PAGE) &&
    !hasPermission(PAGES_PERMISSIONS.UNPUBLISH_PAGE) &&
    !hasPermission(PAGES_PERMISSIONS.MARK_AS_TEMPLATE) &&
    !hasPermission(PAGES_PERMISSIONS.UNMARK_AS_TEMPLATE);

  if (noMoreActions || !page) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="text-sm">
        {hasPermission(PAGES_PERMISSIONS.ADD_PAGE) && !isLanguagePage && (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setDuplicatePage(page);
            }}>
            <CopyPlusIcon className="size-3" />
            Duplicate page
          </DropdownMenuItem>
        )}
        {hasPermission(PAGES_PERMISSIONS.EDIT_PAGE) && (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setAddEditPage({
                ...page,
                global: !pageType?.hasSlug,
              });
            }}>
            <Pencil className="size-3" />
            Edit
          </DropdownMenuItem>
        )}
        {page?.online && hasPermission(PAGES_PERMISSIONS.UNPUBLISH_PAGE) && (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setUnpublishPage(page);
            }}>
            <Power className="size-3" />
            {t("Unpublish")}
          </DropdownMenuItem>
        )}
        {hasPermission(PAGES_PERMISSIONS.DELETE_PAGE) && (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setDeletePage(page);
            }}>
            <Trash className="size-3" />
            {t("Delete")}
          </DropdownMenuItem>
        )}
        {setMarkAsTemplate &&
          setUnmarkAsTemplate &&
          hasSlug &&
          !isLanguagePage &&
          hasPermission(
            isTemplate ? PAGES_PERMISSIONS.UNMARK_AS_TEMPLATE : PAGES_PERMISSIONS.MARK_AS_TEMPLATE,
          ) && (
            <>
              {isTemplate ? (
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUnmarkAsTemplate(page);
                  }}>
                  <SquareLibrary className="size-3" />
                  {t("Unmark as template")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMarkAsTemplate(page);
                  }}>
                  <SquareLibrary className="size-3" />
                  {t("Mark as template")}
                </DropdownMenuItem>
              )}
            </>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
