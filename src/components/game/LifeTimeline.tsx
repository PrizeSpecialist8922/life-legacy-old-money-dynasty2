import { useEffect, useRef } from "react";
import type { Character, LogTone } from "../../game/types";

const toneColor: Record<LogTone, string> = {
  neutral: "var(--muted-foreground)",
  good: "var(--success)",
  bad: "var(--destructive)",
  milestone: "var(--primary)",
};

export function LifeTimeline({ character }: { character: Character }) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevAge = useRef(-1);
  // Keep the log pinned to the latest entry by scrolling ONLY the log's own
  // list. scrollIntoView scrolled every ancestor too, which yanked the whole
  // page down to the timeline on each age-up.
  useEffect(() => {
    if (character.age !== prevAge.current) {
      prevAge.current = character.age;
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [character.age]);

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Life Timeline</h3>
      <div ref={listRef} className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {character.log.map((entry, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm animate-in fade-in"
          >
            <span
              className="mt-0.5 shrink-0 text-xs font-bold tabular-nums"
              style={{ color: toneColor[entry.tone] }}
            >
              {entry.age}
            </span>
            <span
              className={
                entry.tone === "milestone" ? "font-medium text-foreground" : "text-muted-foreground"
              }
            >
              {entry.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
