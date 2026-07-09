import { useMemo, useState } from "react";
import { CheckCircle2, FileText, GraduationCap, Home, Landmark } from "lucide-react";
import { MAJORS } from "../../game/data";
import { collegeOptions } from "../../game/engine";
import {
  LIVING_OPTIONS,
  buildAidLetter,
  buildScholarships,
  greekAvailable,
} from "../../game/college";
import type { AidLetter, Character, LivingArrangement } from "../../game/types";
import { formatMoney } from "../../game/util";

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${strong ? "font-bold" : "font-medium"} ${accent ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function CollegeAdmissions({
  character,
  onEnroll,
  onFafsa,
  onAppeal,
}: {
  character: Character;
  onEnroll: (letter: AidLetter) => void;
  onFafsa: () => void;
  onAppeal: () => void;
}) {
  const c = character;
  const [major, setMajor] = useState(MAJORS[0]);
  const [living, setLiving] = useState<LivingArrangement>("dorm");
  const [offer, setOffer] = useState<AidLetter | null>(null);

  const scholarships = useMemo(() => buildScholarships(c), [c]);
  const options = collegeOptions(c);
  const fafsaFiled = c.fafsa?.filed;

  function viewOffer(uniDef: (typeof options)[number]["def"]) {
    const chosenLiving: LivingArrangement =
      living === "greek" && !greekAvailable(uniDef.prestige) ? "dorm" : living;
    setOffer(buildAidLetter(c, uniDef, chosenLiving, scholarships, major));
  }

  return (
    <div className="space-y-3">
      {/* FAFSA / Financial Aid Application */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Financial Aid Application (FAFSA)</p>
        </div>
        {!fafsaFiled ? (
          <>
            <div className="mb-2 space-y-0.5 text-xs text-muted-foreground">
              <p>Household income: {formatMoney(c.family.income)}</p>
              <p>Parent assets: {formatMoney(c.family.savings + c.family.investments)}</p>
              <p>Household size: {c.family.householdSize}</p>
            </div>
            <button
              onClick={onFafsa}
              className="w-full rounded-lg bg-primary/20 py-2 text-xs font-semibold transition hover:bg-primary/30"
            >
              Submit FAFSA
            </button>
          </>
        ) : (
          <div className="text-xs">
            <Row label="Est. Family Contribution" value={`${formatMoney(c.fafsa!.efc)}/yr`} />
            <Row
              label="Need-Based Grants"
              value={`${formatMoney(c.fafsa!.grantEligible)}/yr`}
              accent
            />
            <Row
              label="Federal Loan Eligibility"
              value={`${formatMoney(c.fafsa!.loanEligible)}/yr`}
            />
            <button
              onClick={onAppeal}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/10"
            >
              Appeal Financial Aid
            </button>
          </div>
        )}
      </div>

      {/* 529 / parent savings */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
        <div className="mb-1 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Parent College Savings</p>
        </div>
        {c.family.collegeSavings > 0 ? (
          <p className="text-muted-foreground">
            Your parents have a{" "}
            {c.family.savingsPlanType === "529"
              ? "529 College Savings Plan"
              : "dedicated education fund"}{" "}
            worth{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(c.family.collegeSavings)}
            </span>
            . It will be used before student loans.
          </p>
        ) : (
          <p className="text-muted-foreground">Your parents did not set aside college savings.</p>
        )}
      </div>

      {/* Major + living */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Major</label>
          <select
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary/60"
          >
            {MAJORS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Living Arrangement
          </label>
          <select
            value={living}
            onChange={(e) => setLiving(e.target.value as LivingArrangement)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary/60"
          >
            {LIVING_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} — {formatMoney(l.housing)}/yr
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scholarships preview */}
      {scholarships.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            Scholarships You Qualify For
          </p>
          <ul className="space-y-0.5 text-xs">
            {scholarships.map((s) => (
              <li key={s.name} className="flex justify-between">
                <span>{s.name}</span>
                <span className="font-semibold text-primary">{formatMoney(s.amount)}/yr</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Your GPA is {c.gpa.toFixed(2)}. Admission depends on smarts + GPA. Tap a school to see its
        full offer.
      </p>

      {/* College list */}
      <div className="space-y-2">
        {options.map((o) => (
          <button
            key={o.name}
            disabled={!o.admitted}
            onClick={() => viewOffer(o.def)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <div>
              <p className="text-sm font-semibold">{o.name}</p>
              <p className="text-xs text-muted-foreground">
                {o.admitted ? "You qualify — view offer" : "Grades too low"} · Prestige {o.prestige}
              </p>
            </div>
            <span className="text-xs font-bold text-primary">{formatMoney(o.cost)}/yr</span>
          </button>
        ))}
      </div>

      {/* Offer modal */}
      {offer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOffer(null)}
        >
          <div
            className="glass-strong max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-bold leading-tight">{offer.university}</h3>
                <p className="text-xs text-muted-foreground">Bachelor's in {offer.major}</p>
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2 rounded-lg bg-[var(--success)]/15 px-3 py-1.5 text-sm font-semibold text-[var(--success)]">
              <CheckCircle2 className="h-4 w-4" /> Accepted
            </div>

            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Annual Cost of Attendance
              </p>
              <Row label="Tuition" value={formatMoney(offer.tuition)} />
              <Row label="Housing" value={formatMoney(offer.housing)} />
              <Row label="Books" value={formatMoney(offer.books)} />
              <Row label="Fees" value={formatMoney(offer.fees)} />
              <div className="my-1 border-t border-white/10" />
              <Row label="Total Cost" value={formatMoney(offer.totalCost)} strong />
            </div>

            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Financial Aid
              </p>
              <Row label="Scholarships" value={`−${formatMoney(offer.scholarshipsTotal)}`} accent />
              <Row label="Need-Based Grant" value={`−${formatMoney(offer.grants)}`} accent />
              <Row
                label="Parent Contribution"
                value={`−${formatMoney(offer.parentContribution)}`}
              />
              <Row label="Parent College Savings" value={`−${formatMoney(offer.collegeSavings)}`} />
              <Row label="Student Loans" value={`−${formatMoney(offer.loans)}`} />
              <div className="my-1 border-t border-white/10" />
              <Row
                label="Net Cost (out of pocket)"
                value={formatMoney(offer.netCost)}
                strong
                accent
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{offer.parentDecision}.</p>
            </div>

            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Home className="h-3.5 w-3.5" />{" "}
              {LIVING_OPTIONS.find((l) => l.id === offer.living)?.label}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOffer(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Decline
              </button>
              <button
                onClick={() => {
                  onEnroll(offer);
                  setOffer(null);
                }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-105"
              >
                Accept & Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
