import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ChaiBaseAction } from "~/actions/builder/base-action";

const GetChaiUserSchema = z.object({
  userId: z.string(),
});

type GetChaiUserInput = z.infer<typeof GetChaiUserSchema>;

export interface ChaiUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

/**
 * GET_CHAI_USER Action
 * Fetches user information from Supabase Auth
 */
export class GetChaiUserAction extends ChaiBaseAction<GetChaiUserInput> {
  constructor(private supabase: SupabaseClient) {
    super();
  }

  protected getValidationSchema() {
    return GetChaiUserSchema;
  }

  async execute(
    data: GetChaiUserInput,
  ): Promise<{ data: ChaiUser; status: number } | { error: string; status: number }> {
    try {
      const { userId } = data;

      // Fetch user from Supabase Auth Admin API
      const { data: userData, error } = await this.supabase.auth.admin.getUserById(userId);

      if (error) {
        // Return default unknown user on error
        return {
          data: {
            id: "unknown",
            email: "unknown@chaibuilder.com",
            name: "Unknown",
            avatar: "",
          },
          status: 200,
        };
      }

      // Return user data from Auth metadata
      return {
        data: {
          id: userData.user?.id || "unknown",
          email: userData.user?.email || "unknown@chaibuilder.com",
          name: userData.user?.user_metadata?.name || "Unknown",
          avatar: userData.user?.user_metadata?.avatar_url || "",
        },
        status: 200,
      };
    } catch {
      return {
        data: {
          id: "unknown",
          email: "unknown@chaibuilder.com",
          name: "Unknown",
          avatar: "",
        },
        status: 200,
      };
    }
  }
}
