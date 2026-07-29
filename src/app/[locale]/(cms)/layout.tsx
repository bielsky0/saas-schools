import type { ReactNode } from "react";

import "@chaibuilder/sdk/styles";
import "../../(public)/public-output.css";

export default function CmsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
