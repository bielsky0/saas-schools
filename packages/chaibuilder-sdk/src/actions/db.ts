import dotenv from "dotenv";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./drizzle/schema";
dotenv.config();

let connectionString = process.env.CHAIBUILDER_DATABASE_URL;

if (!connectionString) {
  throw new Error("Database not configured. Please set CHAIBUILDER_DATABASE_URL environment variable.");
}

const sanitizeConnectionString = (connectionString: string) => {
  return connectionString.trim().replace(/^"|"$/g, "");
};

connectionString = sanitizeConnectionString(connectionString);
const validateConnectionString = (connectionString: string) => {
  return connectionString.startsWith("postgresql://") || connectionString.startsWith("postgres://");
};

if (!validateConnectionString(connectionString)) {
  throw new Error(
    "Database connection string is invalid. Please check your CHAIBUILDER_DATABASE_URL environment variable.",
  );
}

const client = postgres(connectionString, { max: 10 });
const db: PostgresJsDatabase<typeof schema> = drizzle(client, { schema });

export { db };

export { schema };

type DbResult<T> = { data: T; error: null } | { data: null; error: Error };

export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<DbResult<T>> {
  try {
    const data = await queryFn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
