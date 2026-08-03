import { Monitor, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { useCanvasDisplayWidth } from "~/hooks/use-screen-size-width";

const MOBILE_WIDTH = 375;
const DESKTOP_WIDTH = 1440;

/**
 * Toggles the canvas between desktop and mobile preview widths (Shopify-like device switch).
 */
export const DevicePreview = () => {
  const { t } = useTranslation();
  const [displayWidth, setDisplayWidth] = useCanvasDisplayWidth();
  const isMobile = displayWidth <= 480;

  const toggle = () => {
    setDisplayWidth(isMobile ? DESKTOP_WIDTH : MOBILE_WIDTH);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-md"
      title={isMobile ? t("Desktop preview") : t("Mobile preview")}
      aria-label={isMobile ? t("Desktop preview") : t("Mobile preview")}
      onClick={toggle}>
      {isMobile ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
    </Button>
  );
};

export default DevicePreview;
