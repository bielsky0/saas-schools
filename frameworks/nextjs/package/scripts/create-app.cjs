#!/usr/bin/env node

const prompts = require("prompts");
const postgres = require("postgres");
const dotenv = require("dotenv");
const { LANGUAGES } = require("@chaibuilder/sdk/actions");
dotenv.config();

/**
 * ChaiBuilder Create App CLI
 */
const defaultTheme = {
  fontFamily: {
    heading: "Arial",
    body: "Arial",
  },
  borderRadius: "6px",
  colors: {
    background: ["#FFFFFF", "#09090B"],
    foreground: ["#09090B", "#FFFFFF"],
    primary: ["#2563EB", "#3B82F6"],
    "primary-foreground": ["#FFFFFF", "#FFFFFF"],
    secondary: ["#F4F4F5", "#27272A"],
    "secondary-foreground": ["#09090B", "#FFFFFF"],
    muted: ["#F4F4F5", "#27272A"],
    "muted-foreground": ["#71717A", "#A1A1AA"],
    accent: ["#F4F4F5", "#27272A"],
    "accent-foreground": ["#09090B", "#FFFFFF"],
    destructive: ["#EF4444", "#7F1D1D"],
    "destructive-foreground": ["#FFFFFF", "#FFFFFF"],
    border: ["#E4E4E7", "#27272A"],
    input: ["#E4E4E7", "#27272A"],
    ring: ["#2563EB", "#3B82F6"],
    card: ["#FFFFFF", "#09090B"],
    "card-foreground": ["#09090B", "#FFFFFF"],
    popover: ["#FFFFFF", "#09090B"],
    "popover-foreground": ["#09090B", "#FFFFFF"],
  },
};

const EXIT_CODES = {
  SUCCESS: 0,
  CONFIG_ERROR: 1,
  VALIDATION_ERROR: 2,
  DATABASE_ERROR: 3,
};

const QUESTIONS = [
  {
    name: "projectName",
    type: "text",
    message: "Enter the project name:",
    validate: (value) => (value && value.trim().length > 0 ? true : "Project name is required"),
  },
  {
    name: "user",
    type: "text",
    message: "Enter the user ID:",
    validate: (value) => (value && value.trim().length > 0 ? true : "User ID is required"),
  },
  {
    name: "fallbackLang",
    type: "text",
    message: "Enter the fallback language code (Optional, defaults to 'en'):",
  },
];

async function promptForMissingValues() {
  const responses = await prompts(QUESTIONS, {
    onCancel: () => {
      console.log("⚠️ Operation cancelled.");
      process.exit(EXIT_CODES.SUCCESS);
    },
  });

  return {
    user: responses.user?.trim(),
    projectName: responses.projectName?.trim() || null,
    fallbackLang: responses.fallbackLang?.trim() || null,
  };
}

async function createApp({ user, projectName, fallbackLang, databaseUrl }, dependencies = {}) {
  const { postgresLib = postgres } = dependencies;

  if (!projectName) {
    console.error("Project name is required.");
    process.exit(EXIT_CODES.VALIDATION_ERROR);
  }

  if (!user) {
    console.error("User ID is required.");
    process.exit(EXIT_CODES.VALIDATION_ERROR);
  }

  // Validate and set fallback language
  let validatedFallbackLang = "en";
  if (fallbackLang && fallbackLang.length > 0) {
    if (LANGUAGES[fallbackLang]) {
      validatedFallbackLang = fallbackLang;
      console.log(`Using fallback language: ${LANGUAGES[fallbackLang]} (${fallbackLang})`);
    } else {
      console.error(`\n❌ Error: Language code '${fallbackLang}' is not supported.\n`);
      console.log("Supported languages:");
      console.log("-------------------");

      const sortedLanguages = Object.entries(LANGUAGES).sort((a, b) => a[1].localeCompare(b[1]));
      sortedLanguages.forEach(([code, name]) => {
        console.log(`  ${code.padEnd(10)} - ${name}`);
      });

      console.log("\nPlease use one of the language codes listed above.");
      process.exit(EXIT_CODES.VALIDATION_ERROR);
    }
  }

  const sql = postgresLib(databaseUrl, { max: 1 });
  const libraryName = projectName;
  const normalizedUser = user;

  try {
    const result = await sql.begin(async (tx) => {
      const [app] = await tx`
        insert into apps (name, "user", theme, "fallbackLang")
        values (${projectName}, ${normalizedUser}, ${sql.json(defaultTheme)}, ${validatedFallbackLang})
        returning id
      `;

      const appId = app.id;

      await tx`
        insert into apps_online (id, name, "user", "apiKey")
        values (${appId}, ${projectName}, ${normalizedUser}, ${appId})
      `;

      const [library] = await tx`
        insert into libraries (name, app, type)
        values (${libraryName}, ${appId}, 'default')
        returning id
      `;

      // Always insert into app_users since user is mandatory now
      await tx`
        insert into app_users ("user", app, role)
        values (${normalizedUser}, ${appId}, 'admin')
      `;

      const [page] = await tx`
        insert into app_pages (app, slug, name, "pageType")
        values (${appId}, '/', 'Home', 'page')
        returning id
      `;

      return {
        appId,
        libraryId: library.id,
        pageId: page.id,
        appKey: appId,
      };
    });

    console.log("\n✅  App created successfully!");
    console.log(`\nCHAIBUILDER_APP_KEY=${result.appKey}`);
    console.log("\nPlease add the CHAIBUILDER_APP_KEY value to your .env file.");
    process.exit(EXIT_CODES.SUCCESS);
  } catch (error) {
    console.error("Failed to create app:");
    if (error.code) {
      console.error(`Database Error (${error.code}): ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(EXIT_CODES.DATABASE_ERROR);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => null);
  }
}

async function runCli() {
  console.log("\nChaiBuilder Create App\n---------------------------");
  const databaseUrl = process.env.CHAIBUILDER_DATABASE_URL;
  if (!databaseUrl) {
    console.error("Missing database connection string. Please set the CHAIBUILDER_DATABASE_URL environment variable");
    process.exit(EXIT_CODES.CONFIG_ERROR);
  }
  const { user, projectName, fallbackLang } = await promptForMissingValues();

  await createApp({ user, projectName, fallbackLang, databaseUrl });
}

if (require.main === module) {
  runCli();
}

module.exports = {
  createApp,
  runCli,
};
