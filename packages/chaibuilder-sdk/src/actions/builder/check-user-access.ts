import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";
import { getUserAccess } from "./get-user-access";

type CheckUserAccessResponse = {
  access: boolean;
  role: string;
  permissions: string[] | null;
};

export class CheckUserAccessAction extends ChaiBaseAction<any, CheckUserAccessResponse> {
  protected getValidationSchema() {
    return z.any();
  }

  async execute(): Promise<CheckUserAccessResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET", 500);
    }
    const user = await getUserAccess(this.context);
    return {
      access: true,
      role: user.role || "user",
      permissions: (user.permissions as string[]) || null,
    };
  }
}
