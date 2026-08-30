import { atom, useAtom } from "jotai";

/**
 * Enrollment group preview data (mvp-plan F2) shared between the template
 * editor right panel (group-type dropdown) and the dedicated enrollment blocks
 * rendered on the canvas. Set to `null` outside enrollment templates or when no
 * group type is selected — enrollment blocks then render placeholders.
 *
 * Mirrors `use-blog-preview.ts`. Field set mirrors `EnrollmentPreview` from
 * `src/lib/enrollment-data.ts` (app), which is the server-side source of truth;
 * time fields are ISO strings because block `data` travels over the
 * server→client serialization boundary.
 */

export type EnrollmentPreviewGroupType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  status: "scheduled" | "collecting_interest";
  engine: "schedule_first" | "availability_first" | "slot_first";
  paymentPolicy: "online" | "on_site" | "both";
  allowedPurchaseModes: string[];
  allowedBillingTypes: string[] | null;
  isNewClientOnly: boolean;
  requiresQualificationCard: boolean;
  defaultDurationMinutes: number | null;
};

export type EnrollmentPreviewPackage = {
  id: string;
  name: string;
  price: number;
  creditQuantity: number;
  billingType: "one_time" | "recurring";
};

export type EnrollmentPreviewSession = {
  id: string;
  /** ISO string — the public renderer serializes the server Date. */
  startTime: string;
  /** ISO string — see `startTime`. */
  endTime: string;
  capacity: number;
  status: string;
  groupTypeId: string;
  groupTypeName: string;
  trainerName: string | null;
  trainerEmail: string | null;
  locationId: string | null;
  locationName: string | null;
};

export type EnrollmentPreviewTrainer = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
};

export type EnrollmentPreviewPolicy = {
  id: string;
  name: string;
  version: number;
};

export type EnrollmentPreviewConsent = {
  id: string;
  name: string;
  version: number;
};

export type EnrollmentPreview = {
  groupType: EnrollmentPreviewGroupType | null;
  packages: EnrollmentPreviewPackage[];
  availability: EnrollmentPreviewSession[];
  trainers: EnrollmentPreviewTrainer[];
  policy: EnrollmentPreviewPolicy | null;
  consents: EnrollmentPreviewConsent[];
};

export const enrollmentPreviewAtom = atom<EnrollmentPreview | null>(null);
enrollmentPreviewAtom.debugLabel = "enrollmentPreviewAtom";

export const useEnrollmentPreview = () => {
  const [preview, setPreview] = useAtom(enrollmentPreviewAtom);
  return { preview, setPreview };
};