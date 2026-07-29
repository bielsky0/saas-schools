#!/usr/bin/env node
const { exec } = require("child_process");
const path = require("path");

/**
 * Configurable Tailwind CSS generator for Chai Builder projects
 * Can be used with custom paths or default paths
 *
 * Command line usage:
 * node chai-tailwind.cjs [options]
 *
 * Options:
 * --config, -c <path>    Path to Tailwind config file (default: ./tailwind.config.ts)
 * --input, -i <path>     Path to input CSS file (default: ./app/(public)/public.css)
 * --output, -o <path>    Path to output CSS file (default: ./public/chaistyles.css)
 * --watch, -w            Enable watch mode
 * --help, -h             Show this help message
 */
const generateTailwindCss = async (options = {}) => {
  const chalk = (await import("chalk")).default;

  // Default configuration - can be overridden
  const config = {
    tailwindConfigPath: "./tailwind.config.ts",
    inputCssPath: "./app/(public)/public.css",
    outputCssPath: "./public/chaistyles.css",
    watchMode: false,
    ...options,
  };

  const mode = config.watchMode ? "watch" : "build";
  console.log(`Tailwind CSS ${mode} mode...`);

  const watchFlag = config.watchMode ? "--watch" : "";
  const minifyFlag = config.watchMode ? "" : "--minify";

  const command =
    `npx tailwindcss -c ${config.tailwindConfigPath} -i "${config.inputCssPath}" -o "${config.outputCssPath}" ${watchFlag} ${minifyFlag}`
      .trim()
      .replace(/\s+/g, " ");

  console.log(`Running: ${command}`);

  const process = exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(chalk.red("Error generating Tailwind CSS:"), chalk.red(stderr));
      return;
    }

    if (!config.watchMode) {
      console.log(stdout);
      console.log("CSS generation complete!");
    }
  });

  if (config.watchMode) {
    process.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
      console.error(chalk.red(data.toString()));
    });

    console.log(chalk.green("Watching for CSS changes... Press Ctrl+C to stop."));
  }
};

/**
 * Display help information
 */
const showHelp = () => {
  console.log(`
Chai Tailwind CSS Generator

Usage: node chai-tailwind.cjs [options]

Options:
  --config, -c <path>    Path to Tailwind config file (default: ./tailwind.config.ts)
  --input, -i <path>     Path to input CSS file (default: ./app/(public)/public.css)
  --output, -o <path>    Path to output CSS file (default: ./public/chaistyles.css)
  --watch, -w            Enable watch mode
  --help, -h             Show this help message

Examples:
  node chai-tailwind.cjs
  node chai-tailwind.cjs --watch
  node chai-tailwind.cjs --config ./custom.config.js --input ./src/styles.css
  node chai-tailwind.cjs -c ./tailwind.config.js -i ./input.css -o ./output.css --watch
`);
};

// When run directly from command line
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  const watchMode = args.includes("--watch") || args.includes("-w");

  // Support legacy --dev flag for backward compatibility
  const legacyDevMode = args.includes("--dev") || args.includes("-d");

  // Parse config and input paths from arguments
  const configIndex = args.findIndex((arg) => arg === "--config" || arg === "-c");
  const inputIndex = args.findIndex((arg) => arg === "--input" || arg === "-i");
  const outputIndex = args.findIndex((arg) => arg === "--output" || arg === "-o");

  const options = {
    watchMode: watchMode || legacyDevMode,
  };

  // Set custom paths if provided
  if (configIndex !== -1 && args[configIndex + 1]) {
    options.tailwindConfigPath = args[configIndex + 1];
  }

  if (inputIndex !== -1 && args[inputIndex + 1]) {
    options.inputCssPath = args[inputIndex + 1];
  }

  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputCssPath = args[outputIndex + 1];
  }

  if (legacyDevMode) {
    console.log("⚠️  --dev flag is deprecated. Use --watch instead.");
  }

  generateTailwindCss(options);
}

// Export for programmatic use
module.exports = { generateTailwindCss };
