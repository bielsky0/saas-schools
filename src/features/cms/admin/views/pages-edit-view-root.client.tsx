"use client"

import Link from "next/link"
import { RenderTitle, useConfig, useDocumentInfo, usePayloadAPI } from "@payloadcms/ui"
import type { Data, DocumentViewServerProps } from "payload"

import { cn } from "@/lib/utils"

import { PagesEditView } from "./pages-edit-view.client"
import "../styles/tailwind.css"

/* ── Minimal versions list ── */

function VersionsListView() {
  const { id, apiURL } = useDocumentInfo()

  if (id == null || apiURL == null) {
    return <div className="p-6 text-muted-foreground">Loading versions...</div>
  }

  const baseUrl = apiURL.split("?")[0].replace(/\/\d+$/, "")
  const versionsUrl = `${baseUrl}/versions?where[parent][equals]=${id}&sort=-updatedAt&limit=20`

  const [{ data, isLoading }] = usePayloadAPI(versionsUrl)

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading versions...</div>
  }

  const versions: any[] = data?.docs ?? []

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Version History</h2>
      {versions.length === 0 ? (
        <p className="text-muted-foreground">No versions yet</p>
      ) : (
        <ul className="divide-y divide-border">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">{String(v.id).slice(0, 8)}</span>
                <span className="text-sm">
                  {new Date(v.updatedAt).toLocaleString("pl-PL")}
                </span>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  v.autosave
                    ? "bg-muted text-muted-foreground"
                    : v.version?._status === "draft"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800",
                )}
              >
                {v.autosave ? "Autosave" : v.version?._status === "draft" ? "Draft" : "Published"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Minimal API JSON view ── */

function ApiJsonView({ doc }: { doc: Data }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Document JSON</h2>
      <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[calc(100vh-300px)] font-mono">
        {JSON.stringify(doc, null, 2)}
      </pre>
    </div>
  )
}

/* ── Topbar ── */

const TAB_DEFS = [
  { key: "default", label: "Edit" },
  { key: "versions", label: "Versions" },
  { key: "api", label: "API" },
] as const

type TabKey = (typeof TAB_DEFS)[number]["key"]

/* ── Root view ── */

export function PagesEditViewRoot(props: DocumentViewServerProps) {
  const { documentSubViewType, ...rest } = props
  const { id: docId, collectionSlug, data, versionCount } = useDocumentInfo()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  const basePath = `${adminRoute}/collections/${collectionSlug}/${docId}`

  const activeTab = (documentSubViewType ?? "default") as TabKey

  return (
    <div className="pages-edit-view flex flex-col h-full">
      {/* ── Topbar ── */}
      <header className="flex flex-col gap-2 px-6 py-4 border-b border-border bg-background">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href={`${adminRoute}/collections/${collectionSlug}`}
            className="hover:text-foreground transition-colors"
          >
            Pages
          </Link>
          <span className="opacity-40 select-none">/</span>
          <span className="text-foreground font-medium truncate">
            {data?.title ?? docId ?? "[New]"}
          </span>
        </div>

        {/* Title */}
        <RenderTitle className="text-xl font-semibold -tracking-[0.01em]" element="h1" />

        {/* Tabs */}
        <nav className="flex gap-0 -mb-[13px] mt-2" role="tablist">
          {TAB_DEFS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "default" ? basePath : `${basePath}/${tab.key}`}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md border border-transparent transition-colors",
                activeTab === tab.key
                  ? "bg-background border-border border-b-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {tab.label}
              {tab.key === "versions" && versionCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-medium rounded-full bg-muted text-muted-foreground">
                  {versionCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0">
        {activeTab === "default" && <PagesEditView {...rest} />}
        {activeTab === "versions" && <VersionsListView />}
        {activeTab === "api" && <ApiJsonView doc={data} />}
      </div>
    </div>
  )
}
