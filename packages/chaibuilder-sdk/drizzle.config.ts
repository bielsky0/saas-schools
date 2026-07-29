import { defineConfig } from "drizzle-kit";
const connectionString = process.env.CHAIBUILDER_DATABASE_URL!;

export default defineConfig({
  schema: "./src/actions/drizzle/schema.ts",
  out: "./src/actions/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
