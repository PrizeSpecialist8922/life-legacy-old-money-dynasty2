import {
  Briefcase,
  DollarSign,
  GraduationCap,
  HeartPulse,
  ShieldAlert,
  User,
  Users,
} from "lucide-react";
import { netWorth } from "../../game/engine";
import { gpaToPercent } from "../../game/education";
import type { Character } from "../../game/types";
import { formatMoney } from "../../game/util";

const TIER_LABEL: Record<string, string> = {
  poor: "Poor",
  working: "Working class",
  middle: "Middle class",
  affluent: "Affluent",
  wealthy: "Wealthy",
};

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`font-semibold ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

export function ProfilePage({ character }: { character: Character }) {
  const c = character;
  const parents = c.relationships.filter((r) => r.type === "mother" || r.type === "father");
  const siblings = c.relationships.filter((r) => r.type === "sibling");
  const assetsValue = c.assets.reduce((s, a) => s + a.value, 0);
  const scoreList = [
    c.scores.sat && `SAT ${c.scores.sat}`,
    c.scores.act && `ACT ${c.scores.act}`,
    c.scores.lsat && `LSAT ${c.scores.lsat}`,
    c.scores.gmat && `GMAT ${c.scores.gmat}`,
    c.scores.mcat && `MCAT ${c.scores.mcat}`,
    c.scores.bar && `Bar: ${c.scores.bar}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      <Section title="Identity" icon={User}>
        <Row label="Name" value={c.name} />
        <Row label="Age" value={`${c.age}`} />
        <Row label="Birthday" value={c.birthday} />
        <Row label="Gender" value={c.gender} />
        <Row label="Country" value={c.country} />
        <Row label="City" value={c.city} />
        <Row label="Citizenship" value={c.citizenship} />
      </Section>

      <Section title="Education" icon={GraduationCap}>
        <Row label="GPA" value={`${c.gpa.toFixed(2)} (${gpaToPercent(c.gpa)}%)`} accent />
        <Row label="School" value={c.edu.school} />
        <Row label="Stage" value={c.education} />
        <Row label="Degrees" value={c.edu.degrees.length ? c.edu.degrees.join(", ") : "None"} />
        {c.university && <Row label="University" value={c.university} />}
        {c.major && <Row label="Major" value={c.major} />}
        <div className="col-span-2">
          <Row label="Test Scores" value={scoreList || "None yet"} />
        </div>
      </Section>

      <Section title="Family" icon={Users}>
        <Row label="Family Wealth" value={TIER_LABEL[c.family.tier] ?? c.family.tier} accent />
        <Row label="Household Income" value={formatMoney(c.family.income)} />
        <div className="col-span-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Parents</span>
          <div className="mt-0.5 space-y-0.5">
            {parents.length ? (
              parents.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span className="font-semibold">
                    {p.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({p.type}
                      {p.alive ? "" : ", deceased"})
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Bond {p.relationship}%</span>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No living parents.</span>
            )}
          </div>
        </div>
        <div className="col-span-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Siblings
          </span>
          <div className="mt-0.5 space-y-0.5">
            {siblings.length ? (
              siblings.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">Bond {p.relationship}%</span>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">None.</span>
            )}
          </div>
        </div>
      </Section>

      <Section title="Finances" icon={DollarSign}>
        <Row label="Personal Cash" value={formatMoney(c.money)} accent />
        <Row label="Investments" value={formatMoney(c.family.investments)} />
        <Row label="Assets" value={formatMoney(assetsValue)} />
        <Row label="Liabilities" value={formatMoney(c.family.debt)} />
        <Row label="Net Worth" value={formatMoney(netWorth(c))} />
        <Row label="Family Net Worth" value={formatMoney(c.family.netWorth)} />
      </Section>

      <Section title="Health" icon={HeartPulse}>
        <Row label="Physical Health" value={`${c.stats.health}%`} />
        <Row label="Mental Health" value={`${c.mentalHealth}%`} />
        <Row label="Fitness" value={`${c.fitness}%`} />
        <Row label="Insurance" value={c.insurance ? "Covered" : "Uninsured"} />
        <div className="col-span-2">
          <Row label="Illnesses" value={c.illnesses.length ? c.illnesses.join(", ") : "None"} />
        </div>
      </Section>

      <Section title="Career" icon={Briefcase}>
        {c.job ? (
          <>
            <Row label="Occupation" value={c.job.title} />
            <Row label="Employer" value={c.job.company} />
            <Row label="Salary" value={formatMoney(c.job.salary)} accent />
            <Row label="Performance" value={`${c.job.performance}%`} />
            <Row label="Level" value={`${c.job.level + 1}`} />
          </>
        ) : (
          <div className="col-span-2 text-sm text-muted-foreground">Not currently employed.</div>
        )}
      </Section>

      <Section title="Reputation" icon={ShieldAlert}>
        <Row label="Fame" value={`${c.fame}`} />
        <Row
          label="Criminal Record"
          value={c.criminalRecord > 0 ? `${c.criminalRecord} offense(s)` : "Clean"}
        />
        <Row label="Political Influence" value={`${c.politicalInfluence}`} />
        <Row label="Business Reputation" value={`${c.businessReputation}`} />
      </Section>
    </div>
  );
}
