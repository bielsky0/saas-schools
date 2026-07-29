import { registerChaiFeatureFlags } from "~/runtime/client";

/**
 * Register demo feature flags for testing purposes
 */
export const registerDemoFeatureFlags = () => {
  registerChaiFeatureFlags({
    "enable-reset-styles": {
      description: "Enable reset styles",
    },
  });
};
