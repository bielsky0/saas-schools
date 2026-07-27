import { DefaultNav } from "@payloadcms/next/rsc"
import type { ServerProps } from "payload"

export function AdminNav(props: ServerProps) {
  return (
    <div>
      <DefaultNav {...props} />
    </div>
  )
}
