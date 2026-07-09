import { useState } from "react";
import {
  AlertTriangle,
  DoorOpen,
  Dumbbell,
  Flame,
  Gavel,
  HandCoins,
  Landmark,
  Lock,
  Shield,
  Skull,
  Users,
  Droplets,
} from "lucide-react";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import {
  CRIME_JOBS,
  commitCrime,
  jobSuccessChance,
  joinSyndicate,
  launderThroughBusiness,
  layLow,
  leaveTheLife,
  prisonAction,
  rankLabel,
  recruitCrew,
  requestParole,
  resolveCrimeEvent,
  LAWYERS,
  lawyerDef,
  lawyerContactBonus,
  effectiveLawyerFee,
  hireLawyer,
  trialOptions,
  trialStep,
  trialStageTitle,
  currentPleaOffer,
  takePlea,
  turnInformant,
  startHeist,
  resolveHeist,
  APPROACHES,
  spendDirty,
  startRacket,
  trialConvictionChance,
} from "../../game/crime";
import type { Character, LogTone } from "../../game/types";
import { formatMoney } from "../../game/util";

type AnyResult = { character: Character; message: string; tone: LogTone; ok: boolean };
type Act = (fn: (c: Character) => AnyResult) => void;

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";
const btnDanger =
  "rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40";

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${warn ? "text-red-400" : ""}`}>{value}</p>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${color ?? "bg-primary"}`}
          style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Skull;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      {subtitle && <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}

