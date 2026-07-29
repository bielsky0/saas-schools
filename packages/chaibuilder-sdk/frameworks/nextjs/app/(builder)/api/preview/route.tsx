// route handler with secret and slug
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Validate secret from query parameters
  // Get parameters from query string
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Invalid request" }, { status: 404 });
  }

  // Enable Draft Mode by setting the cookie
  const disable = searchParams.get("disable");
  if (disable === "true") {
    (await draftMode()).disable();
  } else {
    (await draftMode()).enable();
  }

  // Redirect to the path from the fetched post
  // We don't redirect to searchParams slug as that might lead to open redirect vulnerabilities
  redirect(slug);
}
