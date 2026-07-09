import { useState } from "react";
import { Briefcase, Check, ChevronDown, X } from "lucide-react";
import type { JobDef } from "../../game/data";
import {
  CAREER_GROUPS,
  jobDefsForGroup,
  jobListing,
  promotionReadiness,
} from "../../game/careers";
import type { Character } from "../../game/types";
import { formatMoney } from "../../game/util";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

export function CareersPage({
  character,
  onApply,
  onResign,
}: {
  character: Character;
  onApply: (def: JobDef) => void;
  onResign: () => void;
}) {
  const c = character;
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Career Dashboard</h3>
        </div>
        {c.job ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Employer" value={c.job.company} />
            <Stat label="Position" value={c.job.title} accent />
            <Stat label="Salary" value={`${formatMoney(c.job.salary)}/yr`} />
            <Stat label="Performance" value={`${c.job.performance}%`} />
            <Stat label="Promotion Ready" value={`${promotionReadiness(c)}%`} accent />
            <Stat label="Burnout" value={`${c.job.burnout ?? 0}%`} />
            <Stat label="Years at Company" value={String(c.job.yearsAtCompany ?? 0)} />
            <Stat label="Years at Level" value={String(c.job.yearsAtLevel ?? 0)} />
            <Stat label="Bonus Potential" value={`${Math.round((c.job.bonusPct ?? 0) * 100)}%`} />
            <Stat label="Manager Rel." value={`${c.job.managerRel ?? 50}%`} />
            <Stat label="Coworker Rel." value={`${c.job.coworkerRel ?? 50}%`} />
            <Stat label="Career Path" value={c.job.field} />
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            You're not employed. Explore the career groups below and apply to open roles you qualify
            for.
          </p>
        )}
        {c.job && (
          <button
            onClick={onResign}
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Quit job
          </button>
        )}
      </div>

      <div className="space-y-2">
        {CAREER_GROUPS.map((g) => {
          const expanded = open === g.id;
          const jobs = jobDefsForGroup(g);
          return (
            <div key={g.id} className="glass rounded-2xl">
              <button
                onClick={() => setOpen(expanded ? null : g.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="text-sm font-bold">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Prestige {g.prestige} · Avg {g.avgSalary} · Difficulty {g.difficulty}/100
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded && (
                <div className="border-t border-white/10 p-4 pt-3">
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <p><span className="text-foreground">Education:</span> {g.requiredEducation}</p>
                    <p><span className="text-foreground">GPA:</span> {g.requiredGpa}</p>
                    <p><span className="text-foreground">Exams:</span> {g.requiredExams}</p>
                    <p><span className="text-foreground">Licenses:</span> {g.requiredLicenses}</p>
                    <p><span className="text-foreground">Schools:</span> {g.recommendedSchools}</p>
                    <p><span className="text-foreground">Work-Life Balance:</span> {g.workLifeBalance}/100</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Promotion Ladder
                    </p>
                    <p className="text-xs">{g.ladder.join(" → ")}</p>
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Open Jobs
                  </p>
                  <div className="mt-1 space-y-2">
                    {jobs.map((def) => {
                      const l = jobListing(c, def);
                      return (
                        <div
                          key={def.id}
                          className="rounded-xl border border-white/10 bg-white/5 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{def.ladder[0]}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {def.company} · {formatMoney(def.baseSalary)}/yr
                              </p>
                            </div>
                            <button
                              disabled={!l.eligible}
                              onClick={() => onApply(def)}
                              className="shrink-0 rounded-lg bg-primary/20 px-3.5 py-1.5 text-xs font-bold transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Apply
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                            {l.eligible ? (
                              <span className="flex items-center gap-1 text-[var(--success)]">
                                <Check className="h-3 w-3" /> Eligible to apply
                              </span>
                            ) : (
                              l.reasons.map((r) => (
                                <span key={r} className="flex items-center gap-1 text-[var(--destructive)]">
                                  <X className="h-3 w-3" /> {r}
                                </span>
                              ))
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Path: {def.ladder.join(" → ")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
