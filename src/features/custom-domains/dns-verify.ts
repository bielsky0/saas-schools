import dns from "node:dns";

const DNS_TIMEOUT_MS = 5_000;

export async function getPlatformSubdomain(
  organizationId: string,
): Promise<string> {
  return organizationId.toLowerCase();
}

export interface DnsVerificationResult {
  success: boolean;
  error?: string;
}

export async function verifyCname(
  domain: string,
  organizationId: string,
): Promise<DnsVerificationResult> {
  const subdomain = await getPlatformSubdomain(organizationId);
  const expectedTarget = `${subdomain}.langlion.pl`;

  try {
    const records = await Promise.race([
      dns.promises.resolveCname(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), DNS_TIMEOUT_MS),
      ),
    ]);

    const matched = records.some(
      (r) => r.toLowerCase() === expectedTarget.toLowerCase(),
    );

    if (matched) {
      return { success: true };
    }

    return {
      success: false,
      error: `CNAME does not point to ${expectedTarget}. Found: ${records.join(", ") || "no CNAME record"}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown DNS error";
    return { success: false, error: message };
  }
}
