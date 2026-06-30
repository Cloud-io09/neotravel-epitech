import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CLIENT_SESSION_COOKIE,
  createClientSessionToken,
  verifyClientCredentials
} from "@/shared/lib/auth/clientAuth";
import { handleApiError, jsonError } from "@/shared/lib/utils/apiResponse";

const ClientLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const input = ClientLoginSchema.parse(await request.json());
    const email = input.email.toLowerCase();

    if (!verifyClientCredentials(email, input.password)) {
      return jsonError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.", 401);
    }

    const response = NextResponse.json({ ok: true, redirectTo: "/compte" });
    response.cookies.set(CLIENT_SESSION_COOKIE, createClientSessionToken(email), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
