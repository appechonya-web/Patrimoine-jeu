import type { QuizQuestion } from "@patrimoine-jeu/domain";

export function pickRandomQuizQuestion(questions: QuizQuestion[]): QuizQuestion {
  return questions[Math.floor(Math.random() * questions.length)];
}
