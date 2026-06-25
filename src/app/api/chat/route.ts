import { createOpenAI } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, RetryError, APICallError, type ModelMessage } from "ai";

import { containsPromptInjectionAttempt, NEOTRAVEL_SYSTEM_PROMPT } from "../../../lib/ai/prompt";
import { chatJson } from "../../../lib/ai/chat-response";
import { LeadQualificationSchema, type LeadQualification } from "../../../lib/domain/schemas";
import { calculateQuoteForLead } from "../../../lib/quotes/quote-service";
import { createOrUpdateLead, detectMissingFields } from "../../../lib/ai/tools";
import { getLeadById } from "../../../lib/leads/lead-service";

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
        existingQualification = {
          departure_city: existing.departure_city ?? undefined,
          arrival_city: existing.arrival_city ?? undefined,
          departure_date: existing.departure_date ?? undefined,
          return_date: existing.return_date ?? undefined,
          passenger_count: existing.passenger_count ?? undefined,
          trip_type: existing.trip_type ?? undefined,
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
    const textResult = await withTimeout(
      generateText({
        model: openrouter(modelId),
        system: NEOTRAVEL_SYSTEM_PROMPT,
        prompt: `Extrait uniquement les informations de demande transport présentes dans ce message.\nN'invente aucun prix, aucune distance et aucun champ absent.\nRetourne UNIQUEMENT un objet JSON valide avec ces champs exacts (tous optionnels) :\n{\n  "name": string,\n  "organization": string,\n  "email": string (email valide),\n  "departure_city": string,\n  "arrival_city": string,\n  "departure_date": string (YYYY-MM-DD),\n  "return_date": string (YYYY-MM-DD),\n  "passenger_count": number,\n  "trip_type": "one_way" | "round_trip",\n  "free_message": string\n}\nN'inclus que les champs présents dans le message. Pas de markdown, pas de texte autour.\n\nMessage:\n${latestUserText}`,
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(qualificationTimeoutMs),
      }),
      qualificationTimeoutMs,
    );
    const rawObject = stripNulls(extractJsonFromText(textResult.text) as Record<string, unknown>);
    const lead = LeadQualificationSchema.parse({
      ...existingQualification,
      ...rawObject,
      free_message: rawObject.free_message ?? latestUserText,
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

    if (missing.status === "INCOMPLETE") {
      logAgentEvent(
        requestId,
        "request_completed",
        { status: "INCOMPLETE", leadId: leadResult.leadId },
        startedAt,
      );

      return chatJson({
        status: "INCOMPLETE",
        message: `Pour établir un devis, il manque : ${formatMissingFields(missing.missing_fields)}.`,
        leadId: leadResult.leadId,
        missingFields: missing.missing_fields,
      });
    }

    logAgentEvent(
      requestId,
      "quote_calculation_started",
      { leadId: leadResult.leadId },
      startedAt,
    );
    const quoteResult = await calculateQuoteForLead(leadResult.leadId);

    if (!quoteResult.ok) {
      logAgentEvent(
        requestId,
        "request_completed",
        {
          status: quoteResult.status,
          leadId: leadResult.leadId,
          reason: quoteResult.reason,
        },
        startedAt,
      );

      return chatJson({
        status: quoteResult.status,
        message: formatHumanReviewMessage(quoteResult.reason),
        leadId: leadResult.leadId,
        reviewReason: quoteResult.reason,
      });
    }

    logAgentEvent(
      requestId,
      "request_completed",
      {
        status: "QUOTE_READY",
        leadId: leadResult.leadId,
        quoteId: quoteResult.quoteId,
      },
      startedAt,
    );

    return chatJson({
      status: "QUOTE_READY",
      message: "Votre devis est prêt.",
      leadId: leadResult.leadId,
      quoteId: quoteResult.quoteId,
      quote: quoteResult.quote,
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
