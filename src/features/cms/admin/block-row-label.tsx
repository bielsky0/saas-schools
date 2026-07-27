"use client"

import { useTranslation } from "@payloadcms/ui"

type BlockRowLabelProps = {
  data: Record<string, unknown>
}

/**
 * Custom RowLabel for Payload blocks array (Faza 30e).
 *
 * Shows the block's `title` field if present, otherwise falls back to the
 * block type translated via `useTranslation`. Uses Payload's i18n so labels
 * work in PL when the admin UI is set to Polish.
 */
export function BlockRowLabel({ data }: BlockRowLabelProps) {
  const { t } = useTranslation()
  const title = data?.title as string | undefined
  const blockType = data?.blockType as string | undefined

  if (title) {
    return <span>{title}</span>
  }

  if (blockType) {
    const label = t(`blocks:${blockType}`)
    return <span>{label || blockType}</span>
  }

  return <span>{t("general:block")}</span>
}
