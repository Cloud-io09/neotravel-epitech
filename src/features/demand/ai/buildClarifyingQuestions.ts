const labels: Record<string, string> = {
  organization: "le nom de votre organisation",
  email: "votre email de contact",
  departureCity: "la ville de depart",
  arrivalCity: "la ville d'arrivee",
  departureDate: "la date de depart",
  returnDate: "la date de retour",
  passengerCount: "le nombre de passagers",
  tripType: "le type de trajet"
};

export function buildClarifyingQuestions(missingFields: string[]) {
  const firstMissingField = missingFields[0];
  if (!firstMissingField) return [];
  return [`Pouvez-vous preciser ${labels[firstMissingField] ?? firstMissingField} ?`];
}
