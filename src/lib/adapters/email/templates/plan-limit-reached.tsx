import { EmailLayout as Layout } from "./layout";

import type { EmailTranslator } from "./layout";

export function PlanLimitReached({
  orgName,
  limitKey,
  limitLabel,
  usage,
  limit,
  upgradeUrl,
}: {
  orgName: string;
  limitKey: string;
  limitLabel: string;
  usage: number;
  limit: number;
  upgradeUrl: string;
}) {
  return (
    <Layout>
      <p>Szanowny Administrator,</p>
      <p>
        Akademia <strong>{orgName}</strong> osiągnęła limit planu: <strong>{limitLabel}</strong>.
      </p>
      <table cellPadding="0" cellSpacing="0" style={{ width: "100%", margin: "16px 0" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0" }}>Limit:</td>
            <td style={{ padding: "8px 0", textAlign: "right", fontWeight: "bold" }}>{limit}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0" }}>Zużycie:</td>
            <td style={{ padding: "8px 0", textAlign: "right", fontWeight: "bold" }}>{usage}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ color: "#dc2626", fontWeight: "bold" }}>
        Limit został osiągnięty (100%). Nowe operacje tworzących ten zasób zostały ZABLOKOWANE.
      </p>
      <p>Gdy limit nie zostanie podniesiony, nie będzie można dodawać nowych zasobów tego typu.</p>
      <p style={{ margin: "24px 0" }}>
        <a href={upgradeUrl} style={{ background: "#dc2626", color: "white", padding: "12px 24px", borderRadius: "6px", textDecoration: "none", display: "inline-block" }}>
          Podnieś limit w panelu płatności
        </a>
      </p>
      <p style={{ fontSize: "12px", color: "#6b7280" }}>
        To jest wiadomość automatyczna — proszę nie odpowiadać na ten e-mail.
      </p>
    </Layout>
  );
}

export function planLimitReachedSubject(
  props: { limitLabel: string },
  _t: EmailTranslator,
): string {
  return `🚫 Limit planu osiągnięty: ${props.limitLabel} — operacje zablokowane`;
}