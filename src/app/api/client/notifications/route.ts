import { NextResponse } from "next/server";

import { resolveClientSession } from "@/features/client-auth/session";
import { countClientUnread, listClientNotifications, markClientRead, markAllClientRead } from "@/features/notifications/data";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";

export async function GET(): Promise<NextResponse> {
  const org = await requireServedOrganization();
  const principal = await resolveClientSession(org.id);
  if (!principal || !principal.isVerified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { unreadCount, items } = await withTenant(org.id, async (tx) => ({
    unreadCount: await countClientUnread(tx, org.id, principal.clientId),
    items: await listClientNotifications(tx, org.id, principal.clientId),
  }));

  return NextResponse.json({ unreadCount, items });
}

export async function POST(request: Request): Promise<NextResponse> {
  const org = await requireServedOrganization();
  const principal = await resolveClientSession(org.id);
  if (!principal || !principal.isVerified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { action: string; id?: string };

  await withTenant(org.id, async (tx) => {
    if (body.action === "markRead" && body.id) {
      await markClientRead(tx, org.id, principal.clientId, body.id);
    } else if (body.action === "markAllRead") {
      await markAllClientRead(tx, org.id, principal.clientId);
    }
  });

  return NextResponse.json({ ok: true });
}
