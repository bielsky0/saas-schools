import { withTenant } from "@/lib/db/tenant";
import { getTheme } from "@/features/cms/data";

const DEFAULT_THEME = {
  fontPrimary: "system-ui",
  fontHeading: "Inter",
  colorPrimary: "#2563eb",
  colorSecondary: "#8b5cf6",
};

type Props = {
  organizationId: string;
  children: React.ReactNode;
};

export async function ThemeInjector({ organizationId, children }: Props) {
  const theme = await withTenant(organizationId, async (tx) =>
    getTheme(tx, organizationId),
  );

  const t = theme ?? DEFAULT_THEME;

  return (
    <>
      <style>{`
        :root {
          --color-primary: ${t.colorPrimary};
          --color-secondary: ${t.colorSecondary};
          --font-primary: ${t.fontPrimary};
          --font-heading: ${t.fontHeading};
        }
      `}</style>
      {children}
    </>
  );
}
