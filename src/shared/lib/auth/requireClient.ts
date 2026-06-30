import { redirect } from "next/navigation";
import { getClientAuthUser } from "@/shared/lib/supabase/auth-server";
import { getClientByAuthUserId, getClientByEmail } from "@/shared/lib/data/clientRepository";
import type { Client } from "@/shared/types/client";
import { AppError } from "@/shared/lib/utils/errors";

export const CLIENT_LOGIN_PATH = "/connexion";

export type ClientSession = {
  authUserId: string;
  email: string;
  clientId: string;
  name: string;
  client: Client;
};

/**
 * The logged-in client, resolved from the Supabase Auth session (role=client) mapped to its
 * `clients` row. Data access stays server-side via service_role, scoped to this client.
 */
export async function getClientSession(): Promise<ClientSession | null> {
  const user = await getClientAuthUser();
  if (!user?.email) return null;

  const email = user.email;
  let client = await getClientByAuthUserId(user.id);
  if (!client) client = await getClientByEmail(email);
  if (!client) return null;

  const metadataName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  const name =
    metadataName ||
    client.contactName?.trim() ||
    client.organization?.trim() ||
    client.email.split("@")[0] ||
    "Client";

  return { authUserId: user.id, email: client.email, clientId: client.id, name, client };
}

export async function requireClient(): Promise<ClientSession> {
  const session = await getClientSession();
  if (!session) redirect(CLIENT_LOGIN_PATH);
  return session;
}

export async function requireClientForApi(): Promise<ClientSession> {
  const session = await getClientSession();
  if (!session) throw new AppError("Connexion requise.", "UNAUTHORIZED");
  return session;
}
