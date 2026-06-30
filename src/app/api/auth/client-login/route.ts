import { NextResponse } from "next/server";
import { z } from "zod";
import { CLIENT_ROLE, createAuthServerClient } from "@/shared/lib/supabase/auth-server";
import { handleApiError, jsonError } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const ClientLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional().nullable(),
});

function safeClientRedirect(value: string | null | undefined) {
  if (!value) return "/compte";
  if (!value.startsWith("/") || value.startsWith("//")) return "/compte";
  if (value.startsWith("/dashboard") || value.startsWith("/admin")) return "/compte";
  return value;
}

export async function POST(request: Request) {
  try {
    const input = ClientLoginSchema.parse(await request.json());
    const supabase = await createAuthServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password
    });

    if (error || !data.user) {
      return jsonError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
    }

    // Only client accounts may use the client space. Staff/admin must use the dashboard login.
    if ((data.user.app_metadata as { role?: string } | null)?.role !== CLIENT_ROLE) {
      await supabase.auth.signOut();
      return jsonError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
    }

    return NextResponse.json({ ok: true, redirectTo: safeClientRedirect(input.redirectTo) });
  } catch (error) {
    return handleApiError(error);
  }
}
