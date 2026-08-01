"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("common.error");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md" role="alert">
        <AlertTitle>{t("unexpected")}</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          <p>{t("unexpectedBody")}</p>
          <div>
            <Button type="button" onClick={() => unstable_retry()} size="sm">
              {t("retry")}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
