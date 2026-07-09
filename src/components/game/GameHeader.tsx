import { Cake, Home, RotateCcw, Wallet } from "lucide-react";
import type { Character } from "../../game/types";
import { formatMoney } from "../../game/util";
import { isDependent } from "../../game/economy";

export function GameHeader({
  character,
  onRestart,
}: {
  character: Character;
  onRestart: () => void;
}) {
  const dependent = isDependent(character);
  return (
    <div className="glass sticky top-3 z-20 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-lg font-bold">{character.name}</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {character.city}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {character.job ? `${character.job.title} · ${character.job.company}` : "No occupation"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2">
          <Cake className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold tabular-nums">{character.age}</span>
        </div>
        <div
          className="hidden items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 sm:flex"
          title="Personal cash"
        >
          <Wallet className="h-4 w-4 text-primary" />
          <span
            className={`text-sm font-bold tabular-nums ${character.money < 0 ? "text-destructive" : ""}`}
          >
            {formatMoney(character.money)}
          </span>
        </div>
        {dependent && (
          <div
            className="hidden items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 md:flex"
            title="Family net worth"
          >
            <Home className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold tabular-nums text-muted-foreground">
              {formatMoney(character.family.netWorth)}
            </span>
          </div>
        )}
        <button
          onClick={onRestart}
          title="New life"
          className="rounded-xl bg-white/5 p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
