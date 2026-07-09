import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { QuizQuestion } from "../../game/quiz";

export interface QuizConfig {
  title: string;
  subtitle?: string;
  questions: QuizQuestion[];
  kind: string; // identifier passed back on complete
}

export function QuizModal({
  config,
  onComplete,
  onCancel,
}: {
  config: QuizConfig | null;
  onComplete: (kind: string, correctRatio: number) => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {config && (
        <QuizInner
          key={config.title + config.kind}
          config={config}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )}
    </AnimatePresence>
  );
}

function QuizInner({
  config,
  onComplete,
  onCancel,
}: {
  config: QuizConfig;
  onComplete: (kind: string, correctRatio: number) => void;
  onCancel: () => void;
}) {
  const questions = config.questions;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const ratio = useMemo(
    () => (questions.length ? correct / questions.length : 0),
    [correct, questions.length],
  );

  function choose(i: number) {
    if (locked) return;
    setSelected(i);
    setLocked(true);
    if (i === q.answer) setCorrect((c) => c + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((n) => n + 1);
    setSelected(null);
    setLocked(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-strong w-full max-w-md rounded-3xl p-5"
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
      >
        {!done ? (
          <>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold">{config.title}</h3>
              <span className="text-xs text-muted-foreground">
                {index + 1} / {questions.length}
              </span>
            </div>
            {config.subtitle && (
              <p className="mb-3 text-xs text-muted-foreground">{config.subtitle}</p>
            )}

            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((index + (locked ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>

            <p className="mb-3 text-sm font-semibold">{q.q}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answer;
                const isSelected = i === selected;
                let cls = "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/10";
                if (locked && isAnswer) cls = "border-[var(--success)] bg-[var(--success)]/15";
                else if (locked && isSelected && !isAnswer)
                  cls = "border-[var(--destructive)] bg-[var(--destructive)]/15";
                return (
                  <button
                    key={i}
                    disabled={locked}
                    onClick={() => choose(i)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${cls}`}
                  >
                    <span>{opt}</span>
                    {locked && isAnswer && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    )}
                    {locked && isSelected && !isAnswer && (
                      <XCircle className="h-4 w-4 text-[var(--destructive)]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onCancel}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Quit
              </button>
              <button
                onClick={next}
                disabled={!locked}
                className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-40"
              >
                {index + 1 >= questions.length ? "See Results" : "Next"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <h3 className="text-lg font-bold">{config.title} Results</h3>
            <p className="mt-2 text-4xl font-extrabold text-primary">{Math.round(ratio * 100)}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You answered {correct} of {questions.length} correctly.
            </p>
            <button
              onClick={() => onComplete(config.kind, ratio)}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-105"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              Submit
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
