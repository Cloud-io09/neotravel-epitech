import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/shared/lib/demo/demoMode";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
export const ADMIN_LOGIN_PATH = "/admin-connexion";

function isProtectedPath(pathname: string) {
 return PROTECTED_PREFIXES.some(
  (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
 );
}

/**
 * Refreshes the Supabase session on every request and guards the
 * internal areas (`/dashboard`, `/admin`). Unauthenticated visitors are
 * redirected to the admin login page with a `redirect` back-link.
 *
 * In demo mode (Supabase not configured) gating is disabled so the MVP
 * stays fully demonstrable without a real backend.
 */
export async function updateSession(request: NextRequest) {
 let supabaseResponse = NextResponse.next({ request });

 if (isDemoMode()) return supabaseResponse;

 const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
   cookies: {
    getAll() {
     return request.cookies.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
     cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
     supabaseResponse = NextResponse.next({ request });
     cookiesToSet.forEach(({ name, value, options }) =>
      supabaseResponse.cookies.set(name, value, options)
     );
    }
   }
  }
 );

 const {
  data: { user }
 } = await supabase.auth.getUser();

 if (!user && isProtectedPath(request.nextUrl.pathname)) {
  const url = request.nextUrl.clone();
  url.pathname = ADMIN_LOGIN_PATH;
  url.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(url);
 }

 return supabaseResponse;
}
