import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/**
 * Loading fallback for a dashboard card (Faza 07 — each card loads inside its
 * own Suspense boundary with a skeleton instead of a blank screen).
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
