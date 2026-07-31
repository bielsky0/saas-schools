import { z } from "zod";

export class PastDateError extends Error {
  constructor() { super("Leave cannot start in the past"); this.name = "PastDateError"; }
}

export class OverlappingLeaveError extends Error {
  constructor() { super("Trainer already has a leave request in this date range"); this.name = "OverlappingLeaveError"; }
}

export class LeaveRequestNotFoundError extends Error {
  constructor() { super("Leave request not found"); this.name = "LeaveRequestNotFoundError"; }
}

export class WrongStatusError extends Error {
  constructor(expected: string) { super(`Leave request must be ${expected}`); this.name = "WrongStatusError"; }
}

export class SubstituteSameAsTrainerError extends Error {
  constructor() { super("Substitute cannot be the same as the trainer on leave"); this.name = "SubstituteSameAsTrainerError"; }
}

export const submitLeaveSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().optional(),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: "Data końcowa musi być po dacie początkowej",
    path: ["endDate"],
  })
  .refine((d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.startDate >= today;
  }, {
    message: "Nie można złożyć urlopu w przeszłości",
    path: ["startDate"],
  });

export const approveLeaveSchema = z.object({
  requestId: z.string().min(1),
  substituteTrainerId: z.string().optional(),
});

export const rejectLeaveSchema = z.object({
  requestId: z.string().min(1),
  reason: z.string().min(1, "Podaj powód odrzucenia"),
});
