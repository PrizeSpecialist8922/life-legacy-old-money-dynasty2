import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BadgeDollarSign,
  Check,
  ChevronDown,
  Flag,
  Landmark,
  Megaphone,
  Mic,
  Newspaper,
  Radio,
  Scale,
  ScrollText,
  Share2,
  Swords,
  Tv,
  Users,
  Vote,
  X,
} from "lucide-react";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import {
  appointMinister,
  canCreateParty,
  canHoldVote,
  createParty,
  debateQuestions,
  defaultPolitics,
  dismissMinister,
  donateToCampaign,
  fireAdvisor,
  fundraise,
  generateAdvisorCandidates,
  generateMinisterCandidates,
  goIndependent,
  hireAdvisor,
  holdVote,
  ideologyLabel,
  ideologyScore,
  joinParty,
  launchCampaign,
  mediaAppearance,
  nextCampaignEvent,
  officeListings,
  partyName,
  playCampaignEvent,
  policyDecision,
  proposeBill,
  recruitVolunteers,
  resignOffice,
  resolveCrisis,
  resolveDebate,
  runAds,
  seekAppointment,
  setIdeology,
} from "../../game/politics";
import type { MediaKind, PoliticsResult } from "../../game/politics";
import { ADVISOR_ROLES, DOMAINS, ISSUES, partiesFor } from "../../game/politicsData";
import type {
  AdvisorRole,
  Character,
  Minister,
  PoliticalAdvisor,
  PoliticalDomain,
  PoliticalIssue,
} from "../../game/types";
import { formatMoney } from "../../game/util";

type Act = (fn: (c: Character) => PoliticsResult) => void;

// ---------- Small shared pieces ----------

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${color ?? "bg-primary"}`}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  subtitle,
}: {
  icon: typeof Landmark;
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

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

// ---------- Platform (ideology) setup ----------

function PlatformEditor({
  character,
  act,
  onDone,
}: {
  character: Character;
  act: Act;
  onDone: () => void;
}) {
  const existing = character.politics?.ideology;
  const [picks, setPicks] = useState<Record<PoliticalIssue, number>>(() => {
    const init = {} as Record<PoliticalIssue, number>;
    for (const i of ISSUES) init[i.id] = existing?.[i.id] ?? 1;
    return init;
  });
  const score = Math.round(
    (ISSUES.reduce((s, i) => s + (picks[i.id] - 1), 0) / ISSUES.length) * 100,
  );
  return (
    <Section
      icon={Scale}
      title="Your Political Platform"
      subtitle="Where you stand on the issues shapes which voters rally to you — and which never will."
    >
      <div className="space-y-3">
        {ISSUES.map((issue) => (
          <div key={issue.id}>
            <p className="mb-1 text-xs font-semibold">{issue.label}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {issue.positions.map((pos, idx) => (
                <button
                  key={idx}
                  onClick={() => setPicks((prev) => ({ ...prev, [issue.id]: idx }))}
                  className={`rounded-lg border px-2 py-2 text-[11px] leading-tight transition ${
                    picks[issue.id] === idx
                      ? "border-primary/60 bg-primary/20 font-semibold"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Left</span>
            <span className="font-bold text-foreground">{ideologyLabel(score)}</span>
            <span>Right</span>
          </div>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-sky-500/60 via-white/20 to-red-500/60">
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-primary"
              style={{ left: `calc(${(score + 100) / 2}% - 7px)` }}
            />
          </div>
        </div>
        <button
          className={`${btn} w-full`}
          onClick={() => {
            act((c) => setIdeology(c, picks));
            onDone();
          }}
        >
          {existing ? "Update Platform (−3 public trust)" : "Lock In My Platform"}
        </button>
      </div>
    </Section>
  );
}

// ---------- Debate ----------

