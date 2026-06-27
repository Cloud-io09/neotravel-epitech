import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { modelConfig, type AiProviderName } from "./modelConfig";

export type ModelProvider = {
 provider: AiProviderName;
 model: string;
 mode: "mock" | "real";
 canUseRealModel: boolean;
};

export function getModelProvider(): ModelProvider {
 const provider = modelConfig.provider;
 const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
 const forceMock = isDemoMode() || provider === "mock" || !hasOpenAiKey;

 if (forceMock) {
  return {
   provider: "mock",
   model: "mock",
   mode: "mock",
   canUseRealModel: false
  };
 }

 return {
  provider,
  model: modelConfig.model,
  mode: "real",
  canUseRealModel: provider === "openai"
 };
}
