"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { listOrgPages } from "../actions/list-org-pages"

type PageEntry = {
  id: string
  title: string
  slug: string
}

type PageSwitcherProps = {
  id?: number | string
}

export function PageSwitcher({ id }: PageSwitcherProps) {
  const router = useRouter()
  const [pages, setPages] = useState<PageEntry[]>([])
  const currentId = String(id ?? "")

  useEffect(() => {
    listOrgPages().then(setPages).catch(() => setPages([]))
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = e.target.value
      if (nextId && nextId !== currentId) {
        router.push(`/admin/collections/pages/${nextId}`)
      }
    },
    [currentId, router],
  )

  if (pages.length < 2) return null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <select
        value={currentId}
        onChange={handleChange}
        style={{
          background: "var(--theme-elevation-50)",
          border: "1px solid var(--theme-border-color)",
          borderRadius: "4px",
          color: "var(--theme-text)",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: 500,
          maxWidth: "280px",
          overflow: "hidden",
          padding: "0.375rem 1.75rem 0.375rem 0.625rem",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  )
}
