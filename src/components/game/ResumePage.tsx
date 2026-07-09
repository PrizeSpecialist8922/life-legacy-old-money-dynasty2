import { FileText } from "lucide-react";
import { buildResume, resumeScore } from "../../game/resume";
import type { Character } from "../../game/types";

/**
 * Auto-generated resume. Not cosmetic: the same resumeScore shown here is
 * evaluated by internships, elite recruiters, and graduate programs.
 */
export function ResumePage({ character }: { character: Character }) {
  const sections = buildResume(character);
  const score = resumeScore(character);
  const band =
    score >= 75 ? "Outstanding" : score >= 55 ? "Strong" : score >= 35 ? "Developing" : "Early";

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-bold">{character.name}</h3>
              <p className="text-xs text-muted-foreground">
                {character.city}, {character.country}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">{score}</p>
            <p className="text-[11px] text-muted-foreground">Resume strength · {band}</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Employers, elite recruiters, internships, and graduate schools all evaluate this resume.
        </p>
      </div>

      {sections.length === 0 && (
        <div className="glass rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">
            Your resume is empty for now — study, join clubs, take on leadership, and complete
            internships to build it.
          </p>
        </div>
      )}

      {sections.map((s) => (
        <div key={s.title} className="glass rounded-2xl p-4">
          <h4 className="mb-2 text-sm font-bold">{s.title}</h4>
          <ul className="space-y-1.5">
            {s.items.map((item, i) => (
              <li key={i} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
