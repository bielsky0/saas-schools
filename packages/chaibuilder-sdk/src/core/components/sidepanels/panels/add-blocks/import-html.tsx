import { CircleIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { CHAI_BUILDER_EVENTS } from "~/core/events";
import { getBlocksFromHTML } from "~/core/import-html/html-to-json";
import { pubsub } from "~/core/pubsub";
import { useAddBlock } from "~/hooks/use-add-block";
import { getPreImportHTML } from "~/runtime/client";

const ImportHTML = ({
  parentId,
  position,
  fromSidebar,
}: {
  parentId?: string;
  position?: number;
  fromSidebar?: boolean;
}) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const { addPredefinedBlock } = useAddBlock();
  const [loading, setLoading] = useState(false);

  const importComponents = async () => {
    setLoading(true);
    const codeHtml = await getPreImportHTML(code);
    const blocks = getBlocksFromHTML(codeHtml);
    addPredefinedBlock([...blocks], parentId, position);
    setCode("");
    setLoading(false);
    pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
  };

  return (
    <Card className={`border-border/0 p-0 shadow-none ${fromSidebar ? "w-full" : "max-w-full"}`}>
      <CardHeader className={fromSidebar ? "p-0" : "p-3"}>
        <CardDescription className={fromSidebar ? "text-xs" : ""}>
          {t("Use HTML snippets from Tailwind CSS component libraries")}
        </CardDescription>
      </CardHeader>
      <CardContent className={`space-y-2 py-0 ${fromSidebar ? "p-0" : "px-3"}`}>
        <div className="space-y-1">
          <Label htmlFor="current" className="text-sm">
            {t("Tailwind HTML snippet")}
          </Label>
          <Textarea
            onChange={(evt) => setCode(evt.target.value)}
            rows={12}
            value={code}
            placeholder={t("Enter your code snippet here")}
            className="resize-none overflow-x-auto whitespace-pre bg-background font-mono text-xs font-normal"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col justify-end p-3">
        <Button disabled={code.trim() === "" || loading} onClick={() => importComponents()} size="sm" className="w-fit">
          {loading ? (
            <>
              <CircleIcon className="mr-2 h-4 w-4 animate-spin" /> {t("Importing...")}
            </>
          ) : (
            t("Import HTML")
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ImportHTML;
