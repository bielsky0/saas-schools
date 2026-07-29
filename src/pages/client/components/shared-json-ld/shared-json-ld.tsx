import { filter, find } from "lodash-es";
import { Edit, Eye, Loader, Plus, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useLanguages } from "~/hooks/use-languages";
import { usePrimaryPage } from "~/pages/hooks/pages/use-current-page";
import { useLanguagePages } from "~/pages/hooks/pages/use-language-pages";
import { useDeleteGlobalSchema, useTogglePageGlobalSchema } from "~/pages/hooks/project/mutations";
import { useGlobalJsonLDItems } from "~/pages/hooks/use-global-json-ld";
import { AddSharedJsonLD } from "./add-shared-json-ld";
import { EditSharedJsonLD } from "./edit-shared-json-ld";

export default function SharedJsonLD() {
  const [showAdd, setShowAdd] = useState(false);
  const [copyData, setCopyData] = useState<
    { name: string; description: string; jsonld: any; languageCode?: string; primaryPageId?: string } | undefined
  >(undefined);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { data: globalJsonLDItems, isLoading } = useGlobalJsonLDItems();
  const { selectedLang } = useLanguages();
  const { data: currentPage } = usePrimaryPage();
  const { data: languagePages } = useLanguagePages();
  const { mutateAsync: deleteGlobalSchema } = useDeleteGlobalSchema();
  const { mutateAsync: togglePageGlobalSchema } = useTogglePageGlobalSchema();

  // Get default language page (primary page - the one without a primaryPage reference)
  const defaultLanguagePage = useMemo(() => {
    return languagePages?.find((page: any) => !page.primaryPage && page.lang === "");
  }, [languagePages]);

  // Get enabled schemas for default language page
  const defaultPageEnabledSchemas = useMemo(() => {
    return (defaultLanguagePage?.globalJsonLds || []) as string[];
  }, [defaultLanguagePage]);

  // Filter and organize schemas: show only default lang schemas (lang === '' and primaryPage === null)
  // For each default schema, check if there's a language version for selectedLang
  const displaySchemas = useMemo(() => {
    if (!globalJsonLDItems) return [];

    // Get all default language schemas (primaryPage === null and lang === '')
    const defaultSchemas = filter(globalJsonLDItems, (item: any) => item.primaryPage === null && item.lang === "");

    return defaultSchemas.map((defaultSchema: any) => {
      // Find if there's a language version for this schema
      const languageVersion = selectedLang
        ? find(globalJsonLDItems, (item: any) => item.primaryPage === defaultSchema.id && item.lang === selectedLang)
        : null;

      return {
        defaultSchema,
        languageVersion,
        // Use language version if available, otherwise use default
        displayItem: languageVersion || defaultSchema,
        hasLanguageVersion: !!languageVersion,
      };
    });
  }, [globalJsonLDItems, selectedLang]);

  // Optimistic state for page global schemas
  const [optimisticSchemas, setOptimisticSchemas] = useState<string[]>([]);
  const pageGlobalSchemas =
    optimisticSchemas.length > 0 ? optimisticSchemas : ((currentPage?.globalJsonLds || []) as string[]);

  // Sync optimistic state with current page data
  useEffect(() => {
    if (currentPage?.globalJsonLds) {
      setOptimisticSchemas(currentPage.globalJsonLds as string[]);
    }
  }, [currentPage?.globalJsonLds]);

  const handleToggle = async (id: string) => {
    if (!currentPage?.id) return;
    setUpdatingId(id);

    // Optimistic update
    const isEnabled = pageGlobalSchemas.includes(id);
    const newSchemas = isEnabled ? pageGlobalSchemas.filter((schemaId) => schemaId !== id) : [...pageGlobalSchemas, id];
    setOptimisticSchemas(newSchemas);

    try {
      await togglePageGlobalSchema({
        schemaId: id,
        pageId: currentPage.id,
        enabled: !isEnabled,
      });
    } catch {
      // Revert on error
      setOptimisticSchemas(currentPage.globalJsonLds as string[]);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setUpdatingId(id);
    try {
      await deleteGlobalSchema(id);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="rounded border bg-muted p-2">
      <div className="flex items-center justify-between pb-2">
        <div>
          <div className="text-xs font-medium">Shared JSON-LD Templates</div>
          <div className="w-full text-xs text-gray-500">
            Manage reusable JSON-LD schemas that can be applied across multiple pages
          </div>
        </div>
        {!selectedLang && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger
              type="button"
              disabled={isLoading}
              className="rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                setShowAdd(true);
              }}>
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </TooltipTrigger>
            <TooltipContent>Add new schema</TooltipContent>
          </Tooltip>
        )}
      </div>
      <ScrollArea className="max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {(!globalJsonLDItems || globalJsonLDItems?.length === 0) && !isLoading && (
            <div className="flex items-center justify-center px-2 py-4 text-xs">No shared JSON-LD found</div>
          )}
          {displaySchemas.map(({ defaultSchema, displayItem, hasLanguageVersion }: any) => {
            const isEnabledOnThisPage = pageGlobalSchemas.includes(displayItem.id);
            const isEnabledInDefaultLanguage = defaultPageEnabledSchemas.includes(defaultSchema.id);
            // For language variants, use the default schema's enabled state
            const effectiveEnabledState =
              hasLanguageVersion && selectedLang ? isEnabledInDefaultLanguage : isEnabledOnThisPage;
            return (
              <Card
                key={defaultSchema.id}
                className={`relative border-gray-300 p-0 shadow-none transition-all ${updatingId === displayItem.id ? "pointer-events-none" : ""}`}>
                {updatingId === displayItem.id && (
                  <div className="absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center rounded-xl bg-white/80">
                    <Loader className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
                <CardHeader className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(hasLanguageVersion || !selectedLang) && (
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <input
                              type="checkbox"
                              checked={effectiveEnabledState}
                              onChange={() => handleToggle(defaultSchema.id)}
                              disabled={!!(hasLanguageVersion && selectedLang)}
                              className="h-5 w-5 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                            />
                          </TooltipTrigger>
                          {hasLanguageVersion && selectedLang && (
                            <TooltipContent>Using the default language state</TooltipContent>
                          )}
                        </Tooltip>
                      )}

                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm leading-none">
                          {displayItem.name}
                          {hasLanguageVersion && selectedLang && (
                            <span className="text-xs font-normal text-muted-foreground">({selectedLang})</span>
                          )}
                          {effectiveEnabledState && (
                            <span className="sr-only text-xs font-normal text-muted-foreground">Enabled</span>
                          )}
                        </CardTitle>
                        {displayItem?.metadata?.description && (
                          <p className="mt-1 text-xs leading-none text-muted-foreground">
                            {displayItem?.metadata?.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="mx-2 h-6 w-px bg-border" />
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0"
                            onClick={() => setViewItemId(displayItem.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View schema</TooltipContent>
                      </Tooltip>
                      {(hasLanguageVersion || !selectedLang) && (
                        <>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0"
                                onClick={() => setEditItemId(displayItem.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit schema</TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger className="flex h-5 w-5 items-center justify-center rounded-md text-red-500 hover:bg-red-100 hover:text-red-800">
                                  <Trash className="h-4 w-4" />
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Delete schema</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Schema</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete{" "}
                                  <span className="font-medium">{displayItem.name}</span>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  type="button"
                                  onClick={() => handleDelete(displayItem.id)}
                                  className="bg-red-500 text-white hover:bg-red-600">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {!hasLanguageVersion && selectedLang && (
                  <CardContent className="px-2 pb-2">
                    <div className="flex w-full flex-col items-center justify-center rounded-lg border bg-gray-100 py-3">
                      <div className="flex items-center gap-2">
                        <div className="max-w-xl text-center text-xs text-gray-500">
                          Not available in '{selectedLang}' language. Default language JSONLD will be used.
                        </div>
                        {isEnabledInDefaultLanguage && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Enabled in default
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setCopyData({
                            name: defaultSchema.name,
                            description: defaultSchema.description || "",
                            jsonld: defaultSchema.jsonld,
                            languageCode: selectedLang,
                            primaryPageId: defaultSchema.id,
                          });
                          setShowAdd(true);
                        }}>
                        Copy & Edit from default language
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader className="h-5 w-5 animate-spin" />
          </div>
        )}
      </ScrollArea>
      <AddSharedJsonLD
        show={showAdd}
        onClose={() => {
          setShowAdd(false);
          setCopyData(undefined);
        }}
        initialData={copyData}
      />
      <EditSharedJsonLD id={editItemId} onClose={() => setEditItemId(null)} />
      <ViewSchemaDialog
        schema={globalJsonLDItems?.find((item: any) => item.id === viewItemId)}
        onClose={() => setViewItemId(null)}
      />
    </div>
  );
}

const ViewSchemaDialog = ({ schema, onClose }: { schema?: any; onClose: () => void }) => {
  return (
    <Dialog open={!!schema} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {schema?.name}
            {schema?.lang && <span className="text-sm font-normal text-muted-foreground">({schema.lang})</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {schema?.description && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Description</div>
              <div className="text-sm">{schema.description}</div>
            </div>
          )}
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">JSON-LD Schema</div>
            <Textarea
              value={JSON.stringify(schema?.jsonld, null, 2)}
              readOnly
              className="font-mono text-xs"
              rows={15}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
