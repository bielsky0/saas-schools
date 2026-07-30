"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui"

export function ExtraFeeTabs({
  defaultValue,
  labels,
}: {
  defaultValue: string
  labels: Record<string, string>
}) {
  const router = useRouter()

  const onValueChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams()
      if (value !== "all") params.set("status", value)
      const qs = params.toString()
      router.push(qs ? `/dashboard/extra-fees?${qs}` : "/dashboard/extra-fees")
    },
    [router],
  )

  return (
    <Tabs defaultValue={defaultValue} onValueChange={onValueChange}>
      <TabsList>
        {Object.entries(labels).map(([value, label]) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
