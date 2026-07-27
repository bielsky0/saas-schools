import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";

import { rateLimit } from "@/lib/adapters/rate-limit";
import { clientIp } from "@/lib/security/client-ip";
import { servedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { CONTACT_FORM_EMAIL_RULE, CONTACT_FORM_IP_RULE } from "@/features/cms/contact-form-rate-limit";

const submitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email").max(320),
  phone: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().max(5000).optional().default(""),
  _hp: z.string().max(0, "Spam detected").optional().default(""),
});

/**
 * Public endpoint for ContactForm block submissions.
 *
 * Rate-limited per-IP and per-email. Honeypot-protected.
 * Stores submission in DB for anti-spam forensic and retention.
 */
export async function POST(request: Request) {
  const org = await servedOrganization();
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const ip = clientIp(request.headers);

  const emailKey = `contactForm:email:${hash(`${org.id}:${parsed.data.email}`)}`;
  const ipKey = `contactForm:ip:${hash(ip ?? "unknown")}`;

  const [byEmail, byIp] = await Promise.all([
    rateLimit.consume(emailKey, CONTACT_FORM_EMAIL_RULE),
    rateLimit.consume(ipKey, CONTACT_FORM_IP_RULE),
  ]);

  if (!byEmail.allowed) {
    return NextResponse.json(
      { error: "Too many submissions from this email. Try again later." },
      { status: 429 },
    );
  }
  if (!byIp.allowed) {
    return NextResponse.json(
      { error: "Too many submissions from this IP. Try again later." },
      { status: 429 },
    );
  }

  const isHoneypot = parsed.data._hp !== "";

  await withTenant(org.id, async (tx) => {
    await tx.execute(
      sql`
        INSERT INTO contact_form_submission
          (organization_id, name, email, phone, message, honeypot_filled, ip_address)
        VALUES (
          ${org.id},
          ${parsed.data.name},
          ${parsed.data.email},
          ${parsed.data.phone || null},
          ${parsed.data.message || null},
          ${isHoneypot},
          ${ip}
        )
      `,
    );
  });

  if (isHoneypot) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
