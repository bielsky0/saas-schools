import { mergeClasses } from "~/core/main";

export const BlurContainer = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <div
      className={mergeClasses(
        "fixed bottom-0 left-0 right-0 top-[50px] z-[20] flex w-screen flex-col items-center justify-center bg-black/40 transition-all",
        className,
      )}>
      {children}
    </div>
  );
};
