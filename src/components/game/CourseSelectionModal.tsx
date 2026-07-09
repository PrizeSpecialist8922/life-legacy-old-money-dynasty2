import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { IB_COURSES, IB_GROUPS, validateIBSelection } from "../../game/courses";
import type { IBPick } from "../../game/courses";
import type { CourseLevel } from "../../game/types";

/**
 * Full-screen modal shown when the player enters the IB Diploma Programme.
 * They must choose exactly six courses — 3 Higher Level and 3 Standard
 * Level — from the school's course offerings guide.
 */
export function CourseSelectionModal({
  open,
  onConfirm,
}: {
  open: boolean;
  onConfirm: (picks: IBPick[]) => void;
}) {
  const [picks, setPicks] = useState<Record<string, CourseLevel>>({});

  const pickList: IBPick[] = useMemo(
    () => Object.entries(picks).map(([id, level]) => ({ id, level })),
    [picks],
  );
  const validation = useMemo(() => validateIBSelection(pickList), [pickList]);
  const hl = pickList.filter((p) => p.level === "HL").length;
  const sl = pickList.filter((p) => p.level === "SL").length;

  function toggle(id: string, level: CourseLevel) {
    setPicks((prev) => {
      const next = { ...prev };
      if (next[id] === level) {
        delete next[id]; // tap again to deselect
      } else {
        next[id] = level;
      }
      return next;
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-strong flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl"
          >
            <div className="border-b border-white/10 p-5 pb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                IB Diploma Programme
              </div>
              <h3 className="text-xl font-bold">Choose Your Courses</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Select exactly 6 courses from the course offerings guide — 3 Higher Level (HL) and 3
                Standard Level (SL).
              </p>
              <div className="mt-3 flex gap-2 text-xs font-bold">
                <span
                  className={`rounded-full px-2.5 py-1 ${hl === 3 ? "bg-primary/25 text-primary" : "bg-white/10"}`}
                >
                  HL {hl}/3
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 ${sl === 3 ? "bg-accent/25 text-accent" : "bg-white/10"}`}
                >
                  SL {sl}/3
                </span>
              </div>
            </div>

            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
              {IB_GROUPS.map((g) => (
                <div key={g.group}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label}
                  </p>
                  <div className="space-y-1.5">
                    {IB_COURSES.filter((cd) => cd.group === g.group).map((cd) => {
                      const chosen = picks[cd.id];
                      return (
                        <div
                          key={cd.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                            chosen
                              ? "border-primary/50 bg-primary/10"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <span className="text-sm font-medium">{cd.name}</span>
                          <div className="flex shrink-0 gap-1.5">
                            {(["HL", "SL"] as CourseLevel[]).map((lvl) =>
                              cd.levels.includes(lvl) ? (
                                <button
                                  key={lvl}
                                  onClick={() => toggle(cd.id, lvl)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                    chosen === lvl
                                      ? lvl === "HL"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-accent text-accent-foreground"
                                      : "bg-white/10 text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ) : null,
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-5 pt-4">
              <div className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {validation.requirements.map((r) => (
                  <div key={r.label} className="flex items-center gap-1.5 text-xs">
                    {r.met ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={r.met ? "text-foreground" : "text-muted-foreground"}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
              <button
                disabled={!validation.ok}
                onClick={() => onConfirm(pickList)}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm Course Selection
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
