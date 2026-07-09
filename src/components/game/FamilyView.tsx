import { useState } from "react";
import { AlertTriangle, Baby, Crown, GraduationCap, HandHeart, Landmark } from "lucide-react";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import {
  CONSULTANTS,
  RESPONSIBILITIES,
  SCHOOLS,
  TEACHABLES,
  bringAlong,
  cutOffChild,
  ensureChildren,
  giveResponsibility,
  dateNight,
  findPartner,
  hireConsultant,
  holdFamilyMeeting,
  propose,
  tryForBaby,
  makeAmends,
  reconcileChild,
  stageSuccessionTrials,
  requestPsychReport,
  resolveAdmissions,
  resolveChildEvent,
  setAllowance,
  setSchooling,
  teachChild,
} from "../../game/upbringing";
import { visitDowager } from "../../game/oldmoney";
import type {
  AllowanceKind,
  Character,
  ConsultantKind,
  LogTone,
  SchoolingKind,
} from "../../game/types";
import { formatMoney } from "../../game/util";

type AnyResult = { character: Character; message: string; tone: LogTone; ok: boolean };
type Act = (fn: (c: Character) => AnyResult) => void;

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";
const btnDanger =
  "rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40";

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
        />
      </div>
    </div>
  );
}

export function FamilyView({ c, act }: { c: Character; act: Act }) {
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  const kids = c.children ?? [];
  const kidRels = c.relationships.filter((r) => r.type === "child" && r.alive);
  const [teachPick, setTeachPick] = useState<string>("grit");
  const [consultPick, setConsultPick] = useState<ConsultantKind>("tutor2");
  const [respPick, setRespPick] = useState<string>("chores");

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">The Upbringing</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          You don't play your children — you shape them, with money, staff, and the one thing that
          can't be delegated: your time. What you build in them is the real estate plan. Energy:{" "}
          {energyLeft}/{ACTIONS_PER_YEAR}
        </p>
      </div>

      {c.dowager?.alive && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">The Dowager — {c.dowager.name}</h3>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Age {c.dowager.age} · regard for you: {c.dowager.relationship}/100 ·{" "}
            {c.dowager.yearsSinceVisit === 0
              ? "visited this year"
              : `${c.dowager.yearsSinceVisit} year(s) since you called on her`}
          </p>
          <button className={btn} onClick={() => act((ch) => visitDowager(ch, trySpendEnergy))}>
            Take Tea With Her (1⚡) — introductions, standing, and if she trusts you, the family's
            real history
          </button>
        </div>
      )}

      {(() => {
        const partner = c.relationships.find((x) => x.type === "partner" && x.alive);
        return (
          <div className="glass rounded-2xl p-4">
            <p className="mb-2 text-xs text-muted-foreground">
              {partner
                ? kidRels.length === 0
                  ? `You and ${partner.name} have no children yet. Dynasties are made of people.`
                  : `${kidRels.length} child(ren) with ${partner.name}. There is always room for a spare.`
                : "Dynasties need two founders. Put yourself out there — looks, networking, and fame all help."}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {!partner && (
                <button
                  className={btn}
                  onClick={() => act((ch) => findPartner(ch, trySpendEnergy))}
                >
                  Put Yourself Out There (1⚡)
                </button>
              )}
              {partner && (
                <>
                  <span className="w-full text-[11px] text-muted-foreground">
                    {partner.name} · age {partner.age} · relationship {partner.relationship}/100
                  </span>
                  <button
                    className={btn}
                    onClick={() => act((ch) => dateNight(ch, trySpendEnergy))}
                  >
                    Date Night (1⚡)
                  </button>
                  <button
                    className={btn}
                    disabled={partner.relationship < 65}
                    onClick={() => act((ch) => propose(ch, trySpendEnergy))}
                  >
                    Propose (1⚡){partner.relationship < 65 ? " — needs 65+" : ""}
                  </button>
                </>
              )}
              <button
                className={btn}
                disabled={!partner}
                onClick={() => act((ch) => tryForBaby(ch, trySpendEnergy))}
              >
                Try for a Baby (1⚡){c.age > 30 ? " — odds fade with age" : ""}
              </button>
            </div>
          </div>
        );
      })()}

      {kidRels.map((r) => {
        const k =
          kids.find((x) => x.relId === r.id) ??
          ensureChildren(structuredClone(c)).find((x) => x.relId === r.id)!;
        const report = requestPsychReport(c, r.id);
        const adult = r.age >= 18;
        return (
          <div key={r.id} className={`glass rounded-2xl p-4 ${k?.cutOff ? "opacity-60" : ""}`}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {r.name}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · age {r.age}
                  {k?.cutOff ? " · CUT OFF — portrait faces the wall" : ""}
                </span>
              </h3>
              {c.will?.heirId === r.id && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  HEIR
                </span>
              )}
            </div>

            {k && (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
                  <MiniBar label="Academics" value={k.academics} />
                  <MiniBar label="Discipline" value={k.discipline} />
                  <MiniBar label="Grit" value={k.grit} />
                  <MiniBar label="Worldliness" value={k.worldliness} />
                  <MiniBar label="Spoiled" value={k.spoiled} />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {k.schooling
                    ? `School: ${SCHOOLS[k.schooling].label}`
                    : r.age >= 4 && !adult
                      ? "Not enrolled anywhere — decide"
                      : "—"}
                  {k.consultants.length
                    ? ` · Staff: ${k.consultants.map((x) => CONSULTANTS[x].label).join(", ")}`
                    : ""}
                  {k.taughtSkills.length ? ` · Taught: ${k.taughtSkills.join(", ")}` : ""}
                  {k.brokerage !== undefined ? ` · Brokerage: ${formatMoney(k.brokerage)}` : ""}
                  {` · Responsibility rungs: ${k.responsibilityLevel}`}
                </p>
                <p className="mt-1 text-[11px] italic text-muted-foreground">
                  {report ??
                    "Their inner life is a closed book to you. (A child psychologist can read it.)"}
                </p>

                {k.pendingEvent && (
                  <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <p className="text-xs font-bold">{k.pendingEvent.title}</p>
                    </div>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      {k.pendingEvent.description}
                    </p>
                    <div className="space-y-1">
                      {k.pendingEvent.options.map((o, i) => (
                        <button
                          key={i}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[11px] transition hover:bg-white/10"
                          onClick={() => act((ch) => resolveChildEvent(ch, r.id, i))}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!adult && !k.cutOff && (
                  <div className="mt-2 space-y-2">
                    {r.age >= 4 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                        {(Object.keys(SCHOOLS) as SchoolingKind[]).map((sk) => (
                          <button
                            key={sk}
                            title={`${SCHOOLS[sk].blurb} — ${SCHOOLS[sk].fee ? `$${SCHOOLS[sk].fee.toLocaleString()}/yr` : "free"}`}
                            className={k.schooling === sk ? btn : btnGhost}
                            disabled={k.schooling === sk}
                            onClick={() => act((ch) => setSchooling(ch, r.id, sk, trySpendEnergy))}
                          >
                            {SCHOOLS[sk].label}
                            {SCHOOLS[sk].fee ? ` ($${Math.round(SCHOOLS[sk].fee / 1000)}k)` : ""}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        className="rounded-lg border border-white/10 bg-background px-2 py-1.5 text-[11px]"
                        value={consultPick}
                        onChange={(e) => setConsultPick(e.target.value as ConsultantKind)}
                      >
                        {(Object.keys(CONSULTANTS) as ConsultantKind[]).map((ck) => (
                          <option key={ck} value={ck}>
                            {CONSULTANTS[ck].label} — ${CONSULTANTS[ck].fee.toLocaleString()}/yr
                            {CONSULTANTS[ck].dark ? " ⚠" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        className={CONSULTANTS[consultPick].dark ? btnDanger : btn}
                        onClick={() =>
                          act((ch) => hireConsultant(ch, r.id, consultPick, trySpendEnergy))
                        }
                      >
                        Hire (1⚡)
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {CONSULTANTS[consultPick].blurb}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        className="rounded-lg border border-white/10 bg-background px-2 py-1.5 text-[11px]"
                        value={teachPick}
                        onChange={(e) => setTeachPick(e.target.value)}
                      >
                        {TEACHABLES.filter((t) => t.available(c)).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className={btn}
                        onClick={() => act((ch) => teachChild(ch, r.id, teachPick, trySpendEnergy))}
                      >
                        Teach Them Yourself (1⚡)
                      </button>
                      <button
                        className={btn}
                        onClick={() => act((ch) => bringAlong(ch, r.id, trySpendEnergy))}
                      >
                        Bring Them Along (1⚡)
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        className="rounded-lg border border-white/10 bg-background px-2 py-1.5 text-[11px]"
                        value={respPick}
                        onChange={(e) => setRespPick(e.target.value)}
                      >
                        {RESPONSIBILITIES.filter(
                          (x) =>
                            r.age >= x.minAge &&
                            r.age <= x.maxAge &&
                            !k.responsibilitiesDone.includes(x.id),
                        ).map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.label}
                            {x.dark ? " ⚠" : ""} — {x.blurb}
                          </option>
                        ))}
                      </select>
                      <button
                        className={btn}
                        onClick={() =>
                          act((ch) => giveResponsibility(ch, r.id, respPick, trySpendEnergy))
                        }
                      >
                        Give Responsibility (1⚡)
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Allowance:
                      </span>
                      {(["none", "unconditional", "earned", "invested"] as AllowanceKind[]).map(
                        (a) => (
                          <button
                            key={a}
                            className={k.allowance === a ? btn : btnGhost}
                            onClick={() => act((ch) => setAllowance(ch, r.id, a))}
                          >
                            {a}
                          </button>
                        ),
                      )}
                    </div>

                    {r.age >= 17 && !k.admissionsResolved && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                        <p className="mb-1.5 text-xs font-bold">
                          The Admissions War — age 17, one shot
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            className={btn}
                            onClick={() =>
                              act((ch) => resolveAdmissions(ch, r.id, "merit", trySpendEnergy))
                            }
                          >
                            On Merit (their numbers)
                          </button>
                          <button
                            className={btn}
                            onClick={() =>
                              act((ch) => resolveAdmissions(ch, r.id, "legacy", trySpendEnergy))
                            }
                          >
                            Legacy (pedigree/patronage)
                          </button>
                          <button
                            className={btnGhost}
                            onClick={() =>
                              act((ch) => resolveAdmissions(ch, r.id, "donation", trySpendEnergy))
                            }
                          >
                            The Donation ($2M)
                          </button>
                          <button
                            className={btnDanger}
                            onClick={() =>
                              act((ch) => resolveAdmissions(ch, r.id, "fraud", trySpendEnergy))
                            }
                          >
                            The 'Rowing Photos' ⚠
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!k.cutOff && (k.resentment >= 15 || k.affection <= 60) && (
                  <button
                    className={`${btn} mt-2 mr-1.5`}
                    onClick={() => act((ch) => makeAmends(ch, r.id, trySpendEnergy))}
                  >
                    Make Amends (1⚡) — the long work of repair
                  </button>
                )}
                {adult && !k.cutOff && (
                  <button
                    className={`${btnDanger} mt-2`}
                    onClick={() => act((ch) => cutOffChild(ch, r.id))}
                  >
                    Cut Them Off — strike from the will, turn the portrait to the wall
                  </button>
                )}
                {k.cutOff && (
                  <button
                    className={`${btn} mt-2`}
                    onClick={() => act((ch) => reconcileChild(ch, r.id, trySpendEnergy))}
                  >
                    The Reconciliation (1⚡) — turn the portrait back, in front of everyone
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {kidRels.filter((r) => r.age >= 13).length >= 2 && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">The Family Council</h3>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Minutes are kept. Grievances surface. Old money calls this hygiene.
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <button
              className={btn}
              onClick={() => act((ch) => holdFamilyMeeting(ch, "business", trySpendEnergy))}
            >
              Review the Business (1⚡)
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => holdFamilyMeeting(ch, "grievances", trySpendEnergy))}
            >
              Open the Floor (1⚡)
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => holdFamilyMeeting(ch, "succession", trySpendEnergy))}
            >
              Speak of Succession (1⚡)
            </button>
            <button
              className={btnGhost}
              onClick={() => act((ch) => holdFamilyMeeting(ch, "theMatter", trySpendEnergy))}
            >
              Table The Matter (1⚡)
            </button>
          </div>
          <p className="mb-1 mt-3 text-xs font-bold">The Succession Trials</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              className={btn}
              onClick={() => act((ch) => stageSuccessionTrials(ch, false, trySpendEnergy))}
            >
              Open Trials (1⚡) — real charges, public standings
            </button>
            <button
              className={btnDanger}
              onClick={() => act((ch) => stageSuccessionTrials(ch, true, trySpendEnergy))}
            >
              Covert Assessment (1⚡) — they don't know it's a test ⚠
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <HandHeart className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">The Rules of the House</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Consultants buy competence; only your time buys connection. Responsibilities survived are
          the one cure for the Third-Generation Curse. A year with no attention is a year on their
          ledger — and the reading of the will is where ledgers settle.
        </p>
      </div>
    </div>
  );
}
