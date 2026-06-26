export function ClarifyingQuestions({ questions = [] }: { questions?: string[] }) {
  return (
    <ul>
      {questions.map((question) => (
        <li key={question}>{question}</li>
      ))}
    </ul>
  );
}
