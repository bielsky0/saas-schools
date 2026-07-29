import { Check, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { BlurContainer } from "~/pages/client/components/chai-loader";
import { usePageLockMeta } from "./page-lock-hook";

const ContinueEditingInThisClient = () => {
  const { setPageLockMeta } = usePageLockMeta();
  const { t } = useTranslation();

  const handleAccept = async () => {
    setPageLockMeta({});
  };

  return (
    <BlurContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-6 w-6 text-green-500" />
            {t("You can edit the page now")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("This page is released by other user you can continue editing now")}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="default" onClick={handleAccept} className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            {t("Continue Editing")}
          </Button>
        </CardFooter>
      </Card>
    </BlurContainer>
  );
};

export default ContinueEditingInThisClient;
