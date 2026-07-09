import { Briefcase, Lock } from "lucide-react";
import {
  INTERNSHIPS,
  INTERNSHIP_MAX_AGE,
  internshipChance,
  internshipEligibility,
} from "../../game/internships";
import { ACTIONS_PER_YEAR } from "../../game/engine";
import type { Character } from "../../game/types";

/**
 * Dedicated Internships page — separate from Jobs and Education. Open during
 * high school (15+) and college/graduate school; locked after age 30.
 */
export function InternshipsPage({
  character,
  onApply,
}: {
  character: Character;
  onApply: (id: string) => void;
}) {
  const c = character;
  const elig = internshipEligibility(c);
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  const history = c.edu.internships ?? [];
  const returnOffers = history.filter((i) => i.outcome === "return" || i.outcome === "fulltime");
  const jobOffers = c.jobOffers ?? [];

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Internships</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Internships build your resume, network, and job prospects. Applications consider your GPA,
          school prestige, leadership, research, awards, recommendation letters, and network.
        </p>
        {elig.eligible && (
          <p className="mt-2 text-xs text-muted-foreground">
            Energy this year: <span className="font-bold text-primary">{energyLeft}</span> /{" "}
            {ACTIONS_PER_YEAR}
          </p>
        )}
      </div>

      {!elig.eligible ? (
        <div className="glass rounded-2xl p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">
            {c.age > INTERNSHIP_MAX_AGE
              ? "You are no longer eligible for traditional student internships."
              : "Internships aren't open to you yet."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {c.age > INTERNSHIP_MAX_AGE
              ? "That chapter has closed — career actions and networking are your tools now."
              : (elig.reason ?? "")}
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-4">
          <h4 className="mb-2 text-sm font-bold">
            {elig.level === "high" ? "High School Programs" : "College & Graduate Programs"}
          </h4>
          <div className="space-y-2">
            {INTERNSHIPS.filter((d) => d.level === elig.level).map((d) => {
              const { probability } = internshipChance(c, d);
              return (
                <div key={d.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.org} · {d.field} · Prestige {d.prestige}
                      </p>
                    </div>
                    <button
                      disabled={energyLeft <= 0}
                      onClick={() => onApply(d.id)}
                      className="shrink-0 rounded-lg bg-primary/20 px-3.5 py-1.5 text-xs font-bold transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{d.blurb}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Min GPA {d.minGpa.toFixed(1)} · Your odds:{" "}
                    <span
                      className={`font-bold ${probability >= 0.5 ? "text-[var(--success)]" : probability >= 0.25 ? "text-foreground" : "text-[var(--destructive)]"}`}
                    >
                      {Math.round(probability * 100)}%
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h4 className="mb-2 text-sm font-bold">Internship History</h4>
          <ul className="space-y-1.5">
            {[...history].reverse().map((i, idx) => (
              <li key={idx} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                <span className="font-semibold">{i.name}</span> — {i.org} (age {i.age})
                <span className="text-muted-foreground">
                  {i.outcome === "fulltime" && " · full-time offer"}
                  {i.outcome === "return" && " · return offer"}
                  {i.recLetter && " · recommendation letter"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(returnOffers.length > 0 || jobOffers.length > 0) && (
        <div className="glass rounded-2xl p-4">
          <h4 className="mb-2 text-sm font-bold">Return &amp; Full-Time Offers</h4>
          <ul className="space-y-1.5">
            {returnOffers.map((i, idx) => (
              <li key={`r${idx}`} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                <span className="font-semibold">{i.org}</span> — {i.name}
                <span className="text-muted-foreground">
                  {i.outcome === "fulltime" ? " · full-time offer" : " · return internship offer"}
                  {i.recLetter && " · recommendation letter"}
                </span>
              </li>
            ))}
            {jobOffers.map((o, idx) => (
              <li key={`j${idx}`} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                <span className="font-semibold">{o.company}</span> — {o.title}
                <span className="text-muted-foreground">
                  {" "}· ${o.salary.toLocaleString()}/yr · expires age {o.expiresAge}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Accept it from the Careers tab.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
