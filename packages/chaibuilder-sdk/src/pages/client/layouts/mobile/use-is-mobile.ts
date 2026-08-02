import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 768;

export const isMobileWidth = (width: number): boolean => width < MOBILE_BREAKPOINT;

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === "undefined" ? false : isMobileWidth(window.innerWidth),
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileWidth(window.innerWidth));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};
