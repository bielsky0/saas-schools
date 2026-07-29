import { createClient, SupabaseClient } from "@supabase/supabase-js";

let CLIENT_INSTANCE: SupabaseClient | null = null;

const checkForEnv = (envVar: string | undefined, name: string) => {
  if (!envVar) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return envVar;
};

export const getSupabaseClient = () => {
  checkForEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  checkForEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
  if (CLIENT_INSTANCE) {
    return CLIENT_INSTANCE;
  }
  // Use the same URL and key as the admin instance, but you can customize this if needed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";
  CLIENT_INSTANCE = createClient(supabaseUrl, supabaseKey);
  return CLIENT_INSTANCE;
};