function DebatePanel({
  character,
  act,
  onClose,
}: {
  character: Character;
  act: Act;
  onClose: () => void;
}) {
  // Deterministic per campaign (seeded on startAge + office), so depending on
  // the whole character never reshuffles questions mid-debate.
  const questions = useMemo(() => debateQuestions(character), [character]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<PoliticalIssue, number>>(
    {} as Record<PoliticalIssue, number>,
  );
  const q = questions[idx];
  if (!q) return null;
  return (
    <Section
      icon={Swords}
      title="Live Debate"
      subtitle={`Question ${idx + 1} of ${questions.length} · ${q.label}`}
    >
      <p className="mb-3 text-sm font-medium">{q.question}</p>
      <div className="space-y-1.5">
        {q.answers.map((a, ai) => (
          <button
            key={ai}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:border-primary/50 hover:bg-primary/10"
            onClick={() => {
              const next = { ...answers, [q.issue]: ai };
              if (idx + 1 < questions.length) {
                setAnswers(next);
                setIdx(idx + 1);
              } else {
                act((c) => resolveDebate(c, next));
                onClose();
              }
            }}
          >
            {a}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Voters reward answers that read the room — and punish flip-flopping on your own platform.
      </p>
    </Section>
  );
}

// ---------- Candidate pickers (ministers & advisors) ----------

function StatChips({
  p,
}: {
  p: { competence: number; loyalty: number; popularity: number; experience: number };
}) {
  return (
    <p className="text-[11px] text-muted-foreground">
      Comp {p.competence} · Loyal {p.loyalty} · Pop {p.popularity} · Exp {p.experience}
    </p>
  );
}

function MinisterPicker({
  portfolio,
  act,
  onClose,
}: {
  portfolio: PoliticalDomain;
  act: Act;
  onClose: () => void;
}) {
  const candidates = useMemo(() => generateMinisterCandidates(portfolio), [portfolio]);
  const label = DOMAINS.find((d) => d.id === portfolio)?.label ?? portfolio;
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold">Candidates for Minister of {label}</p>
      <div className="space-y-1.5">
        {candidates.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
          >
            <div>
              <p className="text-xs font-semibold">{m.name}</p>
              <StatChips p={m} />
            </div>
            <button
              className={btn}
              onClick={() => {
                act((c) => appointMinister(c, m));
                onClose();
              }}
            >
              Appoint
            </button>
          </div>
        ))}
      </div>
      <button className={`${btnGhost} mt-2 w-full`} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

function AdvisorPicker({
  role,
  act,
  onClose,
}: {
  role: AdvisorRole;
  act: Act;
  onClose: () => void;
}) {
  const candidates = useMemo(() => generateAdvisorCandidates(role), [role]);
  const label = ADVISOR_ROLES.find((r) => r.id === role)?.label ?? role;
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold">Candidates for {label}</p>
      <div className="space-y-1.5">
        {candidates.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
          >
            <div>
              <p className="text-xs font-semibold">
                {a.name}{" "}
                <span className="font-normal text-muted-foreground">
                  · {formatMoney(a.salary)}/yr
                </span>
              </p>
              <StatChips p={a} />
            </div>
            <button
              className={btn}
              onClick={() => {
                act((c) => hireAdvisor(c, a));
                onClose();
              }}
            >
              Hire
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Salaries are paid yearly from campaign funds.
      </p>
      <button className={`${btnGhost} mt-2 w-full`} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

// ---------- Main page ----------

export function PoliticsPage({ character, act }: { character: Character; act: Act }) {
  const c = character;
  const p = c.politics ?? defaultPolitics();
  const [editingPlatform, setEditingPlatform] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [ministerPick, setMinisterPick] = useState<PoliticalDomain | null>(null);
  const [advisorPick, setAdvisorPick] = useState<AdvisorRole | null>(null);
  const [billDomain, setBillDomain] = useState<PoliticalDomain>("economy");
  const [policyDomain, setPolicyDomain] = useState<PoliticalDomain>("economy");
  const [historyOpen, setHistoryOpen] = useState(false);

  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  const camp = p.campaign;
  const listings = officeListings(c);
  const parties = partiesFor(c.country);
  const iScore = ideologyScore(p);
  const voteGate = canHoldVote(c);
  const partyCheck = canCreateParty(c);
  const currentEvent = nextCampaignEvent(c);

  if (c.age < 18) {
    return (
      <Section icon={Landmark} title="Politics" subtitle="The corridors of power open at 18.">
        <p className="text-xs text-muted-foreground">
          Until then: study, debate club, and networking all pay off later in political life.
        </p>
      </Section>
    );
  }

  if (!p.ideology || editingPlatform) {
    return (
      <div className="space-y-3">
        <PlatformEditor character={c} act={act} onDone={() => setEditingPlatform(false)} />
        {p.ideology && (
          <button className={`${btnGhost} w-full`} onClick={() => setEditingPlatform(false)}>
            Back without changes
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ---------- Overview ---------- */}
      <Section
        icon={Landmark}
        title="Political Career"
        subtitle={`Energy this year: ${energyLeft} / ${ACTIONS_PER_YEAR}`}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Current Office" value={p.office?.name ?? "None"} accent={!!p.office} />
          <Stat label="Party" value={partyName(c)} />
          <Stat label="Ideology" value={ideologyLabel(iScore)} />
          <Stat label="Approval" value={`${p.approval}%`} accent />
          <Stat label="Public Trust" value={`${p.publicTrust}%`} />
          <Stat label="Campaign Funds" value={formatMoney(p.funds)} accent />
          <Stat label="Prestige" value={`${p.prestige}`} />
          <Stat label="Political XP" value={`${Math.round(p.experience)}`} />
          <Stat label="Networking" value={`${c.networking ?? 0}`} />
          <Stat label="Reputation" value={`${p.reputation}`} />
          <Stat label="Volunteers" value={`${p.volunteers}`} />
          <Stat label="Party Support" value={`${p.partySupport}%`} />
        </div>
        {p.office && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Term: year {p.office.yearsServed + 1} of {p.office.termYears} · Terms served:{" "}
            {p.office.termsServed}
            {p.office.yearsServed >= p.office.termYears - 1 && !camp && (
              <span className="font-semibold text-primary">
                {" "}
                · Election year — run for reelection or step down!
              </span>
            )}
          </p>
        )}
        {p.scandalRisk > 0 && (
          <p className="mt-1 text-[11px] font-semibold text-red-400">
            Scandal risk: {p.scandalRisk}% — skeletons rattle in your closet.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button className={btnGhost} onClick={() => setEditingPlatform(true)}>
            Edit platform
          </button>
          {p.office && (
            <button className={btnGhost} onClick={() => act(resignOffice)}>
              Resign office
            </button>
          )}
        </div>
      </Section>

      {/* ---------- Crisis (top priority) ---------- */}
      {p.pendingCrisis && (
        <div className="glass rounded-2xl border border-red-400/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-base font-bold">National Crisis: {p.pendingCrisis.title}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{p.pendingCrisis.description}</p>
          <div className="space-y-1.5">
            {p.pendingCrisis.options.map((o, i) => (
              <button
                key={i}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                  o.corrupt ? "border-red-400/40 bg-red-500/5" : "border-white/10 bg-white/5"
                }`}
                onClick={() => act((ch) => resolveCrisis(ch, i))}
              >
                {o.label}
                {o.corrupt && (
                  <span className="ml-1 text-[10px] font-bold text-red-400">CORRUPT</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Active campaign ---------- */}
      {camp && (
        <Section
          icon={Vote}
          title={`Campaign: ${camp.officeName}`}
          subtitle={`${
            camp.stage === "primary"
              ? "Party Primary"
              : camp.stage === "leadership"
                ? "Leadership Race"
                : "General Election"
          } · Events: ${camp.eventsDone}/${camp.eventsTotal}${camp.isIncumbent ? " · Incumbent" : ""}${camp.isSkip ? " · Leapfrog bid" : ""}`}
        >
          <div className="space-y-2">
            <Bar label={`You (${partyName(c)})`} value={camp.polling.you} color="bg-primary" />
            <Bar
              label={`${(camp.stage !== "general" ? camp.primaryOpponent! : camp.opponent).name} (${
                (camp.stage !== "general" ? camp.primaryOpponent! : camp.opponent).party
              })`}
              value={camp.polling.opponent}
              color="bg-red-400/80"
            />
            <Bar label="Undecided" value={camp.polling.undecided} color="bg-white/30" />
          </div>

          {camp.endorsements.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Endorsements:</span>{" "}
              {camp.endorsements.join(" · ")}
            </p>
          )}

          {debateOpen ? (
            <div className="mt-3">
              <DebatePanel character={c} act={act} onClose={() => setDebateOpen(false)} />
            </div>
          ) : currentEvent && camp.eventsDone < camp.eventsTotal ? (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-bold">{currentEvent.title}</p>
              <p className="mb-2 text-[11px] text-muted-foreground">{currentEvent.description}</p>
              <div className="space-y-1.5">
                {currentEvent.choices.map((choice, i) => (
                  <button
                    key={i}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                      choice.corrupt
                        ? "border-red-400/40 bg-red-500/5"
                        : "border-white/10 bg-white/5"
                    }`}
                    onClick={() => act((ch) => playCampaignEvent(ch, currentEvent.id, i))}
                  >
                    {choice.label}
                    {choice.corrupt && (
                      <span className="ml-1 text-[10px] font-bold text-red-400">CORRUPT</span>
                    )}
                    {choice.risky && (
                      <span className="ml-1 text-[10px] font-bold text-amber-400">RISKY</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {camp.stage === "general" && (
              <button
                className={btn}
                disabled={camp.debateDone}
                onClick={() => setDebateOpen(true)}
              >
                <Swords className="mr-1 inline h-3.5 w-3.5" />
                {camp.debateDone ? "Debate done" : "Enter Debate"}
              </button>
            )}
            <button
              className={btn}
              disabled={p.funds < 15000}
              onClick={() =>
                act((ch) =>
                  runAds(
                    ch,
                    Math.min(50000, Math.max(15000, Math.round((ch.politics?.funds ?? 0) * 0.4))),
                  ),
                )
              }
            >
              <Megaphone className="mr-1 inline h-3.5 w-3.5" /> Run Ads
            </button>
            <button
              className={btn}
              disabled={c.money < 5000}
              onClick={() =>
                act((ch) => donateToCampaign(ch, Math.min(50000, Math.floor(ch.money * 0.25))))
              }
            >
              <BadgeDollarSign className="mr-1 inline h-3.5 w-3.5" /> Self-fund
            </button>
            <button
              className={`${btn} ${voteGate.ok ? "bg-primary text-primary-foreground" : ""}`}
              disabled={!voteGate.ok}
              onClick={() => act(holdVote)}
            >
              <Vote className="mr-1 inline h-3.5 w-3.5" />
              {camp.stage === "general"
                ? "Election Day"
                : camp.stage === "leadership"
                  ? "Leadership Vote"
                  : "Primary Day"}
            </button>
          </div>
          {!voteGate.ok && (
            <p className="mt-1 text-[11px] text-muted-foreground">{voteGate.reason}</p>
          )}
        </Section>
      )}

      {/* ---------- Run for office ---------- */}
      {!camp && (
        <Section
          icon={Flag}
          title={`Path to Power — ${c.country}`}
          subtitle="Climb the ladder rung by rung, or leapfrog it if your résumé is exceptional."
        >
          <div className="space-y-1.5">
            {listings.map(({ def, status, reasons }) => (
              <div key={def.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold">
                      {def.name}
                      {def.optional && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          (optional)
                        </span>
                      )}
                      {status === "held" && (
                        <span className="ml-1 text-[10px] font-bold text-primary">
                          CURRENT OFFICE
                        </span>
                      )}
                      {status === "won-before" && (
                        <Check className="ml-1 inline h-3 w-3 text-primary" />
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatMoney(def.salary)}/yr · {def.termYears}-yr term · min age {def.minAge}
                      {def.executive ? " · Executive" : ""}
                      {def.selection === "appointment"
                        ? " · Appointed"
                        : def.selection === "leadership"
                          ? " · Leadership race"
                          : def.hasPrimary
                            ? " · Primary"
                            : ""}
                    </p>
                    {status === "locked" && (
                      <p className="mt-0.5 text-[11px] text-red-400/90">{reasons.join(" · ")}</p>
                    )}
                    {status === "skip" && (
                      <p className="mt-0.5 text-[11px] text-amber-400/90">
                        Leapfrog bid — a much harder race.
                      </p>
                    )}
                  </div>
                  {status !== "held" && status !== "locked" && (
                    <button
                      className={btn}
                      onClick={() =>
                        act((ch) =>
                          def.selection === "appointment"
                            ? seekAppointment(ch, def.id)
                            : launchCampaign(ch, def.id),
                        )
                      }
                    >
                      {def.selection === "appointment" ? "Seek Post" : "Run"}
                    </button>
                  )}
                  {status === "held" &&
                    p.office &&
                    p.office.yearsServed >= p.office.termYears - 1 &&
                    def.selection !== "appointment" && (
                      <button
                        className={btn}
                        onClick={() => act((ch) => launchCampaign(ch, def.id))}
                      >
                        Reelection
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---------- Governing ---------- */}
      {p.office && (
        <Section
          icon={ScrollText}
          title="Governing"
          subtitle="Every domain is graded separately. Neglect one and the voters will remind you."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DOMAINS.map((d) => (
              <Bar key={d.id} label={d.label} value={Math.round(p.domainApproval[d.id])} />
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1.5 text-xs font-bold">Policy Decision (1 energy)</p>
              <select
                className="mb-1.5 w-full rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
                value={policyDomain}
                onChange={(e) => setPolicyDomain(e.target.value as PoliticalDomain)}
              >
                {DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) => policyDecision(ch, policyDomain, "invest", trySpendEnergy))
                  }
                >
                  Invest
                </button>
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) => policyDecision(ch, policyDomain, "reform", trySpendEnergy))
                  }
                >
                  Reform
                </button>
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) => policyDecision(ch, policyDomain, "cut", trySpendEnergy))
                  }
                >
                  Cut
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1.5 text-xs font-bold">
                Propose Bill (1 energy) · Passed {p.billsPassed} / Failed {p.billsFailed}
              </p>
              <select
                className="mb-1.5 w-full rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
                value={billDomain}
                onChange={(e) => setBillDomain(e.target.value as PoliticalDomain)}
              >
                {DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) => proposeBill(ch, billDomain, "negotiate", trySpendEnergy))
                  }
                >
                  Negotiate
                </button>
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) => proposeBill(ch, billDomain, "compromise", trySpendEnergy))
                  }
                >
                  Compromise
                </button>
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) => proposeBill(ch, billDomain, "coalition", trySpendEnergy))
                  }
                >
                  Coalition
                </button>
              </div>
            </div>
          </div>

          {/* Cabinet */}
          {p.office.executive && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold">Cabinet</p>
              <div className="space-y-1.5">
                {DOMAINS.map((d) => {
                  const m = p.cabinet.find((x) => x.portfolio === d.id);
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-semibold">
                          {d.label}:{" "}
                          {m ? m.name : <span className="text-muted-foreground">vacant</span>}
                        </p>
                        {m && <StatChips p={m} />}
                      </div>
                      <div className="flex gap-1.5">
                        {m && (
                          <button
                            className={btnGhost}
                            onClick={() => act((ch) => dismissMinister(ch, m.id))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          className={btn}
                          onClick={() => setMinisterPick(ministerPick === d.id ? null : d.id)}
                        >
                          {m ? "Replace" : "Appoint"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {ministerPick && (
                <MinisterPicker
                  portfolio={ministerPick}
                  act={act}
                  onClose={() => setMinisterPick(null)}
                />
              )}
            </div>
          )}
        </Section>
      )}

      {/* ---------- Political actions ---------- */}
      <Section
        icon={Mic}
        title="Political Actions"
        subtitle={`Each costs 1 energy (${energyLeft} left this year).`}
      >
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <button className={btn} onClick={() => act((ch) => fundraise(ch, trySpendEnergy))}>
            <BadgeDollarSign className="mr-1 inline h-3.5 w-3.5" /> Fundraise
          </button>
          <button
            className={btn}
            onClick={() => act((ch) => recruitVolunteers(ch, trySpendEnergy))}
          >
            <Users className="mr-1 inline h-3.5 w-3.5" /> Recruit Volunteers
          </button>
          <button
            className={btn}
            onClick={() => act((ch) => mediaAppearance(ch, "tv", trySpendEnergy))}
          >
            <Tv className="mr-1 inline h-3.5 w-3.5" /> TV Interview
          </button>
          <button
            className={btn}
            onClick={() => act((ch) => mediaAppearance(ch, "press", trySpendEnergy))}
          >
            <Radio className="mr-1 inline h-3.5 w-3.5" /> Press Conference
          </button>
          <button
            className={btn}
            onClick={() => act((ch) => mediaAppearance(ch, "podcast", trySpendEnergy))}
          >
            <Mic className="mr-1 inline h-3.5 w-3.5" /> Podcast
          </button>
          <button
            className={btn}
            onClick={() => act((ch) => mediaAppearance(ch, "newspaper", trySpendEnergy))}
          >
            <Newspaper className="mr-1 inline h-3.5 w-3.5" /> Newspaper
          </button>
          <button
            className={btn}
            onClick={() => act((ch) => mediaAppearance(ch, "social", trySpendEnergy))}
          >
            <Share2 className="mr-1 inline h-3.5 w-3.5" /> Social Media
          </button>
          <button
            className={btn}
            disabled={c.money < 1000}
            onClick={() =>
              act((ch) => donateToCampaign(ch, Math.min(25000, Math.floor(ch.money * 0.2))))
            }
          >
            <BadgeDollarSign className="mr-1 inline h-3.5 w-3.5" /> Donate Own Money
          </button>
        </div>
      </Section>

      {/* ---------- Party ---------- */}
      <Section
        icon={Flag}
        title="Political Party"
        subtitle={`Affiliation: ${partyName(c)} · Party support: ${p.partySupport}%`}
      >
        <button className={`${btnGhost} w-full`} onClick={() => setPartyOpen(!partyOpen)}>
          {partyOpen ? "Hide party options" : "Join, switch, or found a party"}
          <ChevronDown
            className={`ml-1 inline h-3.5 w-3.5 transition ${partyOpen ? "rotate-180" : ""}`}
          />
        </button>
        {partyOpen && (
          <div className="mt-2 space-y-1.5">
            {parties.map((party) => (
              <div
                key={party.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold">{party.name}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {party.lean} · {party.popularity}% national support
                  </p>
                </div>
                <button
                  className={btn}
                  disabled={p.partyId === party.id || !!camp}
                  onClick={() => act((ch) => joinParty(ch, party.id))}
                >
                  {p.partyId === party.id ? "Member" : "Join"}
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
              <p className="text-xs font-semibold">Run as an Independent</p>
              <button
                className={btn}
                disabled={p.partyId === "independent" || !!camp}
                onClick={() => act(goIndependent)}
              >
                Go Independent
              </button>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold">Found Your Own Party</p>
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                Requires {formatMoney(500000)} funds, 200 volunteers, 70 reputation, 60 networking.
              </p>
              {!partyCheck.ok && (
                <p className="mb-1.5 text-[11px] text-red-400/90">
                  {partyCheck.reasons.join(" · ")}
                </p>
              )}
              <div className="flex gap-1.5">
                <input
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Party name"
                  className="w-full rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
                />
                <button
                  className={btn}
                  disabled={!partyCheck.ok || !newPartyName.trim() || !!camp}
                  onClick={() => {
                    act((ch) => createParty(ch, newPartyName));
                    setNewPartyName("");
                  }}
                >
                  Found
                </button>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ---------- Advisors ---------- */}
      <Section
        icon={Award}
        title="Political Advisors"
        subtitle="A strong team wins campaigns and manages crises. Paid yearly from campaign funds."
      >
        <div className="space-y-1.5">
          {ADVISOR_ROLES.map((r) => {
            const a = p.advisors.find((x) => x.role === (r.id as AdvisorRole));
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold">
                    {r.label}:{" "}
                    {a ? (
                      `${a.name} (${formatMoney(a.salary)}/yr)`
                    ) : (
                      <span className="text-muted-foreground">vacant</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{a ? undefined : r.blurb}</p>
                  {a && <StatChips p={a} />}
                </div>
                <div className="flex gap-1.5">
                  {a && (
                    <button className={btnGhost} onClick={() => act((ch) => fireAdvisor(ch, a.id))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    className={btn}
                    onClick={() =>
                      setAdvisorPick(advisorPick === r.id ? null : (r.id as AdvisorRole))
                    }
                  >
                    {a ? "Replace" : "Hire"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {advisorPick && (
          <AdvisorPicker role={advisorPick} act={act} onClose={() => setAdvisorPick(null)} />
        )}
      </Section>

      {/* ---------- History & timeline ---------- */}
      {(p.electionHistory.length > 0 || p.timeline.length > 0) && (
        <Section icon={ScrollText} title="Political Record">
          <button className={`${btnGhost} w-full`} onClick={() => setHistoryOpen(!historyOpen)}>
            {historyOpen
              ? "Hide record"
              : `Show record (${p.electionHistory.length} elections, ${p.timeline.length} milestones)`}
          </button>
          {historyOpen && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Election History
                </p>
                <div className="space-y-1">
                  {[...p.electionHistory].reverse().map((e, i) => (
                    <p key={i} className="text-[11px]">
                      <span
                        className={
                          e.result === "won" ? "font-bold text-primary" : "font-bold text-red-400"
                        }
                      >
                        {e.result === "won" ? "WON" : "LOST"}
                      </span>{" "}
                      {e.office} ({e.stage}) at {e.age} — {e.share}% vs {e.opponent}
                    </p>
                  ))}
                  {!p.electionHistory.length && (
                    <p className="text-[11px] text-muted-foreground">No elections yet.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Career Timeline
                </p>
                <div className="space-y-1">
                  {[...p.timeline]
                    .reverse()
                    .slice(0, 25)
                    .map((t, i) => (
                      <p key={i} className="text-[11px]">
                        <span className="text-muted-foreground">Age {t.age}:</span> {t.text}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
