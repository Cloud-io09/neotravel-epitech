import type { LanguageModelUsage } from "ai";

type ModelPrice = {
  inputEurPerMillion: number;
  outputEurPerMillion: number;
};

const DEFAULT_EUR_PER_USD = 0.93;

const DEFAULT_MODEL_PRICES_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "openai/gpt-oss-120b:free": { input: 0, output: 0 },
};

export function estimateAiCostEur(modelId: string, usage: LanguageModelUsage): number | undefined {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const price = getModelPrice(modelId);

  if (!price || (inputTokens === 0 && outputTokens === 0)) return undefined;

  const cost =
    (inputTokens / 1_000_000) * price.inputEurPerMillion +
    (outputTokens / 1_000_000) * price.outputEurPerMillion;

  return roundMoney(cost);
}

function getModelPrice(modelId: string): ModelPrice | undefined {
  const configuredInput = readNumberEnv("AI_COST_INPUT_EUR_PER_1M");
  const configuredOutput = readNumberEnv("AI_COST_OUTPUT_EUR_PER_1M");
  if (configuredInput !== undefined && configuredOutput !== undefined) {
    return {
      inputEurPerMillion: configuredInput,
      outputEurPerMillion: configuredOutput,
    };
  }

  const usdPrice = DEFAULT_MODEL_PRICES_USD_PER_MILLION[modelId];
  if (!usdPrice) return undefined;

  const eurPerUsd = readNumberEnv("AI_COST_EUR_PER_USD") ?? DEFAULT_EUR_PER_USD;
  return {
    inputEurPerMillion: usdPrice.input * eurPerUsd,
    outputEurPerMillion: usdPrice.output * eurPerUsd,
  };
}

function readNumberEnv(key: string): number | undefined {
  const value = process.env[key]?.trim();
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function roundMoney(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
