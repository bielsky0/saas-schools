import { RootPage } from "@payloadcms/next/views"
import config from "@/features/cms/payload-config"
import { importMap } from "../importMap"

const Page = ({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}) => {
  return (
    <RootPage
      config={config as any}
      importMap={importMap}
      params={params}
      searchParams={searchParams}
    />
  )
}

export default Page
