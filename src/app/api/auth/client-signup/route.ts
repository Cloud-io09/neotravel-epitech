import { NextResponse } from "next/server";
import { z } from "zod";
import { registerClientAccount } from "@/features/clients/services/registerClientAccount";
import { createAuthServerClient } from "@/shared/lib/supabase/auth-server";
import { handleApiError, jsonError } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

const ClientSignupSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est obligatoire."),
    email: z.string().trim().email("Email invalide."),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    passwordConfirm: z.string().min(8),
    quoteId: z.string().trim().min(1).nullable().optional()
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirm"]
  });

export async function POST(request: Request) {
  try {
    const input = ClientSignupSchema.parse(await request.json());
    const { client, redirectTo } = await registerClientAccount({
      name: input.name,
      email: input.email,
      password: input.password,
      quoteId: input.quoteId ?? null
    });

    // Open the Supabase session (sets the auth cookies via the SSR cookie adapter).
    const supabase = await createAuthServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password
    });
    if (signInError) {
      // Account exists but session couldn't open — let the client log in manually.
      return NextResponse.json({ ok: true, clientId: client.id, redirectTo: "/connexion" });
    }

    return NextResponse.json({ ok: true, clientId: client.id, redirectTo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Données invalides.", 400);
    }
    if (error instanceof Error) {
      return jsonError("SIGNUP_FAILED", error.message, 400);
    }
    return handleApiError(error);
  }
}
