import { createHumanReview } from "./createHumanReview";

export async function createHumanReviewTask(input: unknown) {
  return createHumanReview(input);
}
