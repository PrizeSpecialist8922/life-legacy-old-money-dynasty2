import { AnimatePresence, motion } from "motion/react";
import type { LogTone } from "../../game/types";

export interface ActionResultInfo {
  text: string;
  tone: LogTone | string;
}

const toneLabel: Record<string, string> = {
  good: "Success",
  bad: "Setback",
  milestone: "Milestone",
  neutral: "Result",
};

/**
 * Popup shown after the player performs an action (activity, exam, job
 * application, etc.), matching the life-event popup style.
 */
export function ResultModal({
  result,
  onDismiss,
}: {
  result: ActionResultInfo | null;
  onDismiss: () => void;
}) {
  const color =
    result?.tone === "good" || result?.tone === "milestone"
      ? "var(--success)"
      : result?.tone === "bad"
        ? "var(--destructive)"
        : "var(--primary)";

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
              {toneLabel[String(result.tone)] ?? "Result"}
            </div>
            <p className="text-base font-medium leading-relaxed">{result.text}</p>
            <button
              onClick={onDismiss}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
