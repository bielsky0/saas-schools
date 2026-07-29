import { z } from "zod";
import { ActionError } from "./action-error";
import { ChaiAction, ChaiActionContext } from "./chai-action-interface";

/**
 * Base Action Class
 * Provides common functionality for all action handlers
 */
export abstract class ChaiBaseAction<T = any, K = any> implements ChaiAction<T, K> {
  protected context: ChaiActionContext | null = null;
  /**
   * Abstract method to get the validation schema for the action data
   * Each action must implement this to define its own validation rules
   */
  protected abstract getValidationSchema(): z.ZodType<T>;

  /**
   * Validate the action data using the schema provided by getValidationSchema
   * @param data The data to validate
   * @returns true if the data is valid, false otherwise
   */
  validate(data: T): boolean {
    if (!data) return true;
    try {
      const schema = this.getValidationSchema();
      schema.parse(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get validation errors for the action data
   * This can be useful for debugging or providing more detailed error messages
   * @param data The data to validate
   * @returns An array of validation errors or null if the data is valid
   */
  getValidationErrors(data: T): string | null {
    if (!data) return null;
    try {
      const schema = this.getValidationSchema();
      schema.parse(data);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((err: any) => `${err.path.join(".")}: ${err.message}`).join(", ");
        return errorMessages;
      }
      return null;
    }
  }

  /**
   * Set the action context
   * @param context The context to set
   */
  setContext(context: ChaiActionContext): void {
    this.context = context;
  }

  /**
   * Abstract method to execute the action
   * Each action must implement this to define its own business logic
   */
  abstract execute(data: T): Promise<any>;

  /**
   * Verify if the user has access to the app.
   * Delegates to the CHECK_USER_ACCESS action from the registry so that
   * callers can override the default access-check by registering a custom action.
   * Uses a dynamic import to avoid a circular module dependency at init time.
   * @throws ActionError if the user does not have access
   */
  protected async verifyAccess(): Promise<void> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET", 500);
    }
    const { getChaiAction } = await import("./actions-registery");
    const checkUserAccessAction = getChaiAction("CHECK_USER_ACCESS");
    if (!checkUserAccessAction) {
      throw new ActionError("CHECK_USER_ACCESS action not registered", "ACCESS_CHECK_NOT_FOUND", 500);
    }
    checkUserAccessAction.setContext(this.context);
    await checkUserAccessAction.execute({});
  }

  /**
   * Helper method to handle common errors in actions
   * @param error The error to handle
   * @throws ActionError with appropriate message and code
   */
  protected handleError(error: unknown): never {
    if (error instanceof ActionError) {
      // Re-throw ActionError as is
      throw error;
    } else if (error instanceof z.ZodError) {
      // Convert Zod validation errors to ActionError
      const errorMessage = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new ActionError(`Validation failed: ${errorMessage}`, "VALIDATION_ERROR");
    } else {
      // Convert other errors to ActionError
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new ActionError(message, "ACTION_ERROR");
    }
  }
}
