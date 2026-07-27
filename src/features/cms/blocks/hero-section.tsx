import type React from "react";

export { heroSectionBlock } from "./hero-section-block";

type HeroSectionProps = {
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
  backgroundImage?: { url?: string } | string | null;
  layout?: string;
};

export function HeroSection({
  title,
  subtitle,
  ctaLabel,
  ctaLink,
  backgroundImage,
  layout,
}: HeroSectionProps) {
  const bgUrl =
    typeof backgroundImage === "object" && backgroundImage ? backgroundImage.url : null;
  const align =
    layout === "left"
      ? "items-start text-left"
      : layout === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <section className="relative flex min-h-[60vh] items-center justify-center px-4 py-24">
      {bgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bgUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          aria-hidden="true"
        />
      )}
      <div className={`relative z-10 flex max-w-3xl flex-col gap-6 ${align}`}>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="text-lg text-muted-foreground md:text-xl">{subtitle}</p>}
        {ctaLabel && ctaLink && (
          <a
            href={ctaLink}
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}
