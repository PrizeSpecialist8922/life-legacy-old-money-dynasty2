import { Brain, Heart, Smile, Sparkles } from "lucide-react";
import type { Stats } from "../../game/types";

const CONFIG: {
  key: keyof Stats;
  label: string;
  icon: typeof Heart;
  color: string;
}[] = [
  { key: "happiness", label: "Happiness", icon: Smile, color: "var(--primary)" },
  { key: "health", label: "Health", icon: Heart, color: "var(--success)" },
  { key: "smarts", label: "Smarts", icon: Brain, color: "var(--accent)" },
  { key: "looks", label: "Looks", icon: Sparkles, color: "var(--chart-5)" },
];

export function StatBars({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CONFIG.map((s) => {
        const Icon = s.icon;
        const value = stats[s.key];
        return (
          <div key={s.key} className="glass rounded-2xl p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                {s.label}
              </div>
              <span className="text-xs font-bold tabular-nums">{value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${value}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
