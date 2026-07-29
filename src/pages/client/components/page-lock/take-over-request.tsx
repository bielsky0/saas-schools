import { AlertCircle, Check, UserIcon, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { useSavePage } from "~/hooks/use-save-page";
import { BlurContainer } from "~/pages/client/components/chai-loader";
import { useChaiUserInfo } from "~/pages/hooks/utils/use-chai-user-info";
import { usePageLockMeta, usePageLockStatus, useSendRealtimeEvent } from "./page-lock-hook";
import { EVENT, PAGE_STATUS } from "./page-lock-utils";

const TakeOverRequest = () => {
  const sendEvent = useSendRealtimeEvent();
  const { pageLockMeta } = usePageLockMeta();
  const { setPageStatus } = usePageLockStatus();
  const { savePageAsync } = useSavePage();
  const requestingUserId = pageLockMeta?.requestingUserId;
  const { data, isFetching } = useChaiUserInfo(requestingUserId || "");
  const currentEditorName = isFetching ? "Fetching user..." : data?.name || "Current editor";
  const [disabled, setDisabled] = useState(false);

  const handleAccept = async () => {
    setDisabled(true);
    await savePageAsync();
    sendEvent(EVENT.CONTINUE_EDITING_IN_THIS_CLIENT, pageLockMeta);
    setPageStatus(PAGE_STATUS.CHECKING);
    setTimeout(() => setDisabled(false), 2000);
  };

  const handleReject = () => {
    setDisabled(true);
    sendEvent(EVENT.TAKE_OVER_REJECTED, pageLockMeta);
    setPageStatus(PAGE_STATUS.EDITING);
    setTimeout(() => setDisabled(false), 2000);
  };
  const { t } = useTranslation();
  return (
    <BlurContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-8 w-8 rounded-md bg-amber-500/20 p-1.5 text-amber-500" />
            {t("Take Over Requested")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative rounded-md border border-green-500 px-2 pb-2 pt-4">
            <div className="absolute -top-2.5 left-3 w-max rounded-full bg-green-500 px-3 py-1 text-xs font-medium leading-3 text-white">
              Requested by
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
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-gray-700">{currentEditorName}</span> {t("has requested to")}{" "}
            <span className="font-medium text-gray-500">take over</span> {t("editing this page.")}.{" "}
            {t("Do you want to allow them to continue?")}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button disabled={disabled} variant="default" onClick={handleAccept} className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            {t("Accept")}
          </Button>
          <Button disabled={disabled} variant="outline" onClick={handleReject} className="flex-1 gap-2">
            <X className="h-4 w-4" />
            {t("Reject")}
          </Button>
        </CardFooter>
      </Card>
    </BlurContainer>
  );
};

export default TakeOverRequest;
