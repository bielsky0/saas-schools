import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ChaiBaseAction } from "~/actions/builder/base-action";
import { ChaiAssets } from "~/express/assets/class-chai-assets";

const UpdateAssetSchema = z.object({
  id: z.string(),
  file: z.string().optional(),
  description: z.string().optional(),
});

type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

export class UpdateAssetAction extends ChaiBaseAction<UpdateAssetInput> {
  constructor(private supabase: SupabaseClient) {
    super();
  }
  protected getValidationSchema() {
    return UpdateAssetSchema;
  }

  async execute(data: UpdateAssetInput) {
    try {
      if (!this.context) {
        return { error: "Context not set", status: 400 };
      }

      const { appId, userId } = this.context;
      if (!userId) {
        return { error: "User ID is required", status: 401 };
      }

      const backend = new ChaiAssets(appId, userId, this.supabase);
      const response = await backend.updateAsset(data);

      if ("error" in response) {
        return { error: response.error, status: 400 };
      }

      return response;
    } catch (error) {
      console.error("UPDATE_ASSET error:", error);
      return { error: error instanceof Error ? error.message : "Unknown error", status: 500 };
    }
  }
}
