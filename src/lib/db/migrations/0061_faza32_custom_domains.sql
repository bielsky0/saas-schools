--> HAND-WRITTEN (Faza 32 — Custom Domains: tabela).
-->
--> Tabela przechowująca domeny własne przypisane do organizacji.
--> Każda akademia może mieć maksymalnie jedną domenę własną (MVP) — UNIQUE(organization_id).
--> Domeny są unikalne globalnie — UNIQUE(domain).
--> status: 'pending' | 'active' | 'failed'
--> verification_token: losowy token do weryfikacji DNS (CNAME).
--> verified_at: timestamp udanej weryfikacji DNS.
--> last_checked_at: przygotowane pod przyszły job re-weryfikujący.
--> last_error: komunikat błędu z ostatniej nieudanej weryfikacji.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS custom_domain (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain),
  UNIQUE(organization_id)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS custom_domain_org_idx ON custom_domain(organization_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS custom_domain_status_idx ON custom_domain(status);
