import type { NextConfig } from "next";

/**
 * ChaiBuilder Next.js configuration wrapper
 * Handles canvas binary files and other webpack configurations needed for ChaiBuilder
 */
export function withChaiBuilder(nextConfig: NextConfig = {}): NextConfig {
  return {
    ...nextConfig,
    webpack: (config, context) => {
      // Handle canvas module for image editor
      if (!context.isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          canvas: false,
        };
      }

      // Handle .node files
      config.module.rules.push({
        test: /\.node$/,
        use: "raw-loader",
      });

      // Call user's custom webpack config if provided
      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, context);
      }

      return config;
    },
  };
}
