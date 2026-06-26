import { createOpenAI } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, RetryError, APICallError, type ModelMessage } from "ai";

import { containsPromptInjectionAttempt, NEOTRAVEL_SYSTEM_PROMPT } from "../../../lib/ai/prompt";
import { chatJson, type ExtractedFields } from "../../../lib/ai/chat-response";
import { LeadQualificationSchema, type LeadQualification } from "../../../lib/domain/schemas";
import { calculateQuoteForLead } from "../../../lib/quotes/quote-service";
import { createOrUpdateLead, detectMissingFields } from "../../../lib/ai/tools";
import { getLeadById } from "../../../lib/leads/lead-service";
import { normalizeExtraction } from "../../../lib/ai/normalize-extraction";

export const runtime = "nodejs";
const DEFAULT_QUALIFICATION_TIMEOUT_MS = 30_000;

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const body = await request.json().catch(() => null);
    const messages = normalizeMessages(body);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const latestUserText = getMessageText(latestUserMessage?.content);

    logAgentEvent(
      requestId,
      "request_received",
      {
        messageLength: latestUserText.length,
      },
      startedAt,
    );

    const existingLeadId = extractLeadIdFromBody(body);

    if (!latestUserText.trim()) {
      logAgentEvent(requestId, "request_rejected", { reason: "EMPTY_MESSAGE" }, startedAt);

      return chatJson(
        {
          status: "ERROR",
          message: "Message utilisateur manquant.",
        },
        { status: 400 },
      );
    }

    if (containsPromptInjectionAttempt(latestUserText)) {
      logAgentEvent(requestId, "request_rejected", { reason: "PROMPT_INJECTION" }, startedAt);

      return chatJson(
        {
          status: "HUMAN_REVIEW",
          message:
            "Je ne peux pas contourner les règles tarifaires. Le prix doit être calculé uniquement par calculer_devis().",
          reviewReason: "PROMPT_INJECTION_ATTEMPT",
        },
        { status: 200 },
      );
    }

    const aiApiKey = process.env.AI_API_KEY;

    if (!aiApiKey) {
      logAgentEvent(requestId, "request_failed", { reason: "MISSING_AI_API_KEY" }, startedAt);

      return chatJson(
        {
          status: "ERROR",
          message: "AI_API_KEY est manquant. Configurez la clé pour activer l'agent IA.",
        },
        { status: 503 },
      );
    }

    let existingQualification: LeadQualification = {};
    if (existingLeadId) {
      const existing = await getLeadById(existingLeadId);
      if (existing) {
        // Use missing_fields to exclude DB fallback values ("À compléter", "2099-01-01", etc.)
        // that were inserted for NOT NULL constraints but are not real user-provided data.
        const trulyMissing = new Set(existing.missing_fields ?? []);
        existingQualification = {
          departure_city: trulyMissing.has("departure_city") ? undefined : (existing.departure_city ?? undefined),
          arrival_city: trulyMissing.has("arrival_city") ? undefined : (existing.arrival_city ?? undefined),
          departure_date: trulyMissing.has("departure_date") ? undefined : (existing.departure_date ?? undefined),
          return_date: existing.return_date ?? undefined,
          passenger_count: trulyMissing.has("passenger_count") ? undefined : (existing.passenger_count ?? undefined),
          trip_type: trulyMissing.has("trip_type") ? undefined : (existing.trip_type ?? undefined),
          options: existing.options ?? undefined,
          free_message: existing.free_message ?? undefined,
        };
      }
    }

    const modelId = process.env.AI_MODEL_ID ?? "openai/gpt-oss-120b:free";
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: aiApiKey,
    });
    const qualificationTimeoutMs = getQualificationTimeoutMs();
    logAgentEvent(
      requestId,
      "qualification_started",
      { model: modelId, timeoutMs: qualificationTimeoutMs },
      startedAt,
    );
    // Provide existing departure_date to the LLM so it can infer the year for return_date
    const contextHint = existingQualification.departure_date
      ? `\nContexte déjà collecté (pour inférence uniquement) : departure_date="${existingQualification.departure_date}"${existingQualification.departure_city ? `, departure_city="${existingQualification.departure_city}"` : ""}${existingQualification.arrival_city ? `, arrival_city="${existingQualification.arrival_city}"` : ""}.`
      : "";

    const textResult = await withTimeout(
      generateText({
        model: openrouter(modelId),
        system: NEOTRAVEL_SYSTEM_PROMPT,
        prompt: `Extrait les informations de transport NOUVELLEMENT fournies dans ce message utilisateur.${contextHint}

NORMALISATION (obligatoire) :
- "X passagers" / "X personnes" / "X pax" → passenger_count: X (entier)
- "on reviendra" / "on va revenir" / "retour le" / "aller-retour" / "trajet retour" → trip_type: "round_trip"
- "aller simple" / "sans retour" / "juste l'aller" → trip_type: "one_way"
- "Je veux aller à VILLE" / "on va à VILLE" → arrival_city: "VILLE"
- "on part de VILLE" / "depuis VILLE" / "départ VILLE" → departure_city: "VILLE"
- Si return_date est mentionnée sans année ET departure_date connue, complète l'année : "le 12 juin" + 2027 → "2027-06-12"

RÈGLES ABSOLUES :
1. departure_city et arrival_city : noms de villes ÉCRITS TEXTUELLEMENT par l'utilisateur.
   INTERDIT : inférer depuis "le sud", "la côte", "la plage", "la montagne".
2. "je ne sais pas" / "pas encore" / "j'hésite" → ce champ est ABSENT.
3. Message sans information de transport concrète → retourne {}.

Retourne UNIQUEMENT un objet JSON valide (tous champs optionnels, aucun markdown) :
{"name":string,"organization":string,"email":string,"departure_city":string,"arrival_city":string,"departure_date":"YYYY-MM-DD","return_date":"YYYY-MM-DD","passenger_count":number,"trip_type":"one_way"|"round_trip","free_message":string}

Message : ${latestUserText}`,
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(qualificationTimeoutMs),
      }),
      qualificationTimeoutMs,
    );
    const rawExtracted = stripNulls(extractJsonFromText(textResult.text) as Record<string, unknown>);
    const normalizedDelta = normalizeExtraction(rawExtracted, existingQualification);
    logAgentEvent(requestId, "extraction_debug", {
      raw: rawExtracted,
      normalized: normalizedDelta,
      existingState: Object.fromEntries(
        Object.entries(existingQualification).filter(([, v]) => v !== undefined),
      ),
    }, startedAt);
    const lead = LeadQualificationSchema.parse({
      ...existingQualification,
      ...normalizedDelta,
      free_message: (normalizedDelta.free_message as string | undefined) ?? latestUserText,
    });
    const missing = detectMissingFields(lead);
    logAgentEvent(
      requestId,
      "qualification_completed",
      {
        status: missing.status,
        missingFieldsCount: missing.missing_fields.length,
        hasEmail: Boolean(lead.email),
        hasPassengerCount: lead.passenger_count !== undefined,
      },
      startedAt,
    );
    const leadResult = await createOrUpdateLead({ leadId: existingLeadId, lead });
    logAgentEvent(
      requestId,
      "lead_upserted",
      {
        leadId: leadResult.leadId,
        status: leadResult.status,
      },
      startedAt,
    );

    const extractedFields: ExtractedFields = {
      departureCity: lead.departure_city ?? null,
      arrivalCity: lead.arrival_city ?? null,
      departureDate: lead.departure_date ?? null,
      passengerCount: lead.passenger_count ?? null,
      tripType: (lead.trip_type ?? null) as "one_way" | "round_trip" | null,
    };

    if (missing.status === "INCOMPLETE") {
      const known = (Object.entries(lead) as [string, unknown][])
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(", ");

      let conversationalMessage: string;
      try {
        const replyResult = await withTimeout(
          generateText({
            model: openrouter(modelId),
            system: `Tu es l'assistant NeoTravel — transport de groupe premium en France.
Ton rôle : aider les prospects à qualifier leur demande. Tu ne calcules jamais prix ni distance.

Informations déjà collectées : ${known || "aucune"}.
Informations manquantes pour le devis : ${formatMissingFields(missing.missing_fields)}.

Consignes :
- Réponds en français, de façon chaleureuse et naturelle (2-4 phrases max).
- Si l'utilisateur dit bonjour ou pose une question générale, réponds-y avant de guider vers le projet.
- Si l'utilisateur demande des suggestions ou exemples, propose 2-3 trajets courants en France (Paris-Lyon, Bordeaux-Marseille, Nantes-Strasbourg) sans jamais mentionner de prix.
- Pose UNE seule question pour obtenir une information manquante à la fois, de façon naturelle.
- Reste dans le périmètre NeoTravel (transport groupe France). Refuse poliment toute demande hors contexte.`,
            messages,
            temperature: 0.65,
            maxOutputTokens: 180,
          }),
          qualificationTimeoutMs,
        );
        conversationalMessage =
          replyResult.text.trim() ||
          `Pour votre devis, merci de préciser : ${formatMissingFields(missing.missing_fields)}.`;
      } catch {
        conversationalMessage = `Pour votre devis, merci de préciser : ${formatMissingFields(missing.missing_fields)}.`;
      }

      logAgentEvent(
        requestId,
        "request_completed",
        { status: "INCOMPLETE", leadId: leadResult.leadId },
        startedAt,
      );

      return chatJson({
        status: "INCOMPLETE",
        message: conversationalMessage,
        leadId: leadResult.leadId,
        missingFields: missing.missing_fields,
        extractedFields,
      });
    }

    // All required fields collected — return QUALIFIED so the front-end enables the quote button.
    // Quote calculation is intentionally left to the dedicated /api/quotes route (triggered by the user).
    const qualifiedSummary = [
      lead.departure_city && lead.arrival_city ? `${lead.departure_city} → ${lead.arrival_city}` : null,
      lead.departure_date ? `le ${lead.departure_date}` : null,
      lead.passenger_count ? `${lead.passenger_count} passagers` : null,
      lead.trip_type === "round_trip" ? "aller-retour" : lead.trip_type === "one_way" ? "aller simple" : null,
    ]
      .filter(Boolean)
      .join(", ");

    let qualifiedMessage: string;
    try {
      const replyResult = await withTimeout(
        generateText({
          model: openrouter(modelId),
          system: `Tu es l'assistant NeoTravel — transport de groupe premium en France.
Tu viens de collecter toutes les informations nécessaires pour un devis.
Trajet qualifié : ${qualifiedSummary || "informations complètes"}.
Génère un message court (2-3 phrases) confirmant ce que tu as compris et invitant l'utilisateur à cliquer sur "Recevoir mon devis". Ne mentionne aucun prix ni distance.`,
          messages,
          temperature: 0.5,
          maxOutputTokens: 120,
        }),
        qualificationTimeoutMs,
      );
      qualifiedMessage = replyResult.text.trim() || `Parfait, j'ai toutes les informations pour votre trajet (${qualifiedSummary}). Cliquez sur "Recevoir mon devis" pour obtenir votre estimation.`;
    } catch {
      qualifiedMessage = `Parfait, j'ai toutes les informations pour votre trajet (${qualifiedSummary}). Cliquez sur "Recevoir mon devis" pour obtenir votre estimation.`;
    }

    logAgentEvent(
      requestId,
      "request_completed",
      { status: "QUALIFIED", leadId: leadResult.leadId },
      startedAt,
    );

    return chatJson({
      status: "QUALIFIED",
      message: qualifiedMessage,
      leadId: leadResult.leadId,
      extractedFields,
    });
  } catch (error) {
    const isDirectApiError = error instanceof APICallError;
    const reason = isAbortError(error)
      ? "QUALIFICATION_TIMEOUT"
      : error instanceof NoObjectGeneratedError
        ? "AI_NO_OBJECT_GENERATED"
        : error instanceof RetryError
          ? "AI_SERVICE_UNAVAILABLE"
          : isDirectApiError
            ? "AI_API_CALL_ERROR"
            : "UNHANDLED_ERROR";

    logAgentEvent(
      requestId,
      "request_failed",
      {
        reason,
        errorName: error instanceof Error ? error.name : "UnknownError",
        ...(isDirectApiError
          ? {
              httpStatus: error.statusCode,
              lastErrorMessage: error.message,
              responseBody: error.responseBody,
            }
          : extractRetryErrorDetails(error)),
      },
      startedAt,
    );

    const statusCode =
      reason === "QUALIFICATION_TIMEOUT"
        ? 504
        : reason === "AI_NO_OBJECT_GENERATED" ||
            reason === "AI_SERVICE_UNAVAILABLE" ||
            reason === "AI_API_CALL_ERROR"
          ? 503
          : 500;

    const message =
      reason === "QUALIFICATION_TIMEOUT"
        ? "La qualification IA a expiré. Réessayez ou passez en reprise humaine."
        : reason === "AI_NO_OBJECT_GENERATED"
          ? "Le modèle n'a pas pu structurer la demande. Réessayez dans quelques instants."
          : reason === "AI_SERVICE_UNAVAILABLE" || reason === "AI_API_CALL_ERROR"
            ? "Le service IA est temporairement indisponible. Réessayez dans quelques secondes."
            : "La demande n'a pas pu être traitée.";

    return chatJson(
      {
        status: "ERROR",
        message,
        reviewReason: reason,
        ...(shouldLogAgentEvents() && error instanceof Error
          ? { _debug: `${error.name}: ${error.message}` }
          : {}),
      },
      { status: statusCode },
    );
  }
}

