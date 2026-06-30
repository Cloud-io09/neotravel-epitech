import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client wired to the Next.js cookie store.
 * Used to read the authenticated admin session in Server Components,
 * Route Handlers and Server Actions (distinct from the service-role
 * `admin.ts` client and the stateless `server.ts` data client).
 */
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
      // The middleware refreshes the session, so this can be ignored.
     }
    }
   }
  }
 );
}

/** Returns the currently authenticated admin user, or null. */
export async function getAdminUser() {
 const supabase = await createAuthServerClient();
 const {
  data: { user }
 } = await supabase.auth.getUser();

 return user;
}
