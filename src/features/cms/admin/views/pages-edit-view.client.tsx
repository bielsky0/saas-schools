"use client"

import React from "react"
import {
  DocumentControls,
  Form,
  LeaveWithoutSaving,
  LivePreviewWindow,
  RenderFields,
  SetDocumentStepNav,
  SetDocumentTitle,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useLivePreviewContext,
} from "@payloadcms/ui"

import { Button } from "@/features/cms/admin/components/ui/button"
import { Input } from "@/features/cms/admin/components/ui/input"


import type { DocumentViewClientProps } from "payload"

import { BlocksField } from "@/features/cms/components/blocks-field.client"

import "../styles/admin-overrides.scss"
import "../styles/tailwind.css"

function filterMetaFields(fields: Array<{ name: string }> | undefined) {
  return (fields ?? []).filter((f) => ["title", "slug"].includes(f.name))
}

export function PagesEditView(props: DocumentViewClientProps) {
  const { formState } = props

  const docPermissions = (props as any).docPermissions

  /* ── Document context ── */
  const {
    apiURL,
    collectionSlug,
    data,
    hasPublishPermission,
    hasSavePermission,
    id,
    isEditing,
    isInitializing,
    isTrashed,
    locale,
    permissions,
  } = useDocumentInfo()
  const {
    config: {
      routes: { admin: adminRoute },
    },
    getEntityConfig,
  } = useConfig()
  const { isLivePreviewEnabled, isLivePreviewing, url: livePreviewURL } = useLivePreviewContext()
  const depth = useEditDepth()

  /* ── Collection field configs ── */
  const collectionConfig = getEntityConfig({ collectionSlug })
  const metaFields = filterMetaFields(collectionConfig?.fields as Array<{ name: string }> | undefined)
  const blocksField = collectionConfig?.fields?.find(
    (f) => f.name === "blocks",
  ) as any

  const useAsTitle = (collectionConfig as any)?.admin?.useAsTitle as string | undefined
  const pluralLabel = (collectionConfig as any)?.labels?.plural as string | undefined

  /* ── Form action URL ── */
  const action = collectionSlug
    ? `${adminRoute}/collections/${collectionSlug}${id ? `/${id}` : ""}?locale=${locale ?? "en"}&depth=${depth ?? 0}`
    : ""

  return (
    <Form
      action={action}
      className="collection-edit__form"
      initialState={formState}
      isDocumentForm
      isInitializing={isInitializing}
      method={id ? "PATCH" : "POST"}
    >
      <LeaveWithoutSaving />
      <SetDocumentStepNav
        collectionSlug={collectionSlug ?? undefined}
        id={id}
        pluralLabel={pluralLabel}
        useAsTitle={useAsTitle}
      />
      <SetDocumentTitle />

      <DocumentControls
          apiURL={apiURL ?? ""}
          BeforeDocumentControls={props.BeforeDocumentControls}
          customComponents={{
            PreviewButton: props.PreviewButton,
            PublishButton: props.PublishButton,
            SaveButton: props.SaveButton,
            SaveDraftButton: props.SaveDraftButton,
            Status: props.Status,
            UnpublishButton: props.UnpublishButton,
          }}
          data={data}
          EditMenuItems={props.EditMenuItems}
          hasPublishPermission={hasPublishPermission}
          hasSavePermission={hasSavePermission}
          id={id}
          isEditing={isEditing}
          isTrashed={isTrashed}
          permissions={permissions as any}
        />

        <div className="flex flex-1 min-h-0">
          <aside className="w-96 min-w-80 shrink-0 overflow-y-auto border-r border-border flex flex-col">
            {metaFields && metaFields.length > 0 && (
              <div className="p-4 border-b border-border/50">
                <RenderFields
                  fields={metaFields as any}
                  parentIndexPath=""
                  parentPath=""
                  parentSchemaPath={collectionSlug ?? ""}
                  permissions={docPermissions?.fields}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3">
              {blocksField && (
                <BlocksField
                  field={blocksField}
                  path="blocks"
                  permissions={docPermissions?.fields?.blocks}
                  readOnly={false}
                />
              )}
            </div>
          </aside>

          {isLivePreviewEnabled && isLivePreviewing && livePreviewURL && (
            <main className="flex-1 flex flex-col min-w-0 bg-background">
              {(props.LivePreview as React.ReactNode) ?? <LivePreviewWindow />}
            </main>
          )}
        </div>
      </Form>
    )
}
