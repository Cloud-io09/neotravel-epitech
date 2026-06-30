import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClientForApi } from "@/shared/lib/auth/requireClient";
import { updateClient } from "@/shared/lib/data/clientRepository";
import { createAuthServerClient } from "@/shared/lib/supabase/auth-server";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import { handleApiError, jsonError } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const DeletionBodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireClientForApi();
    const parsed = DeletionBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("VALIDATION_ERROR", "Mot de passe requis.", 400);
    }

    // Confirm identity with the current password (throwaway client, no session side effects).
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: session.email,
      password: parsed.data.password,
    });
    if (verifyError) {
      return jsonError("INVALID_PASSWORD", "Mot de passe incorrect.", 401);
    }

    // Delete the Supabase Auth user and deactivate the client row (keeps audit/quotes history).
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.deleteUser(session.authUserId);
    await updateClient(session.clientId, { active: false });

    const supabase = await createAuthServerClient();
    await supabase.auth.signOut().catch(() => undefined);

    return NextResponse.json({
      ok: true,
      message: "Votre compte client a été supprimé.",
      redirectTo: "/connexion",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
