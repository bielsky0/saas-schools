"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronRight, Home } from "lucide-react"

import { Link } from "@/lib/i18n/navigation"
import { cn } from "@/lib/utils"

const segmentLabels: Record<string, string> = {
  "group-types": "breadcrumbs.groupTypes",
  schedule: "breadcrumbs.schedule",
  trainers: "breadcrumbs.trainers",
  earnings: "breadcrumbs.earnings",
  rates: "breadcrumbs.rates",
  clients: "breadcrumbs.clients",
  credits: "breadcrumbs.credits",
  purchases: "breadcrumbs.purchases",
  invoices: "breadcrumbs.invoices",
  "extra-fees": "breadcrumbs.extraFees",
  "qualification-cards": "breadcrumbs.qualificationCards",
  locations: "breadcrumbs.locations",
  policies: "breadcrumbs.policies",
  import: "breadcrumbs.import",
  sessions: "breadcrumbs.sessions",
  settings: "breadcrumbs.settings",
  audit: "breadcrumbs.audit",
  billing: "breadcrumbs.billing",
  members: "breadcrumbs.members",
  permissions: "breadcrumbs.permissions",
  files: "breadcrumbs.files",
  blog: "breadcrumbs.blog",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const t = useTranslations("sidebar")

  const segments = pathname.split("/").filter(Boolean)

  if (segments.length <= 1) return null

  const filteredSegments = segments.filter((s) => s !== "dashboard")
  if (filteredSegments.length === 0) return null

  const crumbs: { href: string; label: string }[] = []

  let current = ""
  for (const segment of filteredSegments) {
    current += "/" + segment
    const labelKey = segmentLabels[segment]
    crumbs.push({
      href: "/dashboard" + current,
      label: labelKey ? (t as (k: string) => string)(labelKey) : segment.replace(/-/g, " "),
    })
  }

  return (
    <nav aria-label="Breadcrumb" className="border-border mx-auto flex w-full max-w-5xl items-center gap-1.5 px-4 py-3 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="size-4" />
        <span className="sr-only">{t("breadcrumbs.dashboard")}</span>
      </Link>
      {crumbs.map((crumb, i) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
