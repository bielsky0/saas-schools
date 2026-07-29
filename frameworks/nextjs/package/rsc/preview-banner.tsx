export const PreviewBanner = ({ slug, show }: { slug: string; show: boolean }) => {
  return show ? (
    <div id="chai-preview-banner" className="sticky top-0 z-50 bg-orange-600" style={{ backgroundColor: "#f97316" }}>
      <div className="mx-auto w-full px-2 py-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white">You are viewing page in preview mode</p>

          <div className="ms-auto ps-3">
            <a
              href={`/api/preview?disable=true&slug=${slug}`}
              type="button"
              className="flex items-center rounded-lg bg-white/30 p-1 px-2 text-xs text-white focus:bg-white/10 focus:outline-none"
              data-hs-remove-element="#chai-preview-banner">
              <span>Exit Preview Mode</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};
