import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/shared/lib/supabase/auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/connexion", request.url), { status: 303 });
}
