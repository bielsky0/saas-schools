import { DefaultNav } from "@payloadcms/next/rsc"
import type { ServerProps } from "payload"

export function AdminNav(props: ServerProps) {
  const { viewType, documentSubViewType, params } = props
  const segments = params?.segments as string[] | undefined

  const isPagesDocumentEdit =
    viewType === "document" &&
    documentSubViewType === "default" &&
    segments?.[0] === "collections" &&
    segments?.[1] === "pages"

  // if (isPagesDocumentEdit) return <></>

  return (
    <div>
      {/* <DefaultNav {...props} /> */}s
    </div>
  )
}
