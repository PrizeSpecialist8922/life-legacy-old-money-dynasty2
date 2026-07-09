import { AnimatePresence, motion } from "motion/react";
import type { GameEvent } from "../../game/types";

export function EventModal({
  event,
  onChoose,
}: {
  event: GameEvent | null;
  onChoose: (index: number) => void;
}) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong w-full max-w-md rounded-3xl p-6"
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Life Event
            </div>
            <h3 className="text-xl font-bold">{event.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {event.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => onChoose(i)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium transition hover:border-primary/60 hover:bg-primary/10 active:scale-[0.99]"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
