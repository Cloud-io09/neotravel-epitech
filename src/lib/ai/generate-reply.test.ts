import { describe, expect, it, vi } from "vitest";

import { buildReplyPrompt, generateAssistantReply, type ReplyContext } from "./generate-reply";

const baseCtx: ReplyContext = {
  status: "INCOMPLETE",
  collected: { departure_city: "Paris" },
  missingFields: ["arrival_city", "departure_date"],
  warnings: [],
  conversation: [
    { role: "assistant", content: "Quelle est votre ville de départ ?" },
    { role: "user", content: "Paris" },
  ],
};

describe("buildReplyPrompt", () => {
  it("includes collected state, missing fields and the transcript", () => {
    const prompt = buildReplyPrompt(baseCtx);
    expect(prompt).toContain("ville de départ = Paris");
    expect(prompt).toContain("ville d'arrivée");
    expect(prompt).toContain("Client : Paris");
  });

  it("forbids inventing prices and distances", () => {
    const prompt = buildReplyPrompt(baseCtx);
    expect(prompt).toMatch(/jamais.*prix/i);
    expect(prompt).toContain("distance");
  });

  it("asks only the first missing field for INCOMPLETE", () => {
    const prompt = buildReplyPrompt(baseCtx);
    expect(prompt).toContain('UNIQUEMENT la première information manquante : "ville d\'arrivée"');
  });

  it("invites to the quote button when QUALIFIED", () => {
    const prompt = buildReplyPrompt({ ...baseCtx, status: "QUALIFIED", missingFields: [] });
    expect(prompt).toContain("Recevoir mon devis");
  });
});

describe("generateAssistantReply", () => {
  it("returns the model reply when generation succeeds", async () => {
    const generate = vi.fn().mockResolvedValue("C'est noté pour Paris. Quelle est votre ville d'arrivée ?");
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("C'est noté pour Paris. Quelle est votre ville d'arrivée ?");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("strips wrapping quotes the model may add", async () => {
    const generate = vi.fn().mockResolvedValue('"Quelle est votre ville d\'arrivée ?"');
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("falls back to the deterministic template on failure", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("timeout"));
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("falls back when the model returns an empty string", async () => {
    const generate = vi.fn().mockResolvedValue("   ");
    const reply = await generateAssistantReply(baseCtx, { generate });
    expect(reply).toBe("Quelle est votre ville d'arrivée ?");
  });

  it("uses the provided fallback string when given", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("down"));
    const reply = await generateAssistantReply(
      { ...baseCtx, status: "QUALIFIED", missingFields: [] },
      { generate, fallback: "Demande prête, cliquez sur Recevoir mon devis." },
    );
    expect(reply).toBe("Demande prête, cliquez sur Recevoir mon devis.");
  });
});
