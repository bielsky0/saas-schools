import { BlurContainer } from "./chai-loader";

interface ScreenOverlayProps {
  hasDynamicPage: boolean;
}

export const ScreenOverlay = ({ hasDynamicPage }: ScreenOverlayProps) => {
  return (
    <BlurContainer>
      <div className="flex min-w-[300px] max-w-[400px] flex-col items-center justify-center rounded-lg border bg-white p-4 shadow-lg">
        <h1 className="text-lg font-medium">{!hasDynamicPage ? "No pages found" : "Select a page"}</h1>
        <p className="pt-2 text-center text-sm font-light text-gray-600">
          {!hasDynamicPage
            ? "Please add a new page"
            : "Please select a page from the list in the top header. This will enable you to edit the page."}
        </p>
      </div>
    </BlurContainer>
  );
};

export default ScreenOverlay;
