import { getModelProvider } from "./modelProvider";
import { systemPrompt } from "./prompts";
import { neoTravelTools } from "./tools";
import { runClarification } from "@/features/ai-orchestration/services/runClarification";
import { evaluateHumanReview } from "@/features/human-review/services/shouldEscalate";

export type NeoTravelAgentInput = {
  message: string;
};

export async function NeoTravelAgent(input: NeoTravelAgentInput) {
  const provider = getModelProvider();
  const demand = await neoTravelTools.extract_demand({ message: input.message });
  const validation = await neoTravelTools.detect_missing_fields(demand);
  const directHumanReview = evaluateHumanReview({ ...demand, rawMessage: input.message });
  const onlyDistanceNeedsProvider =
    directHumanReview.reasons.length === 1 &&
    directHumanReview.reasons[0] === "UNKNOWN_ROUTE_WITHOUT_CONTROLLED_DISTANCE";

  if (directHumanReview.escalate && !onlyDistanceNeedsProvider) {
    const review = await neoTravelTools.handoff_human({
      ...demand,
      rawMessage: input.message,
      reason: directHumanReview.reasons[0],
      reasons: directHumanReview.reasons
    });
    return {
      mode: provider.mode,
      provider: provider.provider,
      model: provider.model,
      systemPrompt,
      status: "HUMAN_REVIEW",
      demand,
      humanReviewReasons: directHumanReview.reasons,
      review
    };
  }

  if (!validation.complete) {
    return {
      mode: provider.mode,
      provider: provider.provider,
      model: provider.model,
      systemPrompt,
      status: "INCOMPLETE",
      demand,
      missingFields: validation.missingFields.map(String),
      clarification: await runClarification({ missingFields: validation.missingFields.map(String) })
    };
  }

  const quotePreview = await neoTravelTools.generate_quote_preview(demand);

  return {
    mode: provider.mode,
    provider: provider.provider,
    model: provider.model,
    systemPrompt,
    status: "QUALIFIED",
    demand,
    quotePreview
  };
}
