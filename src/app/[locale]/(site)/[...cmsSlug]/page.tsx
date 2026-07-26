import { notFound } from "next/navigation";

import { servedOrganization } from "@/features/organizations/served-org";
import { getPage } from "@/features/cms/data";
import { CmsRenderer } from "@/features/cms/renderer";
import { ThemeInjector } from "@/features/cms/components/theme-injector";
import { withTenant } from "@/lib/db/tenant";

/**
 * An academy's public CMS page — THE SEAM, not the implementation (F4.5).
 *
 * Every path on a tenant host that the app router does not own reaches here.
 * The academy's home page (empty slug) does NOT arrive here: a catch-all segment
 * does not match the empty path, so `/` is handled in `[locale]/page.tsx`.
 */
export const dynamic = "force-dynamic";

export default async function CmsPage({
  params,
}: {
  params: Promise<{ cmsSlug: string[] }>;
}) {
  const org = await servedOrganization();
  if (!org) notFound();

  const { cmsSlug } = await params;
  const slug = cmsSlug.join("/");

  const page = await withTenant(org.id, async (tx) => {
    return getPage(tx, org.id, slug);
  });

  if (!page || page.status !== "published") notFound();

  return (
    <ThemeInjector organizationId={org.id}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <CmsRenderer blocks={page.blocks as unknown[]} />
      </main>
    </ThemeInjector>
  );
}
