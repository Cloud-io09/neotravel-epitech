import { getQuoteById } from "@/features/quote/services/getQuoteById";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { createClientAccountRecord, getClientAccount } from "@/shared/lib/auth/clientAuth";
import { createClient, getClientByEmail } from "@/shared/lib/data/clientRepository";
import { getLeadById, updateLeadRecord } from "@/shared/lib/data/leadRepository";

export type RegisterClientInput = {
  name: string;
  email: string;
  password: string;
  quoteId?: string | null;
};

export async function registerClientAccount(input: RegisterClientInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) throw new Error("Le nom est obligatoire.");
  if (!email) throw new Error("L'email est obligatoire.");
  if (input.password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");

  if (getClientAccount(email)) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  let client = await getClientByEmail(email);
  if (!client) {
    client = await createClient({
      organization: name,
      contactName: name,
      email,
      active: true
    });

    await createAuditLog({
      entityType: "client",
      entityId: client.id,
      action: auditActions.clientCreated,
      actor: "user",
      input: { organization: name, email, source: "self_signup" },
      output: { id: client.id }
    }).catch(() => undefined);
  }

  createClientAccountRecord(email, input.password, { name, clientId: client.id });

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
      }
      redirectTo = `/client/devis/${quote.id}`;
    }
  }

  return { client, redirectTo };
}
