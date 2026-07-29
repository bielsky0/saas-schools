import { AlertCircleIcon, Edit, LockKeyhole, ShieldAlert, UserIcon, X } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { BlurContainer } from "~/pages/client/components/chai-loader";
import { useChaiUserInfo } from "~/pages/hooks/utils/use-chai-user-info";
import { useCurrentPageOwner, usePageLockMeta, usePageLockStatus, useSendRealtimeEvent } from "./page-lock-hook";
import { EVENT, PAGE_STATUS } from "./page-lock-utils";

interface PageLockMeta {
  type?: string;
  requestingUserId?: string;
  requestingClientId?: string;
}

const PageLockedDialog = () => {
  const pageOwner = useCurrentPageOwner();
  const sendEvent = useSendRealtimeEvent();
  const { setPageStatus } = usePageLockStatus();
  const { data, isFetching } = useChaiUserInfo(pageOwner?.userId || "");
  const { pageLockMeta, setPageLockMeta } = usePageLockMeta();
  const { t } = useTranslation();

  const [action, setAction] = useState<string>("");
  const [localPageLockMeta, setLocalPageLockMeta] = useState<PageLockMeta>({});
  const [forceTakeOverConfirmed, setForceTakeOverConfirmed] = useState(false);
  const timerId = useRef<any>(null);

  useEffect(() => {
    if (pageLockMeta?.type) {
      if (timerId.current) clearTimeout(timerId.current);
      startTransition(() => {
        setLocalPageLockMeta(pageLockMeta);
        setPageLockMeta({} as PageLockMeta);
        setAction("");
      });
    }
  }, [pageLockMeta, setPageLockMeta]);

  const handleRequestTakeOver = () => {
    if (action === EVENT.TAKE_OVER_REQUEST) return;
    setAction(EVENT.TAKE_OVER_REQUEST);
    sendEvent(EVENT.TAKE_OVER_REQUEST);
    timerId.current = setTimeout(() => setAction(""), 20000);
  };

  const handleForceTakeOver = () => {
    if (action === EVENT.FORCE_TAKE_OVER_REQUEST) return;
    setAction(EVENT.FORCE_TAKE_OVER_REQUEST);
    sendEvent(EVENT.FORCE_TAKE_OVER_REQUEST);
    setPageStatus(PAGE_STATUS.CHECKING);
    timerId.current = setTimeout(() => setAction(""), 20000);
  };

  const handleCloseAlert = () => {
    setLocalPageLockMeta({} as PageLockMeta);
    if (timerId.current) clearTimeout(timerId.current);
    setAction("");
  };

  const currentEditorName = isFetching ? "Loading..." : data?.name || "Current editor";

  const isTakeOverRequested = action === EVENT.TAKE_OVER_REQUEST;
  const isForceTakeOverInProgress = action === EVENT.FORCE_TAKE_OVER_REQUEST;

  return (
    <BlurContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1 border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <LockKeyhole className="h-8 w-8 rounded-md bg-sky-500/20 p-1.5 text-sky-500" />
            <span>{t("Page Locked for Editing")}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="relative rounded-md border border-green-500 px-2 pb-2 pt-4">
            <div className="absolute -top-2.5 left-3 w-max rounded-full bg-green-500 px-3 py-1 text-xs font-medium leading-3 text-white">
              Current Editor
            </div>
            <div className="flex items-center space-x-4 p-1">
              {data?.avatar ? (
                <img
                  src={data.avatar}
                  alt={data.name}
                  className="h-12 w-12 flex-shrink-0 rounded-full bg-black text-white"
                />
              ) : (
                <UserIcon className="h-12 w-12 flex-shrink-0 rounded-full bg-black p-3 text-white" />
              )}
              <div className="flex-1 space-y-0">
                <div className="truncate font-medium leading-tight text-black">{currentEditorName}</div>
                {data?.email && <p className="truncate text-sm leading-tight text-muted-foreground">{data.email}</p>}
              </div>
            </div>
          </div>

          {(localPageLockMeta?.type === EVENT.TAKE_OVER_REJECTED ||
            localPageLockMeta?.type === EVENT.FORCE_TAKE_OVER_REQUEST) && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-x-2 rounded border border-red-500 bg-red-500/10 py-2 pl-3 pr-2 text-sm font-medium text-red-500">
                <div className="flex items-start gap-x-2">
                  <AlertCircleIcon className="mt-px flex h-4 w-4 shrink-0" />
                  <div className="font-light leading-tight">
                    <span className="font-medium">{data?.name || "The current editor"}</span>
                    {localPageLockMeta?.type === EVENT.TAKE_OVER_REJECTED
                      ? " rejected your take over request."
                      : " forcefully took over this page."}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={handleCloseAlert} className="flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </section>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t pt-3">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Take Over Options")}
            </h3>

            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-2">
                <p className="text-sm font-medium">{t("Take Over Request:")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Send a request to {{currentEditorName}} asking them to release the page. They can accept or decline your request.",
                    { currentEditorName },
                  )}
                </p>
              </div>

              <Button
                disabled={isTakeOverRequested}
                variant="default"
                onClick={handleRequestTakeOver}
                className="mt-3 w-full gap-2">
                <Edit className="h-4 w-4" />
                {isTakeOverRequested ? "Take over request sent" : "Send Take Over Request"}
              </Button>

              {isTakeOverRequested && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("Request sent. If no response, try again or use force take over.")}
                </p>
              )}
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem
                value="force-takeover"
                className="rounded-md border border-destructive/40 bg-destructive/5">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <div>
                      <p className="flex items-center gap-x-2 text-sm font-medium text-destructive">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        {t("Force Take Over")}
                      </p>
                      <p className="pl-6 text-xs font-normal leading-tight text-muted-foreground">
                        {t("Immediately take control (use with caution)")}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-background p-2">
                      <input
                        type="checkbox"
                        id="force-takeover"
                        checked={forceTakeOverConfirmed}
                        onChange={(e) => setForceTakeOverConfirmed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="force-takeover" className="flex-1 text-xs text-muted-foreground">
                        {t(
                          "I understand this will immediately close the editor for {{currentEditorName}}. I am using this option with caution.",
                          { currentEditorName },
                        )}
                      </label>
                    </div>

                    <Button
                      disabled={!forceTakeOverConfirmed || isForceTakeOverInProgress}
                      variant="destructive"
                      onClick={handleForceTakeOver}
                      className="w-full gap-2">
                      <ShieldAlert className="h-4 w-4" />
                      {isForceTakeOverInProgress ? t("Take over page...") : t("Force Take Over")}
                    </Button>

                    {isForceTakeOverInProgress && (
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "Attempting to forcefully take over this page. Please wait while we update the editing session.",
                        )}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </CardFooter>
      </Card>
    </BlurContainer>
  );
};

export default PageLockedDialog;
