import { type NextRequest } from "next/server";
import { updateSession } from "@/shared/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
 return await updateSession(request);
}

export const config = {
 // Guard only the internal areas. `/admin-connexion` is a different
 // segment and stays public so admins can sign in.
 matcher: ["/dashboard/:path*", "/admin/:path*"]
};
