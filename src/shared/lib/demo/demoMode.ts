function isValidSupabaseUrl(url: string | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSupabaseConfigured() {
  return (
    isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function isDemoMode() {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE === "true" && isSupabaseConfigured()) return false;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured()) return false;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;

  return !isSupabaseConfigured();
}

export function getDataMode() {
  return isDemoMode() ? "mock" : "supabase";
}
