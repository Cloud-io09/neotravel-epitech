export type ModelRun = {
 id: string;
 leadId?: string | null;
 purpose: "extract_demand" | "clarify" | "summarize" | "partner_suggestion" | "tool_call";
 provider?: string;
 model: string;
 promptTokens?: number;
 completionTokens?: number;
 costEur?: number;
 latencyMs?: number;
 payloadHash: string;
 outputHash?: string;
 status?: "success" | "error" | "blocked" | "mock";
 errorMessage?: string;
 createdAt: string;
};
