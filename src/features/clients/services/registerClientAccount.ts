import { getQuoteById } from "@/features/quote/services/getQuoteById";
import { sendAccountCreationEmail } from "@/features/emails/services/customerEmailService";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import {
  createClient as createClientRow,
  getClientByEmail,
  linkClientAuthUser
} from "@/shared/lib/data/clientRepository";
import { getLeadById, updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";

export type RegisterClientInput = {
  name: string;
  email: string;
  password: string;
  quoteId?: string | null;
};

/**
 * Creates a Supabase Auth user tagged role=client, links (or creates) its `clients` row, and
 * optionally attaches an existing quote's lead. Identity lives in Supabase Auth; data stays
 * server-side via service_role. The caller is responsible for opening the session afterwards.
 */
export async function registerClientAccount(input: RegisterClientInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) throw new Error("Le nom est obligatoire.");
  if (!email) throw new Error("L'email est obligatoire.");
  if (input.password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");

  const admin = createSupabaseAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: "client" },
    user_metadata: { name }
  });

  if (error || !created?.user) {
    const message = error?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      throw new Error("Un compte existe déjà avec cet email.");
    }
    throw new Error(message || "Création du compte impossible.");
  }

  const authUserId = created.user.id;

  let client = await getClientByEmail(email);
  if (!client) {
    client = await createClientRow({ organization: name, contactName: name, email, active: true });
    await createAuditLog({
      entityType: "client",
      entityId: client.id,
      action: auditActions.clientCreated,
      actor: "user",
      input: { organization: name, email, source: "self_signup" },
      output: { id: client.id }
    }).catch(() => undefined);
  }

  await linkClientAuthUser(client.id, authUserId);

  let redirectTo = "/compte";
  if (input.quoteId) {
    const quote = await getQuoteById(input.quoteId);
    if (quote) {
      const lead = await getLeadById(quote.leadId);
      if (lead) {
        await updateLeadRecord(quote.leadId, {
          email,
          organization: lead.organization ?? name,
          contactName: lead.contactName ?? name
        }).catch(() => undefined);
        // Awaited (NOT fire-and-forget): on serverless the function terminates as soon as it
        // responds, so a non-awaited email POST never reaches n8n. Email send is non-fatal
        // (it never throws on a webhook failure) so awaiting can't break signup.
        await sendAccountCreationEmail({ leadId: quote.leadId }).catch((error) =>
          console.error("[account-email] envoi échoué", error),
        );
      }
      redirectTo = `/client/devis/${quote.id}`;
    }
  }

  return { client, authUserId, redirectTo };
}
