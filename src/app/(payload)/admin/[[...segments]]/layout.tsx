import "@payloadcms/next/css"
import { RootLayout } from "@payloadcms/next/layouts"
import type { ServerFunctionClient } from "payload"
import config from "@/features/cms/payload-config"
import { importMap } from "../importMap"

const Layout = ({ children }: { children: React.ReactNode }) => {
  const serverFunction: ServerFunctionClient = async (args) => {
    "use server"
    const { handleServerFunctions } = await import("@payloadcms/next/layouts")
    return handleServerFunctions({
      config: config as any,
      importMap,
      name: args.name,
      args: args.args as Record<string, unknown>,
    })
  }

  return (
    <RootLayout
      config={config as any}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  )
}

export default Layout
