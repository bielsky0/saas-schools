import { Edit, TableIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { BlurContainer } from "~/pages/client/components/chai-loader";
import { usePageLockStatus, useSendRealtimeEvent } from "./page-lock-hook";
import { EVENT, PAGE_STATUS } from "./page-lock-utils";

const ActiveInAntherTabDialog = () => {
  const sendEvent = useSendRealtimeEvent();
  const { setPageStatus } = usePageLockStatus();
  const { t } = useTranslation();
  return (
    <BlurContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl font-medium">
            <TableIcon className="h-6 w-6 text-green-500" />
            <span>{t("Active in Another Tab")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "This page is currently being edited in another tab. You can continue editing here, which will close the editor in the other tab.",
            )}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="default"
            onClick={() => {
              sendEvent(EVENT.CONTINUE_EDITING_IN_THIS_TAB_REQUEST);
              setPageStatus(PAGE_STATUS.CHECKING);
            }}
            className="gap-2">
            <Edit className="h-4 w-4" />
            {t("Continue Editing Here")}
          </Button>
        </CardFooter>
      </Card>
    </BlurContainer>
  );
};

export default ActiveInAntherTabDialog;
