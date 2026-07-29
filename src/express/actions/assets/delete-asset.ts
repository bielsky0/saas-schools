import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ChaiBaseAction } from "~/actions/builder/base-action";
import { ChaiAssets } from "~/express/assets/class-chai-assets";

const DeleteAssetSchema = z.object({
  id: z.string(),
});

type DeleteAssetInput = z.infer<typeof DeleteAssetSchema>;

export class DeleteAssetAction extends ChaiBaseAction<DeleteAssetInput> {
  constructor(private supabase: SupabaseClient) {
    super();
  }
  protected getValidationSchema() {
    return DeleteAssetSchema;
  }

  async execute(data: DeleteAssetInput) {
    try {
      if (!this.context) {
        return { error: "Context not set", status: 400 };
      }

      const { appId, userId } = this.context;
      if (!userId) {
        return { error: "User ID is required", status: 401 };
      }

      const backend = new ChaiAssets(appId, userId, this.supabase);
      const response = await backend.deleteAsset(data);

      if ("error" in response) {
        return { error: response.error, status: 400 };
      }

      return response;
    } catch (error) {
      console.error("DELETE_ASSET error:", error);
      return { error: error instanceof Error ? error.message : "Unknown error", status: 500 };
    }
  }
}
