export function buildChatResponse(input: { extracted: unknown; validation: unknown }) {
  return {
    message: "Votre demande est en cours de qualification.",
    ...input
  };
}
