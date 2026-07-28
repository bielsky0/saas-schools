"use client"

import React from "react"
import {
  DocumentControls,
  Form,
  LeaveWithoutSaving,
  LivePreviewWindow,
  SetDocumentStepNav,
  SetDocumentTitle,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormFields,
  useLivePreviewContext,
} from "@payloadcms/ui"
import { Input } from "@/features/cms/admin/components/ui/input"
import { Textarea } from "@/features/cms/admin/components/ui/textarea"
import { Label } from "@/features/cms/admin/components/ui/label"

import type { DocumentViewClientProps } from "payload"

import { BlocksField } from "@/features/cms/components/blocks-field.client"

import "../styles/admin-overrides.scss"
import "../styles/tailwind.css"

function MetaFields() {
  const { dispatchFields, setModified } = useForm()
  const formFields = useFormFields(([fields]) => fields)

  const updateField = (path: string, value: string) => {
    dispatchFields({ type: "UPDATE", path, value } as any)
    setModified(true)
  }

  const titleValue = formFields?.title?.value as string | undefined
  const slugValue = formFields?.slug?.value as string | undefined
  const seoValue = formFields?.seoDescription?.value as string | undefined

  return (
    <div className="p-4 border-b border-border/50 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={titleValue ?? ''}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slugValue ?? ''}
          onChange={(e) => updateField("slug", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="seoDescription">SEO Description</Label>
        <Textarea
          id="seoDescription"
          value={seoValue ?? ''}
          onChange={(e) => updateField("seoDescription", e.target.value)}
        />
      </div>
    </div>
  )
}

export function PagesEditView(props: DocumentViewClientProps) {
  const { formState } = props

  const docPermissions = (props as any).docPermissions

  /* ── Document context ── */
  const docInfo = useDocumentInfo()
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
  } = docInfo
  const locale = (docInfo as any).locale as string | undefined
  const permissions = (docInfo as any).permissions
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
  const blocksField = collectionConfig?.fields?.find(
    (f: any) => f.name === "blocks",
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
      <SetDocumentTitle fallback={useAsTitle ?? "[Untitled]"} />

      <DocumentControls
          apiURL={apiURL ?? ""}
          slug={collectionSlug ?? ""}
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
            <MetaFields />

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
