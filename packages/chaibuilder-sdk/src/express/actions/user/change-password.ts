import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ActionError } from "~/actions/builder/action-error";
import { ChaiBaseAction } from "~/actions/builder/base-action";

const ChangePasswordSchema = z
  .object({
    email: z.string().email(),
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Confirm password does not match",
    path: ["confirmPassword"],
  });

type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/**
 * CHANGE_PASSWORD Action
 * Changes user password using Supabase Auth
 */
export class ChangePasswordAction extends ChaiBaseAction<ChangePasswordInput> {
  constructor(private supabase: SupabaseClient) {
    super();
  }

  protected getValidationSchema() {
    return ChangePasswordSchema;
  }

  async execute(
    data: ChangePasswordInput,
  ): Promise<{ data: { message: string }; status: number } | { error: string; status: number }> {
    try {
      const { email, oldPassword, newPassword } = data;

      // First, verify the old password by attempting to sign in
      const { error: signInError } = await this.supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });

      if (signInError) {
        throw new ActionError("Current password is incorrect", "INVALID_PASSWORD", 400);
      }

      // Update the password
      const { error: updateError } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new ActionError(updateError.message || "Failed to update password", "UPDATE_FAILED", 400);
      }

      return {
        data: { message: "Password changed successfully" },
        status: 200,
      };
    } catch (err) {
      throw err;
    }
  }
}
