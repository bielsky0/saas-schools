import {
  REST_GET,
  REST_POST,
  REST_PATCH,
  REST_PUT,
  REST_DELETE,
  REST_OPTIONS,
} from "@payloadcms/next/routes"
import config from "@/features/cms/payload-config"

export const GET = REST_GET(config as any)
export const POST = REST_POST(config as any)
export const PATCH = REST_PATCH(config as any)
export const PUT = REST_PUT(config as any)
export const DELETE = REST_DELETE(config as any)
export const OPTIONS = REST_OPTIONS(config as any)
