import { NextResponse } from "next/server";

import { findActiveDomain, dummyLookup } from "@/features/custom-domains/data";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain")?.toLowerCase().trim();

  if (!domain) {
    return NextResponse.json({ allowed: false }, { status: 400 });
  }

  const found = await findActiveDomain(domain);

  if (found) {
    return NextResponse.json({ allowed: true }, { status: 200 });
  }

  await dummyLookup();

  return NextResponse.json({ allowed: false }, { status: 404 });
}
