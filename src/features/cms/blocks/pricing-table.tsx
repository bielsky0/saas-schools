export { pricingTableBlock } from "./pricing-table-block";

type PlanItem = {
  name: string;
  price: string;
  currency?: string | null;
  features?: { item?: string | null }[] | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
};

type PricingTableProps = {
  title?: string | null;
  plans?: PlanItem[] | null;
};

export function PricingTable({ title, plans }: PricingTableProps) {
  if (!plans?.length) return null;

  return (
    <section className="px-4 py-16">
      {title && <h2 className="mb-12 text-center text-3xl font-bold">{title}</h2>}
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <div
            key={i}
            className="flex flex-col rounded-lg border p-6 shadow-sm"
          >
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <div className="mt-4">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.currency && (
                <span className="ml-1 text-sm text-muted-foreground">{plan.currency}</span>
              )}
            </div>
            {plan.features && plan.features.length > 0 && (
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✓</span>
                    {f.item}
                  </li>
                ))}
              </ul>
            )}
            {plan.ctaLabel && plan.ctaLink && (
              <a
                href={plan.ctaLink}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                {plan.ctaLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
