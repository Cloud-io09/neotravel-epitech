import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { estimateAiCostEur } from "./ai-costs";

const usage = {
  inputTokens: 1_000_000,
  inputTokenDetails: {
    noCacheTokens: undefined,
    cacheReadTokens: undefined,
    cacheWriteTokens: undefined,
  },
  outputTokens: 500_000,
  outputTokenDetails: {
    textTokens: undefined,
    reasoningTokens: undefined,
  },
  totalTokens: 1_500_000,
  raw: undefined,
};

describe("estimateAiCostEur", () => {
  const originalEnv = {
    AI_COST_INPUT_EUR_PER_1M: process.env.AI_COST_INPUT_EUR_PER_1M,
    AI_COST_OUTPUT_EUR_PER_1M: process.env.AI_COST_OUTPUT_EUR_PER_1M,
    AI_COST_EUR_PER_USD: process.env.AI_COST_EUR_PER_USD,
  };

  beforeEach(() => {
    delete process.env.AI_COST_INPUT_EUR_PER_1M;
    delete process.env.AI_COST_OUTPUT_EUR_PER_1M;
    delete process.env.AI_COST_EUR_PER_USD;
  });

  afterEach(() => {
    restoreEnv("AI_COST_INPUT_EUR_PER_1M", originalEnv.AI_COST_INPUT_EUR_PER_1M);
    restoreEnv("AI_COST_OUTPUT_EUR_PER_1M", originalEnv.AI_COST_OUTPUT_EUR_PER_1M);
    restoreEnv("AI_COST_EUR_PER_USD", originalEnv.AI_COST_EUR_PER_USD);
  });

  it("estimates known model cost from token usage", () => {
    expect(estimateAiCostEur("openai/gpt-4o-mini", usage)).toBe(0.4185);
  });

  it("returns undefined for unknown models without configured pricing", () => {
    expect(estimateAiCostEur("unknown/model", usage)).toBeUndefined();
  });

  it("uses explicit env pricing overrides", () => {
    process.env.AI_COST_INPUT_EUR_PER_1M = "1";
    process.env.AI_COST_OUTPUT_EUR_PER_1M = "2";

    expect(estimateAiCostEur("unknown/model", usage)).toBe(2);
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
