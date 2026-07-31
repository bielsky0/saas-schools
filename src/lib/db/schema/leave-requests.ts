import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "./organizations";
import { user } from "./auth";

export const leaveRequestStatus = [
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type LeaveRequestStatus = (typeof leaveRequestStatus)[number];

export const leaveRequest = pgTable(
  "leave_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    trainerId: text("trainerId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    startDate: text("startDate").notNull(),
    endDate: text("endDate").notNull(),
    reason: text("reason"),
    status: text("status")
      .$type<LeaveRequestStatus>()
      .notNull()
      .default("submitted"),
    substituteTrainerId: text("substituteTrainerId"),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("leave_request_org_idx").on(t.organizationId),
    index("leave_request_trainer_idx").on(t.trainerId),
    index("leave_request_status_idx").on(t.status),
    index("leave_request_dates_idx").on(t.startDate, t.endDate),
  ],
);
