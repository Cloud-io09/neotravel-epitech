import { createClient } from "@supabase/supabase-js";

export const SUPABASE_SERVER_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type SupabaseServerEnvKey = (typeof SUPABASE_SERVER_ENV_KEYS)[number];

export function getMissingSupabaseServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseServerEnvKey[] {
  return SUPABASE_SERVER_ENV_KEYS.filter((key) => !env[key]);
}

export function getSupabaseServerConfig(env: NodeJS.ProcessEnv = process.env) {
  const missingKeys = getMissingSupabaseServerEnv(env);

  if (missingKeys.length > 0) {
    throw new Error(`Missing Supabase server environment variables: ${missingKeys.join(", ")}`);
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

export function createServerSupabaseClient(env: NodeJS.ProcessEnv = process.env) {
  const config = getSupabaseServerConfig(env);

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
