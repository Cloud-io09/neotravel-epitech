import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
          }
        }
      }
    }
  );
}

export const CLIENT_ROLE = "client";

function userRole(user: { app_metadata?: Record<string, unknown> | null } | null): string | null {
  const role = user?.app_metadata?.role;
  return typeof role === "string" ? role : null;
}

export async function getAdminUser() {
  const supabase = await createAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  // Client accounts share the same Supabase Auth project. A client must NEVER be treated as
  // staff/admin: exclude any user explicitly tagged with the client role.
  if (user && userRole(user) === CLIENT_ROLE) return null;
  return user;
}

/** The Supabase Auth user iff it is a client account (role=client). Used by the client space. */
export async function getClientAuthUser() {
  const supabase = await createAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || userRole(user) !== CLIENT_ROLE) return null;
  return user;
}