function normalizeMessages(body: unknown): ModelMessage[] {
  if (isMessageBody(body)) {
    return body.messages;
  }

  if (isSingleMessageBody(body)) {
    return [{ role: "user", content: body.message }];
  }

  return [];
}

type MessageBody = {
  messages: ModelMessage[];
};

type SingleMessageBody = {
  message: string;
};

function isMessageBody(body: unknown): body is MessageBody {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { messages?: unknown }).messages)
  );
}

function isSingleMessageBody(body: unknown): body is SingleMessageBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { message?: unknown }).message === "string"
  );
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          return String((part as { text: unknown }).text);
        }

        return "";
      })
      .join(" ");
  }

  return "";
}


function getQualificationTimeoutMs(): number {
  const configured = Number(process.env.AGENT_QUALIFICATION_TIMEOUT_MS);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_QUALIFICATION_TIMEOUT_MS;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(`Operation timed out after ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function logAgentEvent(
  requestId: string,
  event: string,
  metadata: Record<string, unknown> = {},
  startedAt?: number,
): void {
  if (!shouldLogAgentEvents()) {
    return;
  }

  console.info("[neotravel:agent]", {
    requestId,
    event,
    durationMs: startedAt ? Date.now() - startedAt : undefined,
    ...metadata,
  });
}

const HUMAN_REVIEW_MESSAGES: Record<string, string> = {
  PAX_OVER_85:
    "Votre demande dépasse notre capacité standard (85 passagers). Notre équipe vous contactera pour une solution adaptée.",
  DEPARTURE_IN_PAST:
    "La date de départ indiquée est déjà passée. Merci de nous préciser une date à venir.",
  UNKNOWN_ROUTE_NO_DISTANCE:
    "Cet itinéraire n'est pas encore référencé dans notre base. Notre équipe calculera le tarif manuellement et vous recontactera.",
  INVALID_DATE:
    "La date de départ fournie est invalide. Merci de la vérifier.",
  PAX_ZERO_OR_NEGATIVE:
    "Le nombre de passagers indiqué n'est pas valide. Merci de le préciser.",
};

function formatHumanReviewMessage(reason: string): string {
  return (
    HUMAN_REVIEW_MESSAGES[reason] ??
    "Votre demande nécessite une vérification par notre équipe. Nous vous contacterons rapidement."
  );
}

function extractLeadIdFromBody(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const id = (body as Record<string, unknown>).leadId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return undefined;
}

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}

const FIELD_LABELS: Record<string, string> = {
  departure_city: "la ville de départ",
  arrival_city: "la ville d'arrivée",
  departure_date: "la date de départ",
  passenger_count: "le nombre de passagers",
  trip_type: "le type de trajet (aller simple ou aller-retour)",
};

function formatMissingFields(fields: readonly string[]): string {
  const labels = fields.map((f) => FIELD_LABELS[f] ?? f);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) { try { return JSON.parse(block[1].trim()); } catch {} }
  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace) { try { return JSON.parse(brace[0]); } catch {} }
  throw new Error(`AI_NO_JSON: model returned non-JSON response: ${trimmed.slice(0, 200)}`);
}

function extractRetryErrorDetails(error: unknown): Record<string, unknown> {
  if (!(error instanceof RetryError)) return {};
  const last = error.lastError;
  if (last instanceof APICallError) {
    return {
      lastErrorName: last.name,
      lastErrorMessage: last.message,
      httpStatus: last.statusCode,
      responseBody: last.responseBody,
    };
  }
  if (last instanceof Error) {
    return { lastErrorName: last.name, lastErrorMessage: last.message };
  }
  return {};
}

function shouldLogAgentEvents(): boolean {
  return process.env.AGENT_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";
}
