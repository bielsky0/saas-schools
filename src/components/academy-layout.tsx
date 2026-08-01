import type { ReactNode } from "react"

import { requireOrgAccess } from "@/features/organizations/context"
import { Sidebar } from "./sidebar"
import { Breadcrumbs } from "./breadcrumbs"

export default async function AcademyLayout({
  children,
}: {
  children: ReactNode
}) {
  const { org, effectivePermissions } = await requireOrgAccess()

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar orgName={org.name} permissions={[...effectivePermissions]} />
      <div className="flex flex-1 flex-col">
        <Breadcrumbs />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
