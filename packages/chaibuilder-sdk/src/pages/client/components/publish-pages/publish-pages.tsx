import { lazy, Suspense } from "react";
import { Dialog } from "~/components/ui/dialog";
import { usePublishPages } from "~/pages/hooks/pages/mutations";
const PublishPagesModalContent = lazy(() => import("./publish-pages-content"));

export default function PublishPages({
  showModal = false,
  onClose = () => console.log("Cancelled"),
}: {
  showModal: boolean;
  onClose: () => void;
}) {
  const { mutate: publishPage, isPending } = usePublishPages();
  return (
    <Dialog open={showModal} onOpenChange={isPending ? () => {} : onClose}>
      {showModal && (
        <Suspense fallback={<div className="h-96 w-96 animate-pulse bg-gray-100" />}>
          <PublishPagesModalContent onClose={onClose} isPending={isPending} publishPage={publishPage} />
        </Suspense>
      )}
    </Dialog>
  );
}
