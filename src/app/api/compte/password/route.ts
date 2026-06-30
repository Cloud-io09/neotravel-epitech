import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireClientForApi } from "@/shared/lib/auth/requireClient";
import { createAuthServerClient } from "@/shared/lib/supabase/auth-server";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const PasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const session = await requireClientForApi();
    const parsed = PasswordBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("VALIDATION_ERROR", "Mot de passe invalide.", 400, parsed.error.flatten());
    }

    // Verify the current password with a throwaway client (no cookie/session side effects).
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: session.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      return jsonError("INVALID_PASSWORD", "Mot de passe actuel incorrect.", 401);
    }

    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) {
      return jsonError("PASSWORD_UPDATE_FAILED", error.message, 400);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
