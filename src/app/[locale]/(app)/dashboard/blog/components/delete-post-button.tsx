"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import { Button, ConfirmDialog } from "@/components/ui"
import { Trash2 } from "lucide-react"
import { deleteBlogPostAction } from "@/features/blog/api"

export function DeletePostButton({
  postId,
  postTitle,
}: {
  postId: string
  postTitle: string
}) {
  const t = useTranslations("blog")
  const formId = useId()

  return (
    <>
      <form id={formId} action={deleteBlogPostAction}>
        <input type="hidden" name="postId" value={postId} />
      </form>
      <ConfirmDialog
        title={t("deleteTitle")}
        description={t("deleteDescription", { title: postTitle })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        confirmForm={formId}
        trigger={
          <Button size="sm" variant="ghost" className="text-muted-foreground">
            <Trash2 className="size-4" />
            <span className="sr-only">{t("delete")}</span>
          </Button>
        }
      />
    </>
  )
}
