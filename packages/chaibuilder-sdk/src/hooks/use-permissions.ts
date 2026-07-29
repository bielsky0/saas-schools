import { useCallback } from "react";
import { useBuilderProp } from "~/hooks/use-builder-prop";

export const usePermissions = () => {
  const permissions = useBuilderProp("permissions", null) as string[] | null | undefined;
  const hasPermission = useCallback(
    (permission: string) => {
      if (!permissions) return true;
      return permissions.includes(permission);
    },
    [permissions],
  );

  return { hasPermission };
};
