import { useState } from "react";
import { Activity, AlertTriangle, Medal, Mic2, Trophy, Megaphone } from "lucide-react";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import {
  SPORT_DEFS,
  chooseSport,
  fightPurse,
  fightWinChance,
  takeFight,
  titleShot,
  effectiveSkill,
  joinAcademy,
  negotiateContract,
  playCollegeBall,
  resolveMoment,
  retire,
  sportDef,
  startPostCareer,
  trainSport,
  turnPro,
} from "../../game/athlete";
import type { Character, LogTone, Sport } from "../../game/types";
import { formatMoney } from "../../game/util";

type AnyResult = { character: Character; message: string; tone: LogTone; ok: boolean };
type Act = (fn: (c: Character) => AnyResult) => void;

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Trophy;
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

export function AthleteView({ c, act }: { c: Character; act: Act }) {
  const a = c.athlete;
  const [sportPick, setSportPick] = useState<Sport>("tennis");
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;

  // ---------- No sport yet ----------
  if (!a?.sport) {
    return (
      <Section
        icon={Trophy}
        title="Become an Athlete"
        subtitle="Pick a sport between 8 and 22. Tennis is the deepest path: rankings, tournaments, Grand Slams."
      >
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {SPORT_DEFS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSportPick(s.id)}
              className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                sportPick === s.id
                  ? "border-primary/60 bg-primary/20 font-semibold"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <p>{s.label}</p>
              <p className="text-[10px] opacity-70">{s.team ? s.league : "Rankings & Slams"}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {sportDef(sportPick).team
            ? `Path: youth → college ball → draft → ${sportDef(sportPick).league}. Injury risk ${Math.round(sportDef(sportPick).injuryRate * 100)}%/season.`
            : "Path: youth → academy & junior circuit → turn pro at 16+ → climb the world rankings. Prize money only — no safety net."}{" "}
          Being on the school {sportDef(sportPick).schoolSport} team boosts your discovered talent.
        </p>
        <button
          className={`${btn} mt-2 w-full`}
          disabled={c.age < 8 || c.age > 22}
          onClick={() => act((ch) => chooseSport(ch, sportPick))}
        >
          Commit to {sportDef(sportPick).label}
        </button>
        {(c.age < 8 || c.age > 22) && (
          <p className="mt-1 text-[11px] text-red-400/90">
            {c.age < 8
              ? "Available from age 8."
              : "The elite-career window has closed (age 22 max)."}
          </p>
        )}
      </Section>
    );
  }

  const def = sportDef(a.sport);
  const isTennis = a.sport === "tennis";

  return (
    <div className="space-y-3">
      <Section
        icon={Trophy}
        title={`${def.label} — ${a.stage === "pro" ? (isTennis ? `World #${a.ranking}` : a.sport === "mma" ? `${a.beltHolder ? "CHAMPION 🏆" : `Ranked #${a.ranking}`} · ${a.fightWins ?? 0}-${a.fightLosses ?? 0} (${a.fightKOs ?? 0} KO)` : a.team) : a.stage.charAt(0).toUpperCase() + a.stage.slice(1)}`}
        subtitle={`Energy: ${energyLeft}/${ACTIONS_PER_YEAR} · Peak age ~${a.peakAge}${c.age > a.peakAge ? " (past peak — every season costs now)" : ""}`}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Skill" value={`${a.skill}${a.skill >= a.talent ? " (at ceiling)" : ""}`} />
          <Stat label="Talent Ceiling" value={`${a.talent}`} />
          <Stat label="Fitness" value={`${a.fitness}`} />
          <Stat label="Effective Level" value={`${Math.round(effectiveSkill(a))}`} />
          <Stat label="Chronic Wear" value={`${a.chronicWear}${a.chronicWear > 50 ? " ⚠" : ""}`} />
          <Stat label="Career Earnings" value={formatMoney(a.careerEarnings)} />
          <Stat label="Endorsements" value={`${formatMoney(a.endorsements)}/yr`} />
          <Stat
            label="Titles / Majors"
            value={`${a.titles} / ${a.majors}${a.mvps ? ` · ${a.mvps} MVP` : ""}`}
          />
        </div>

        {a.injury && (
          <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Injured: {a.injury.name} ({a.injury.severity})
            — {a.injury.yearsLeft} yr of recovery left
          </p>
        )}
        {a.bannedYears > 0 && (
          <p className="mt-1 text-[11px] font-bold text-red-400">
            SUSPENDED — {a.bannedYears} year(s) remaining on your ban.
          </p>
        )}
        {a.contract && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Contract: {formatMoney(a.contract.salary)}/yr · {a.contract.yearsLeft} yr left
          </p>
        )}
        {a.hallOfFame && <p className="mt-1 text-[11px] font-bold text-primary">🏆 HALL OF FAME</p>}
      </Section>

      {/* Big moment */}
      {a.sport === "mma" && a.stage === "pro" && !a.pendingMoment && a.bannedYears === 0 && (
        <Section
          icon={Medal}
          title="Fight Card"
          subtitle={`Permanent wear: ${a.chronicWear}/100 — every bout adds more, and it never heals. Choose your wars.`}
        >
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {(["safe", "fair", "risky"] as const).map((tier) => (
              <button
                key={tier}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:bg-white/10 disabled:opacity-40"
                disabled={!!a.injury}
                onClick={() => act((ch) => takeFight(ch, tier, trySpendEnergy))}
              >
                <p className="font-semibold capitalize">{tier} fight (1⚡)</p>
                <p className="text-[11px] text-muted-foreground">
                  Win odds {fightWinChance(c, tier)}% · Purse ~{formatMoney(fightPurse(a, tier))}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold transition hover:bg-primary/30 disabled:opacity-40"
              disabled={a.beltHolder || (a.ranking ?? 50) > 3 || !!a.injury}
              onClick={() => act((ch) => titleShot(ch, trySpendEnergy))}
            >
              🏆 Title Shot (1⚡)
            </button>
            <span className="text-[11px] text-muted-foreground">
              {a.beltHolder
                ? `Champion — ${a.beltDefenses ?? 0} defense(s). Risky fights defend the belt.`
                : (a.ranking ?? 50) > 3
                  ? `Reach top 3 for a title shot (now #${a.ranking})`
                  : "You've earned your shot."}
            </span>
          </div>
          {a.chronicWear >= 60 && (
            <p className="mt-2 text-[11px] text-red-400">
              The damage is permanent and it's showing. Every fight from here is borrowed time.
            </p>
          )}
        </Section>
      )}

      {a.pendingMoment && (
        <div className="glass rounded-2xl border border-amber-400/40 p-4">
          <p className="flex items-center gap-1 text-sm font-bold">
            <Medal className="h-4 w-4 text-amber-400" /> {a.pendingMoment.title}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">{a.pendingMoment.description}</p>
          <div className="space-y-1.5">
            {a.pendingMoment.options.map((o, i) => (
              <button
                key={i}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                  o.corrupt ? "border-red-400/40 bg-red-500/5" : "border-white/10 bg-white/5"
                }`}
                onClick={() => act((ch) => resolveMoment(ch, i))}
              >
                {o.label}
                {o.corrupt && (
                  <span className="ml-1 text-[10px] font-bold text-red-400">ILLEGAL</span>
                )}
                {o.injuryRisk ? (
                  <span className="ml-1 text-[10px] font-bold text-amber-400">INJURY RISK</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {a.stage !== "retired" && (
        <Section
          icon={Activity}
          title="Development"
          subtitle="Skill grows toward your talent ceiling — faster young, faster in an academy."
        >
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <button
              className={btn}
              disabled={a.bannedYears > 0}
              onClick={() => act((ch) => trainSport(ch, trySpendEnergy))}
            >
              Train Hard (1⚡)
            </button>
            {(a.stage === "youth" || a.stage === "junior") && !a.inAcademy && (
              <button className={btn} onClick={() => act(joinAcademy)}>
                Join Academy ($15k/yr)
              </button>
            )}
            {def.team && (a.stage === "youth" || a.stage === "junior") && c.age >= 18 && (
              <button className={btn} onClick={() => act(playCollegeBall)}>
                Play College Ball
              </button>
            )}
            {a.stage !== "pro" && (
              <button className={btn} onClick={() => act(turnPro)}>
                {def.team ? "Declare for Draft" : "Turn Pro"}
              </button>
            )}
            {a.stage === "pro" && def.team && (!a.contract || a.contract.yearsLeft <= 1) && (
              <button className={btn} onClick={() => act(negotiateContract)}>
                Negotiate Contract
              </button>
            )}
            {a.stage === "pro" && (
              <button className={btnGhost} onClick={() => act(retire)}>
                Retire
              </button>
            )}
          </div>
          {a.stage === "pro" &&
            !c.contacts?.some((x) => x.type === "agent" && x.relationship >= 50) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tip: a well-connected agent (Network tab) boosts endorsements 50% and contract
                offers.
              </p>
            )}
        </Section>
      )}

      {/* Post-career */}
      {a.stage === "retired" && !a.postCareer && (
        <Section
          icon={Megaphone}
          title="The Second Act"
          subtitle="The sport doesn't leave you just because you left it."
        >
          <div className="grid grid-cols-2 gap-1.5">
            <button
              className={btn}
              disabled={!!c.job}
              onClick={() => act((ch) => startPostCareer(ch, "coach"))}
            >
              <Megaphone className="mr-1 inline h-3.5 w-3.5" /> Become a Coach
            </button>
            <button
              className={btn}
              disabled={!!c.job}
              onClick={() => act((ch) => startPostCareer(ch, "commentator"))}
            >
              <Mic2 className="mr-1 inline h-3.5 w-3.5" /> Join the Broadcast Booth
            </button>
          </div>
          {c.job && (
            <p className="mt-1 text-[11px] text-muted-foreground">Quit your current job first.</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Your fame also carries into politics (instant name recognition) and business (brand
            reputation) — check those paths.
          </p>
        </Section>
      )}

      {/* Season history */}
      {a.seasonLog.length > 0 && (
        <Section icon={Medal} title="Career Record">
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {[...a.seasonLog].reverse().map((s, i) => (
              <p key={i} className="text-[11px]">
                <span className="text-muted-foreground">Age {s.age}:</span>{" "}
                <span
                  className={
                    s.tone === "milestone"
                      ? "font-semibold text-primary"
                      : s.tone === "bad"
                        ? "text-red-400"
                        : ""
                  }
                >
                  {s.summary}
                </span>
              </p>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