export function CrimeView({ c, act }: { c: Character; act: Act }) {
  const cr = c.crime;
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  const [launderBiz, setLaunderBiz] = useState<string>("");

  if (c.age < 16) {
    return (
      <Section
        icon={Skull}
        title="Crime"
        subtitle="The streets don't recruit children. Come back at 16 — or better, never."
      >
        <p className="text-xs text-muted-foreground">Everything here has a price that compounds.</p>
      </Section>
    );
  }

  // ---------- PRISON takes over the whole view ----------
  if (cr?.prison) {
    const p = cr.prison;
    const paroleEligible = p.yearsServed >= Math.ceil(p.sentence / 2);
    return (
      <div className="space-y-3">
        <Section
          icon={Lock}
          title={p.facility}
          subtitle={`${p.security.toUpperCase()} security · Year ${p.yearsServed} of a ${p.sentence}-year sentence · Energy: ${energyLeft}/${ACTIONS_PER_YEAR}`}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Bar label="Respect (safety inside)" value={p.respect} color="bg-amber-400/80" />
            <Bar label="Behavior (parole board)" value={p.behavior} color="bg-emerald-400/80" />
          </div>
          {p.gangAffiliated && (
            <p className="mt-2 text-[11px] text-amber-400/90">
              Gang affiliated — protected, but flagged in the system.
            </p>
          )}
          {cr.informant && (
            <p className="mt-1 text-[11px] text-red-400">
              Known informant. Watch your back in here.
            </p>
          )}

          <p className="mb-1 mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            This Year (1⚡ each)
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button
              className={btn}
              onClick={() => act((ch) => prisonAction(ch, "behave", trySpendEnergy))}
            >
              Keep Your Head Down
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => prisonAction(ch, "workout", trySpendEnergy))}
            >
              <Dumbbell className="mr-1 inline h-3.5 w-3.5" />
              Yard Workouts
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => prisonAction(ch, "study", trySpendEnergy))}
            >
              Prison Education
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => prisonAction(ch, "respect", trySpendEnergy))}
            >
              Stand Your Ground
            </button>
            <button
              className={btnGhost}
              disabled={p.gangAffiliated}
              onClick={() => act((ch) => prisonAction(ch, "joinGang", trySpendEnergy))}
            >
              {p.gangAffiliated ? "Affiliated" : "Join a Prison Gang"}
            </button>
            <button
              className={btnDanger}
              onClick={() => act((ch) => prisonAction(ch, "escape", trySpendEnergy))}
            >
              <DoorOpen className="mr-1 inline h-3.5 w-3.5" />
              Attempt Escape
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button className={btn} disabled={!paroleEligible} onClick={() => act(requestParole)}>
              <Gavel className="mr-1 inline h-3.5 w-3.5" />
              Request Parole Hearing
            </button>
            {!paroleEligible && (
              <span className="text-[11px] text-muted-foreground">
                Eligible after {Math.ceil(p.sentence / 2)} year
                {Math.ceil(p.sentence / 2) > 1 ? "s" : ""} served
              </span>
            )}
            {p.paroleHearingsFailed > 0 && (
              <span className="text-[11px] text-red-400/90">{p.paroleHearingsFailed} denied</span>
            )}
          </div>
        </Section>
      </div>
    );
  }

  // ---------- TRIAL: a playable courtroom ----------
  if (cr?.trial) {
    const t = cr.trial;
    const odds = trialConvictionChance(c);
    const plea = currentPleaOffer(c);
    const opts = trialOptions(c);
    const bonus = lawyerContactBonus(c);
    return (
      <div className="space-y-3">
        <Section
          icon={Gavel}
          title={`The People v. You — ${t.charge}`}
          subtitle={`Severity ${t.severity}/10 · Stage: ${trialStageTitle(t.stage)}`}
        >
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Conviction odds (live)</span>
              <span
                className={`font-bold ${odds >= 60 ? "text-red-400" : odds >= 35 ? "text-amber-400" : "text-emerald-300"}`}
              >
                {odds}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${odds >= 60 ? "bg-red-400/80" : odds >= 35 ? "bg-amber-400/80" : "bg-emerald-400/80"}`}
                style={{ width: `${odds}%` }}
              />
            </div>
          </div>

          {!t.lawyer ? (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-bold">
                Retain Counsel{" "}
                {bonus.name && (
                  <span className="font-normal text-emerald-300">
                    · {bonus.name} gets you 30% off and a sharper defense
                  </span>
                )}
              </p>
              <div className="space-y-1.5">
                {LAWYERS.map((l) => {
                  const fee = effectiveLawyerFee(c, l);
                  const locked = l.tier === "fixer" && !cr.syndicate && cr.notoriety < 60;
                  const affordable = c.money + cr.dirtyMoney >= fee;
                  return (
                    <div
                      key={l.tier}
                      className={`flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 ${locked ? "opacity-50" : ""}`}
                    >
                      <div>
                        <p className="text-xs font-semibold">
                          {l.label}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {fee === 0 ? "free" : `$${fee.toLocaleString()}`} · defense power{" "}
                            {l.power}
                            {bonus.power ? `+${bonus.power}` : ""}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {locked ? "Syndicate ties or 60+ notoriety required" : l.blurb}
                        </p>
                      </div>
                      <button
                        className={l.tier === "fixer" ? btnDanger : btn}
                        disabled={locked || !affordable}
                        onClick={() => act((ch) => hireLawyer(ch, l.tier))}
                      >
                        {affordable ? "Retain" : "Can't afford"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Fees can be paid from dirty money. Better counsel unlocks better plays at every
                stage.
              </p>
            </div>
          ) : (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Counsel:{" "}
              <span className="font-semibold text-foreground">{lawyerDef(t.lawyer).label}</span>{" "}
              (power {lawyerDef(t.lawyer).power}
              {bonus.power ? `+${bonus.power}` : ""})
            </p>
          )}

          <p className="mb-1.5 text-xs font-bold">{trialStageTitle(t.stage)}</p>
          <div className="space-y-1.5">
            {opts.map((o) => {
              const locked = o.needsLawyer && (!t.lawyer || !o.needsLawyer.includes(t.lawyer));
              return (
                <button
                  key={o.id}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-white/10 disabled:opacity-40 ${o.corrupt ? "border-red-400/40 bg-red-500/5" : "border-white/10 bg-white/5"}`}
                  disabled={!!locked}
                  onClick={() => act((ch) => trialStep(ch, o.id))}
                >
                  <span className="font-semibold">{o.label}</span>
                  {o.corrupt && (
                    <span className="ml-1 text-[10px] font-bold text-red-400">ILLEGAL</span>
                  )}
                  <span className="block text-[11px] text-muted-foreground">
                    {locked
                      ? `Requires ${o.needsLawyer!.map((x) => lawyerDef(x).label).join(" / ")}`
                      : o.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button className={btnGhost} onClick={() => act(takePlea)}>
              Take the plea — {plea} year{plea > 1 ? "s" : ""} guaranteed (offer tracks the
              evidence)
            </button>
            {cr.syndicate && t.stage === "interrogation" && (
              <button className={btnGhost} onClick={() => act(turnInformant)}>
                Turn informant on the {cr.syndicate} — walk free, live marked
              </button>
            )}
          </div>

          {t.courtLog.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Court Record
              </p>
              {t.courtLog.map((line, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">
                  • {line}
                </p>
              ))}
            </div>
          )}
        </Section>
      </div>
    );
  }

  // ---------- Free world ----------
  return (
    <div className="space-y-3">
      <Section
        icon={Skull}
        title="The Life"
        subtitle={`${rankLabel(cr?.rank)}${cr?.syndicate ? ` · ${cr.syndicate}` : ""} · Energy: ${energyLeft}/${ACTIONS_PER_YEAR}`}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Notoriety" value={`${cr?.notoriety ?? 0}`} />
          <Stat label="Heat" value={`${cr?.heat ?? 0}`} warn={(cr?.heat ?? 0) >= 60} />
          <Stat label="Dirty Money" value={formatMoney(cr?.dirtyMoney ?? 0)} />
          <Stat label="Crew" value={`${cr?.crew.length ?? 0}`} />
          <Stat label="Rackets" value={`${cr?.rackets ?? 0}`} />
          <Stat
            label="Record"
            value={c.criminalRecord > 0 ? `${c.criminalRecord} convictions` : "Clean"}
            warn={c.criminalRecord > 0}
          />
        </div>
        {(cr?.heat ?? 0) >= 60 && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-red-400">
            <Flame className="h-3.5 w-3.5" /> You're running hot — task forces open files above 70.
            Lay low.
          </p>
        )}
        {cr?.informant && (
          <p className="mt-1 text-[11px] text-red-400">
            You informed on a syndicate. That never fully goes away.
          </p>
        )}
      </Section>

      {cr?.heist && (
        <div className="glass rounded-2xl border border-amber-400/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold">MID-JOB: {cr.heist.title}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{cr.heist.description}</p>
          <div className="space-y-1.5">
            {cr.heist.options.map((o, i) => (
              <button
                key={i}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:bg-white/10"
                onClick={() => act((ch) => resolveHeist(ch, i))}
              >
                {o.label}
                {o.risky && (
                  <span className="ml-1 text-[10px] font-bold text-amber-400">RISKY</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {cr?.pendingEvent && (
        <div className="glass rounded-2xl border border-red-400/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-base font-bold">{cr.pendingEvent.title}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{cr.pendingEvent.description}</p>
          <div className="space-y-1.5">
            {cr.pendingEvent.options.map((o, i) => (
              <button
                key={i}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:bg-white/10"
                onClick={() => act((ch) => resolveCrimeEvent(ch, i))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Section
        icon={HandCoins}
        title="Jobs"
        subtitle="Every job shows your real odds. Smart criminals only take good bets."
      >
        <div className="space-y-1.5">
          {CRIME_JOBS.map((job) => {
            const chance = jobSuccessChance(c, job);
            const locked =
              c.age < job.minAge ||
              (cr?.notoriety ?? 0) < job.minNotoriety ||
              (job.needsSyndicate && !cr?.syndicate) ||
              (cr?.crew.length ?? 0) < job.needsCrew;
            return (
              <div
                key={job.id}
                className={`flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 ${locked ? "opacity-50" : ""}`}
              >
                <div>
                  <p className="text-xs font-semibold">
                    {job.label}
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {formatMoney(job.payout[0])}–{formatMoney(job.payout[1])} · severity{" "}
                      {job.severity}/10
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {locked
                      ? [
                          c.age < job.minAge ? `age ${job.minAge}+` : null,
                          (cr?.notoriety ?? 0) < job.minNotoriety
                            ? `${job.minNotoriety} notoriety`
                            : null,
                          job.needsSyndicate && !cr?.syndicate ? "syndicate" : null,
                          (cr?.crew.length ?? 0) < job.needsCrew
                            ? `crew of ${job.needsCrew}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : `Success odds: ${chance}%`}
                  </p>
                </div>
                {job.severity >= 7 ? (
                  <div className="flex shrink-0 flex-col gap-1">
                    {(Object.keys(APPROACHES) as (keyof typeof APPROACHES)[]).map((ap) => (
                      <button
                        key={ap}
                        className={btnGhost}
                        disabled={locked || !!cr?.heist}
                        onClick={() => act((ch) => startHeist(ch, job.id, ap, trySpendEnergy))}
                      >
                        {ap === "stealth"
                          ? "🤫 Stealth"
                          : ap === "loud"
                            ? "💥 Loud"
                            : "🤝 Inside Man"}{" "}
                        (1⚡)
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    className={chance >= 60 ? btn : btnDanger}
                    disabled={locked}
                    onClick={() => act((ch) => commitCrime(ch, job.id, trySpendEnergy))}
                  >
                    Do It (1⚡)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={Users} title="Organization">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <button
            className={btn}
            disabled={!!cr?.syndicate}
            onClick={() => act((ch) => joinSyndicate(ch, trySpendEnergy))}
          >
            {cr?.syndicate ? "Connected" : "Join a Syndicate (1⚡)"}
          </button>
          <button className={btn} onClick={() => act((ch) => recruitCrew(ch, trySpendEnergy))}>
            Recruit Crew (1⚡)
          </button>
          <button className={btn} onClick={() => act((ch) => startRacket(ch, trySpendEnergy))}>
            Start Racket (1⚡)
          </button>
          <button className={btnGhost} onClick={() => act((ch) => layLow(ch, trySpendEnergy))}>
            <Shield className="mr-1 inline h-3.5 w-3.5" />
            Lay Low (1⚡)
          </button>
        </div>
        {(cr?.crew.length ?? 0) > 0 && (
          <div className="mt-2 space-y-1">
            {cr!.crew.map((m) => (
              <p key={m.id} className="text-[11px] text-muted-foreground">
                {m.name} — {m.role} · skill {m.skill} · loyalty {m.loyalty}
                {m.loyalty < 35 && <span className="ml-1 font-bold text-red-400">SHAKY</span>}
              </p>
            ))}
          </div>
        )}
      </Section>

      {(cr?.dirtyMoney ?? 0) > 0 && (
        <Section
          icon={Droplets}
          title="Dirty Money"
          subtitle={`${formatMoney(cr!.dirtyMoney)} needs washing. Your own businesses clean it at 85 cents on the dollar.`}
        >
          {c.businessHub?.businesses.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                className="rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
                value={launderBiz}
                onChange={(e) => setLaunderBiz(e.target.value)}
              >
                <option value="">Pick a business...</option>
                {c.businessHub.businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                className={btn}
                disabled={!launderBiz}
                onClick={() => act((ch) => launderThroughBusiness(ch, launderBiz, 50000))}
              >
                Launder $50k
              </button>
              <button
                className={btn}
                disabled={!launderBiz}
                onClick={() =>
                  act((ch) => launderThroughBusiness(ch, launderBiz, ch.crime?.dirtyMoney ?? 0))
                }
              >
                Launder Max
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No legitimate business to wash through — start one in the Business tab, or spend dirty
              at a loss.
            </p>
          )}
          <button
            className={`${btnGhost} mt-2`}
            onClick={() => act((ch) => spendDirty(ch, ch.crime?.dirtyMoney ?? 0))}
          >
            Spend Dirty (70¢ on the dollar, +heat)
          </button>
        </Section>
      )}

      {cr?.active && (
        <Section icon={Landmark} title="The Exit">
          <button className={`${btnGhost} w-full`} onClick={() => act(leaveTheLife)}>
            Leave the Life — walk away from the syndicate, crew, and rackets
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Notoriety and heat fade with clean years. Convictions never do.
          </p>
        </Section>
      )}
    </div>
  );
}
