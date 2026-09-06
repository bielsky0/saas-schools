import { Card, CardContent } from "@/components/ui";

/**
 * Empty-state for admin sections whose management UI lands in a later faza
 * (apex-dashboard-plan 2.4). Rendering the route (and the nav tab) now keeps
 * super-admin navigation honest — clicking the tab must not 404.
 */
export function AdminSectionPlaceholder({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      <Card>
        <CardContent className="text-muted-foreground space-y-2 pt-6 text-sm">
          <p>
            This section is a placeholder — management UI lands with the next
            faza.
          </p>
          <p>
            Backing data lives at{" "}
            <code className="text-foreground">{path}</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}