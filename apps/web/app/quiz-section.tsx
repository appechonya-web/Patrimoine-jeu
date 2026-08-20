"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizStatus } from "../lib/session";
import { GameError, answerQuiz, type QuizAnswerResult } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function cooldownLabel(secondsRemaining: number): string {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `Prochaine question dans ${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function QuizSection({ status }: { status: QuizStatus | null }) {
  const router = useRouter();
  const [secondsRemaining, setSecondsRemaining] = useState(status?.secondsRemaining ?? 0);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSecondsRemaining(status?.secondsRemaining ?? 0);
    setResult(null);
  }, [status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  async function handleAnswer(answer: boolean) {
    if (!status || !status.question) return;
    setError(null);
    setPending(true);
    try {
      const res = await answerQuiz(status.question.id, answer);
      setResult(res);
      setSecondsRemaining(status.cooldownSeconds);
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const showResult = result !== null && secondsRemaining > 0;
  const showRefreshPrompt = secondsRemaining === 0 && (result !== null || status.question === null);
  const showQuestion = !showResult && !showRefreshPrompt && status.question !== null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🎓"
          title="Quiz éclair"
          mechanic="Une question de culture fiscale/financière vrai-faux, avec une petite récompense en cas de bonne réponse et un cooldown fixe avant la suivante — aucun coût en bien-être."
          realWorld="C'est un vrai résumé de mécaniques fiscales et financières belges (précompte, IPP, épargne...) — les explications affichées après chaque réponse sont souvent directement transposables à une vraie déclaration d'impôts."
        />
        <span>Quiz éclair</span>
      </h2>
      <div className={styles.jobCard}>
        <div>
          {showResult && result ? (
            <>
              <div className={styles.jobTitle}>{result.correct ? "✅ Bonne réponse !" : "❌ Pas tout à fait"}</div>
              <div className={styles.jobMeta}>
                La bonne réponse était : {result.correctAnswer ? "Vrai" : "Faux"} — {result.explanation}
              </div>
            </>
          ) : showQuestion && status.question ? (
            <>
              <div className={styles.jobMeta}>{status.question.topic}</div>
              <div className={styles.jobTitle}>{status.question.prompt}</div>
            </>
          ) : (
            <div className={styles.jobMeta}>{cooldownLabel(secondsRemaining)}</div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.jobActions}>
          {showQuestion ? (
            <>
              <button className={styles.apply} type="button" disabled={pending} onClick={() => handleAnswer(true)}>
                Vrai
              </button>
              <button className={styles.logout} type="button" disabled={pending} onClick={() => handleAnswer(false)}>
                Faux
              </button>
            </>
          ) : showResult && result ? (
            <div className={styles.jobSalary}>
              {result.correct ? `+${currencyFormatter.format(result.reward)}` : "0 €"}
            </div>
          ) : showRefreshPrompt ? (
            <button className={styles.apply} type="button" onClick={() => router.refresh()}>
              Nouvelle question
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
