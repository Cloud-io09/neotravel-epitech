export type AuditLog = {
 id: string;
 entityType: "client" | "lead" | "quote" | "followup" | "human_review" | "pricing_rule" | "model_run" | "distance";
 entityId: string;
 action: string;
 createdAt: string;
 actor: "user" | "ai" | "system" | "human" | "commercial" | "admin";
 inputHash?: string;
 outputHash?: string;
 payload?: Record<string, unknown>;
};
