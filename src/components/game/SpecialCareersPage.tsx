import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  Building2,
  Crown,
  Dumbbell,
  Handshake,
  HeartHandshake,
  Landmark,
  LineChart,
  Lock,
  Music,
  Rocket,
  Skull,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import {
  BUSINESS_DEFS,
  bizCutCosts,
  bizDef,
  bizExpand,
  bizHire,
  bizImprove,
  bizLoan,
  bizMarketing,
  bizSeekInvestor,
  bizSell,
  bizSetPrices,
  bizShutDown,
  resolveBizEvent,
  startBusiness,
} from "../../game/business";
import type { BizResult } from "../../game/business";
import {
  ASSETS,
  PROPERTY_DEFS,
  STRATEGIES,
  applyStrategy,
  buyProperty,
  invest,
  portfolioValue,
  realEstateEquity,
  refinance,
  renovate,
  sellProperty,
  setRented,
  withdraw,
} from "../../game/investing";
import { CONTACT_TYPES, askForHelp, canAskHelp, catchUp, meetContact } from "../../game/contacts";
import type { BusinessKind, Character, LogTone, PropertyKind } from "../../game/types";
import { formatMoney } from "../../game/util";
import { PoliticsPage } from "./PoliticsPage";
import { AthleteView } from "./AthleteView";
import { CrimeView } from "./CrimeView";
import { EntertainmentView } from "./EntertainmentView";
import {
  FAVORS,
  acceptInvite,
  declineInvite,
  resolveObligation,
  callInFavor,
} from "../../game/society";
import { rankLabel } from "../../game/crime";

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

// ---------------------------------------------------------------------------

type HubView =
  | "overview"
  | "politics"
  | "athlete"
  | "entertainment"
  | "business"
  | "investing"
  | "crime"
  | "network";

export function SpecialCareersPage({ character, act }: { character: Character; act: Act }) {
  const c = character;
  const [view, setView] = useState<HubView>("overview");

  const tabs: { id: HubView; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "politics", label: "Politics" },
    { id: "athlete", label: "Athlete" },
    { id: "entertainment", label: "Stardom" },
    { id: "crime", label: "Crime" },
    { id: "business", label: "Business" },
    { id: "investing", label: "Investing" },
    { id: "network", label: "Network" },
  ];

  return (
    <div className="space-y-3">
      <div className="glass flex gap-1 overflow-x-auto rounded-2xl p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
              view === t.id
                ? "bg-primary/25 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "overview" && <Overview c={c} goTo={setView} />}
      {view === "politics" && <PoliticsPage character={c} act={act} />}
      {view === "athlete" && <AthleteView c={c} act={act} />}
      {view === "entertainment" && <EntertainmentView c={c} act={act} />}
      {view === "crime" && <CrimeView c={c} act={act} />}
      {view === "business" && <BusinessView c={c} act={act} />}
      {view === "investing" && <InvestingView c={c} act={act} />}
      {view === "network" && <NetworkView c={c} act={act} />}
    </div>
  );
}

// ---------- Overview: the path cards ----------

function PathCard({
  icon: Icon,
  title,
  status,
  lines,
  onOpen,
}: {
  icon: typeof Landmark;
  title: string;
  status: "Active" | "Available" | "Locked" | "Future";
  lines: string[];
  onOpen?: () => void;
}) {
  const badge =
    status === "Active"
      ? "bg-primary/25 text-foreground"
      : status === "Available"
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-white/10 text-muted-foreground";
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${status === "Future" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {status === "Future" ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Icon className="h-4 w-4 text-primary" />
          )}
          <p className="text-sm font-bold">{title}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>{status}</span>
      </div>
      <div className="mt-2 space-y-0.5">
        {lines.map((l, i) => (
          <p key={i} className="text-[11px] text-muted-foreground">
            {l}
          </p>
        ))}
      </div>
      {onOpen && status !== "Future" && (
        <button className={`${btn} mt-3 w-full`} onClick={onOpen}>
          Open
        </button>
      )}
    </div>
  );
}

function Overview({ c, goTo }: { c: Character; goTo: (v: HubView) => void }) {
  const adult = c.age >= 18;
  const pol = c.politics;
  const biz = c.businessHub;
  const inv = c.investing;
  const netWorth =
    c.money +
    (inv ? portfolioValue(inv) + realEstateEquity(inv) : 0) +
    (biz?.businesses.reduce(
      (s, b) => s + Math.max(0, (b.valuation + b.cash - b.loan) * (1 - b.investorOwned)),
      0,
    ) ?? 0);

  return (
    <div className="space-y-3">
      <Section
        icon={Sparkles}
        title="Special Paths"
        subtitle="Careers that play by their own rules. Each is a game inside the game."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Net Worth" value={formatMoney(Math.round(netWorth))} />
          <Stat label="Cash" value={formatMoney(Math.round(c.money))} />
          <Stat label="Networking" value={`${c.networking ?? 0}`} />
          <Stat label="Fame" value={`${c.fame}`} />
          <Stat label="Business Rep" value={`${c.businessReputation}`} />
          <Stat
            label="Criminal Record"
            value={c.criminalRecord > 0 ? `${c.criminalRecord} ⚠` : "Clean"}
          />
        </div>
      </Section>

      <div className="grid gap-2 sm:grid-cols-2">
        <PathCard
          icon={Landmark}
          title="Politics"
          status={pol?.office || pol?.campaign ? "Active" : adult ? "Available" : "Locked"}
          lines={[
            pol?.office ? `Office: ${pol.office.name}` : "No office held",
            `Requires: age 18+ · Prestige: Very High · Income: Modest`,
            `Risk: Scandal & elections · Difficulty: High · Work-life: Poor`,
            c.criminalRecord > 0
              ? "⚠ Criminal record makes elections much harder"
              : "Clean record — voters like that",
          ]}
          onOpen={() => goTo("politics")}
        />
        <PathCard
          icon={Store}
          title="Business / Entrepreneurship"
          status={biz?.businesses.length ? "Active" : adult ? "Available" : "Locked"}
          lines={[
            biz?.businesses.length
              ? `Running: ${biz.businesses.map((b) => b.name).join(", ")}`
              : "No businesses yet",
            `Requires: age 18+ and startup capital ($30k–$150k)`,
            `Income: Unlimited · Risk: High · Difficulty: High`,
            `Education & networking boost your odds`,
          ]}
          onOpen={() => goTo("business")}
        />
        <PathCard
          icon={LineChart}
          title="Investing"
          status={
            inv && (inv.holdings.length || inv.properties.length)
              ? "Active"
              : adult
                ? "Available"
                : "Locked"
          }
          lines={[
            inv
              ? `Portfolio: ${formatMoney(Math.round(portfolioValue(inv)))} · Properties: ${inv.properties.length}`
              : "No portfolio yet",
            `Requires: age 18+ and cash`,
            `Income: Compounding · Risk: You choose · Difficulty: Low to enter`,
            `Riskier assets swing harder both ways`,
          ]}
          onOpen={() => goTo("investing")}
        />
        <PathCard
          icon={Handshake}
          title="Networking"
          status={(c.contacts?.length ?? 0) > 0 ? "Active" : c.age >= 16 ? "Available" : "Locked"}
          lines={[
            `${c.contacts?.length ?? 0} named contacts`,
            `Meet investors, politicians, recruiters, lawyers...`,
            `Strong relationships unlock real favors`,
          ]}
          onOpen={() => goTo("network")}
        />
        <PathCard
          icon={Dumbbell}
          title="Professional Athlete"
          status={
            c.athlete?.sport
              ? c.athlete.stage === "retired"
                ? "Available"
                : "Active"
              : c.age >= 8 && c.age <= 22
                ? "Available"
                : "Locked"
          }
          lines={[
            c.athlete?.sport
              ? `${c.athlete.stage === "pro" ? "Pro" : c.athlete.stage} · skill ${c.athlete.skill}${c.athlete.majors ? ` · ${c.athlete.majors} majors` : ""}`
              : "No sport chosen yet",
            "Requires: start between 8-22 · elite talent & training",
            "Income: Very High · Risk: Injuries end careers · Span: Short",
            "Tennis is the deepest path: rankings, tour, Grand Slams",
          ]}
          onOpen={() => goTo("athlete")}
        />
        <PathCard
          icon={Music}
          title="Entertainment"
          status={c.entertainment ? "Active" : c.age >= 14 ? "Available" : "Locked"}
          lines={[
            c.entertainment
              ? `Earnings ${"$" + Math.round(c.entertainment.lifetimeEarnings).toLocaleString()} · Awards ${c.entertainment.awards} · Fame ${c.fame}`
              : "Music, acting, and the algorithm await",
            "Requires: age 14+ · Income: Feast or famine",
            "Fame feeds everything — and tabloids feed on fame",
          ]}
          onOpen={() => goTo("entertainment")}
        />
        <PathCard
          icon={Skull}
          title="Crime"
          status={
            c.crime?.active || c.crime?.prison ? "Active" : c.age >= 16 ? "Available" : "Locked"
          }
          lines={[
            c.crime?.prison
              ? `INCARCERATED — ${c.crime.prison.facility}, year ${c.crime.prison.yearsServed}/${c.crime.prison.sentence}`
              : c.crime?.active
                ? `${rankLabel(c.crime.rank)}${c.crime.syndicate ? ` · ${c.crime.syndicate}` : ""} · heat ${c.crime.heat}`
                : "Clean hands, so far",
            "Requires: age 16+ and bad decisions",
            "Income: High · Risk: Catastrophic · Smart play can win",
            "Convictions stain jobs, loans, and politics permanently",
          ]}
          onOpen={() => goTo("crime")}
        />
        <PathCard
          icon={Briefcase}
          title="Combat Sports"
          status={c.athlete?.sport === "mma" ? "Active" : c.age >= 8 ? "Available" : "Locked"}
          lines={[
            c.athlete?.sport === "mma"
              ? `${c.athlete.beltHolder ? "CHAMPION 🏆" : `Record ${c.athlete.fightWins ?? 0}-${c.athlete.fightLosses ?? 0}`} · wear ${c.athlete.chronicWear}/100`
              : "Now part of the Athlete path — pick MMA as your sport",
            "Fight cards, purses, title shots — and permanent damage",
            "Every fight leaves a mark that never heals",
          ]}
          onOpen={() => goTo("athlete")}
        />
        <PathCard
          icon={HeartHandshake}
          title="Secret Societies"
          status={c.society?.member ? "Active" : c.society?.pendingInvite ? "Available" : "Locked"}
          lines={[
            c.society?.member
              ? `${c.society.member} · standing ${c.society.standing} · ${c.society.favors} favor(s) banked`
              : c.society?.pendingInvite
                ? `An envelope waits: ${c.society.pendingInvite}`
                : c.society?.enemy
                  ? "You made an enemy that has no name"
                  : "By invitation only — wealth, office, or fame gets you noticed",
            "Obligations earn favors that reach into every system",
            "Refuse the wrong request twice and the doors work against you",
          ]}
          onOpen={() => goTo("network")}
        />
        <PathCard
          icon={Crown}
          title="Royalty / Elite Society"
          status="Future"
          lines={["Coming in a future build", "Marry in, buy in, or be born again luckier"]}
        />
      </div>
    </div>
  );
}

// ---------- Business ----------

function BusinessView({ c, act }: { c: Character; act: Act }) {
  const [kind, setKind] = useState<BusinessKind>("restaurant");
  const [name, setName] = useState("");
  const hub = c.businessHub;
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  const def = bizDef(kind);

  return (
    <div className="space-y-3">
      <Section
        icon={Store}
        title="Your Businesses"
        subtitle={`Energy this year: ${energyLeft}/${ACTIONS_PER_YEAR} · Lifetime profit: ${formatMoney(hub?.lifetimeProfit ?? 0)} · Exits: ${formatMoney(hub?.soldFor ?? 0)}`}
      >
        {!hub?.businesses.length && (
          <p className="text-xs text-muted-foreground">
            No businesses yet. Every empire starts with one risky signature below.
          </p>
        )}
        <div className="space-y-3">
          {hub?.businesses.map((b) => (
            <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">
                    {b.name}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      · {bizDef(b.kind).label}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Valuation {formatMoney(b.valuation)} · Your stake{" "}
                    {Math.round((1 - b.investorOwned) * 100)}% · Year {b.yearsRunning}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold ${b.profit >= 0 ? "text-emerald-300" : "text-red-400"}`}
                >
                  {b.profit >= 0 ? "+" : ""}
                  {formatMoney(b.profit)}/yr
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px] sm:grid-cols-6">
                <Stat label="Cash" value={formatMoney(b.cash)} />
                <Stat label="Revenue" value={formatMoney(b.revenue)} />
                <Stat label="Employees" value={`${b.employees}`} />
                <Stat label="Reputation" value={`${b.reputation}`} />
                <Stat label="Satisfaction" value={`${b.satisfaction}`} />
                <Stat label="Growth" value={`${b.growth}%`} />
              </div>
              {b.loan > 0 && (
                <p className="mt-1 text-[11px] text-amber-400/90">
                  Outstanding loan: {formatMoney(b.loan)} (7%)
                </p>
              )}

              {b.pendingEvent && (
                <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3">
                  <p className="flex items-center gap-1 text-xs font-bold">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> {b.pendingEvent.title}
                  </p>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    {b.pendingEvent.description}
                  </p>
                  <div className="space-y-1.5">
                    {b.pendingEvent.options.map((o, i) => (
                      <button
                        key={i}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] transition hover:bg-white/10 ${
                          o.corrupt || o.criminal
                            ? "border-red-400/40 bg-red-500/5"
                            : "border-white/10 bg-white/5"
                        }`}
                        onClick={() => act((ch) => resolveBizEvent(ch, b.id, i) as BizResult)}
                      >
                        {o.label}
                        {(o.corrupt || o.criminal) && (
                          <span className="ml-1 text-[10px] font-bold text-red-400">
                            RISKY / ILLEGAL
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  className={btn}
                  onClick={() => act((ch) => bizHire(ch, b.id, trySpendEnergy))}
                >
                  Hire (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizMarketing(ch, b.id, trySpendEnergy))}
                >
                  Marketing (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizImprove(ch, b.id, trySpendEnergy))}
                >
                  Improve (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizCutCosts(ch, b.id, trySpendEnergy))}
                >
                  Cut Costs (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizSetPrices(ch, b.id, "raise", trySpendEnergy))}
                >
                  Raise Prices (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizSetPrices(ch, b.id, "lower", trySpendEnergy))}
                >
                  Lower Prices (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizExpand(ch, b.id, trySpendEnergy))}
                >
                  Expand (1⚡)
                </button>
                <button
                  className={btn}
                  onClick={() => act((ch) => bizSeekInvestor(ch, b.id, trySpendEnergy))}
                >
                  Seek Investor (1⚡)
                </button>
                <button className={btnGhost} onClick={() => act((ch) => bizLoan(ch, b.id))}>
                  Take Loan
                </button>
                <button className={btnGhost} onClick={() => act((ch) => bizSell(ch, b.id))}>
                  Sell Business
                </button>
                <button className={btnGhost} onClick={() => act((ch) => bizShutDown(ch, b.id))}>
                  <X className="mr-1 inline h-3 w-3" />
                  Shut Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon={Rocket}
        title="Start a Business"
        subtitle="Pick your poison. Startup cost comes out of personal savings."
      >
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {BUSINESS_DEFS.map((d) => (
            <button
              key={d.kind}
              onClick={() => setKind(d.kind)}
              className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                kind === d.kind
                  ? "border-primary/60 bg-primary/20 font-semibold"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <p>{d.label}</p>
              <p className="text-[10px] opacity-70">{formatMoney(d.startupCost)}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {def.label}: startup {formatMoney(def.startupCost)} · risk {def.risk}/100 · valuation
          multiple {def.multiple}x
          {def.eduFields.length ? ` · boosted by ${def.eduFields.join("/")} education` : ""}
        </p>
        <div className="mt-2 flex gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Name your ${def.label.toLowerCase()}`}
            className="w-full rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
          />
          <button
            className={btn}
            disabled={c.money < def.startupCost || c.age < 18}
            onClick={() => {
              act((ch) => startBusiness(ch, kind, name));
              setName("");
            }}
          >
            Found It
          </button>
        </div>
        {c.money < def.startupCost && (
          <p className="mt-1 text-[11px] text-red-400/90">
            You need {formatMoney(def.startupCost - Math.round(c.money))} more.
          </p>
        )}
      </Section>
    </div>
  );
}

// ---------- Investing ----------

const QUICK_AMOUNTS = [1000, 5000, 10000, 50000];

function InvestingView({ c, act }: { c: Character; act: Act }) {
  const inv = c.investing;
  const [amount, setAmount] = useState(10000);
  const [propKind, setPropKind] = useState<PropertyKind>("condo");
  const pv = inv ? portfolioValue(inv) : 0;
  const totalInvested = inv?.holdings.reduce((s, h) => s + h.invested, 0) ?? 0;
  const unrealized = pv - totalInvested;

  return (
    <div className="space-y-3">
      <Section
        icon={TrendingUp}
        title="Portfolio"
        subtitle={
          inv
            ? `Last year's return: ${inv.lastYearReturnPct >= 0 ? "+" : ""}${inv.lastYearReturnPct}% · Lifetime income collected: ${formatMoney(Math.round(inv.incomeLifetime))}`
            : "Money sitting in cash quietly loses the race."
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Portfolio Value" value={formatMoney(Math.round(pv))} />
          <Stat label="Cash Invested" value={formatMoney(Math.round(totalInvested))} />
          <Stat
            label="Unrealized P/L"
            value={`${unrealized >= 0 ? "+" : ""}${formatMoney(Math.round(unrealized))}`}
          />
          <Stat label="Realized Gains" value={formatMoney(Math.round(inv?.realizedGains ?? 0))} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Amount:</span>
          {QUICK_AMOUNTS.map((a) => (
            <button key={a} className={amount === a ? btn : btnGhost} onClick={() => setAmount(a)}>
              {formatMoney(a)}
            </button>
          ))}
          <input
            type="number"
            value={amount}
            min={100}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-28 rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
          />
          <span className="text-[11px] text-muted-foreground">
            Cash: {formatMoney(Math.round(c.money))}
          </span>
        </div>

        <div className="mt-2 space-y-1.5">
          {ASSETS.map((a) => {
            const h = inv?.holdings.find((x) => x.asset === a.id);
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold">
                    {a.label}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {a.risk} risk · ~{a.expReturn}%/yr
                      {a.incomeYield ? ` · yields ${a.incomeYield}%` : ""}
                    </span>
                  </p>
                  {h && (
                    <p className="text-[11px] text-muted-foreground">
                      Holding {formatMoney(Math.round(h.value))} (basis{" "}
                      {formatMoney(Math.round(h.invested))},{" "}
                      <span className={h.value >= h.invested ? "text-emerald-300" : "text-red-400"}>
                        {h.value >= h.invested ? "+" : ""}
                        {formatMoney(Math.round(h.value - h.invested))}
                      </span>
                      )
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    className={btn}
                    disabled={c.money < amount || amount <= 0}
                    onClick={() => act((ch) => invest(ch, a.id, amount))}
                  >
                    Buy
                  </button>
                  <button
                    className={btnGhost}
                    disabled={!h || h.value <= 0}
                    onClick={() => act((ch) => withdraw(ch, a.id, amount))}
                  >
                    Sell
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mb-1 mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          One-Click Strategies
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              className={btnGhost}
              disabled={c.money < amount || amount <= 0}
              onClick={() => act((ch) => applyStrategy(ch, s.id, amount))}
            >
              {s.label} ({formatMoney(amount)})
            </button>
          ))}
        </div>
      </Section>

      <Section
        icon={Building2}
        title="Real Estate"
        subtitle={
          inv?.properties.length
            ? `Equity: ${formatMoney(Math.round(realEstateEquity(inv)))}`
            : "20% down, the bank owns the rest — the classic ladder."
        }
      >
        <div className="space-y-2">
          {inv?.properties.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold">
                  {p.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {PROPERTY_DEFS.find((d) => d.kind === p.kind)?.label}
                  </span>
                </p>
                <span className="text-[11px] text-muted-foreground">Owned {p.yearsOwned} yr</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Value {formatMoney(p.value)} · Mortgage {formatMoney(p.mortgage)} · Rent{" "}
                {formatMoney(p.rent)}/yr ·{" "}
                {p.rented ? (p.vacantYear ? "VACANT this year" : "Rented") : "Not rented"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  className={btnGhost}
                  onClick={() => act((ch) => setRented(ch, p.id, !p.rented))}
                >
                  {p.rented ? "Stop Renting" : "Rent It Out"}
                </button>
                <button className={btnGhost} onClick={() => act((ch) => renovate(ch, p.id))}>
                  Renovate ({formatMoney(Math.round(p.value * 0.05))})
                </button>
                <button className={btnGhost} onClick={() => act((ch) => refinance(ch, p.id))}>
                  Refinance
                </button>
                <button className={btnGhost} onClick={() => act((ch) => sellProperty(ch, p.id))}>
                  Sell
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {PROPERTY_DEFS.map((d) => (
            <button
              key={d.kind}
              className={propKind === d.kind ? btn : btnGhost}
              onClick={() => setPropKind(d.kind)}
            >
              {d.label}
            </button>
          ))}
          <button className={btn} onClick={() => act((ch) => buyProperty(ch, propKind))}>
            <Banknote className="mr-1 inline h-3.5 w-3.5" />
            Buy ({formatMoney(PROPERTY_DEFS.find((d) => d.kind === propKind)!.price[0])}–
            {formatMoney(PROPERTY_DEFS.find((d) => d.kind === propKind)!.price[1])})
          </button>
        </div>
      </Section>
    </div>
  );
}

// ---------- Network ----------

function NetworkView({ c, act }: { c: Character; act: Act }) {
  const contacts = c.contacts ?? [];
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  return (
    <div className="space-y-3">
      <Section
        icon={Users}
        title="Your Network"
        subtitle={`Networking stat: ${c.networking ?? 0} · Energy: ${energyLeft}/${ACTIONS_PER_YEAR} · Relationships fade 2/yr if neglected.`}
      >
        <button
          className={`${btn} w-full`}
          onClick={() => act((ch) => meetContact(ch, trySpendEnergy))}
        >
          <Handshake className="mr-1 inline h-3.5 w-3.5" /> Work the Room — Meet Someone New (1⚡)
        </button>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Who you meet depends on the life you lead: founders attract investors, politicians attract
          donors, fame attracts agents.
        </p>

        <div className="mt-3 space-y-1.5">
          {contacts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nobody yet. Your future self is begging you to fix that.
            </p>
          )}
          {contacts.map((ct) => {
            const meta = CONTACT_TYPES.find((t) => t.id === ct.type)!;
            const gate = canAskHelp(c, ct);
            return (
              <div key={ct.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold">
                      {ct.name}{" "}
                      <span className="font-normal text-muted-foreground">· {meta.label}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Relationship {ct.relationship}/100 · Met at {ct.metAge}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Favor: {meta.help}</p>
                    {!gate.ok && <p className="text-[11px] text-amber-400/90">{gate.reason}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      className={btnGhost}
                      onClick={() => act((ch) => catchUp(ch, ct.id, trySpendEnergy))}
                    >
                      Catch Up (1⚡)
                    </button>
                    <button
                      className={btn}
                      disabled={!gate.ok}
                      onClick={() => act((ch) => askForHelp(ch, ct.id))}
                    >
                      Ask for Help
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {(c.society?.member || c.society?.pendingInvite || c.society?.enemy) && (
        <Section
          icon={HeartHandshake}
          title="Secret Society"
          subtitle={
            c.society.member
              ? `${c.society.member} · standing ${c.society.standing}/100 · favors banked: ${c.society.favors}`
              : c.society.pendingInvite
                ? "An invitation, sealed in wax"
                : "You are remembered, unfavorably"
          }
        >
          {c.society.pendingInvite && (
            <div className="mb-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs font-semibold">
                {c.society.pendingInvite} requests the pleasure of your discretion.
              </p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Membership means obligations — and favors that reach places money can't.
              </p>
              <div className="flex gap-1.5">
                <button className={btn} onClick={() => act(acceptInvite)}>
                  Accept Initiation
                </button>
                <button className={btnGhost} onClick={() => act(declineInvite)}>
                  Decline
                </button>
              </div>
            </div>
          )}

          {c.society.pendingObligation && (
            <div className="mb-2 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3">
              <p className="text-xs font-bold">{c.society.pendingObligation.title}</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                {c.society.pendingObligation.description}
              </p>
              <div className="flex gap-1.5">
                <button className={btn} onClick={() => act((ch) => resolveObligation(ch, true))}>
                  Comply
                  {c.society.pendingObligation.cost.money
                    ? ` (${formatMoney(c.society.pendingObligation.cost.money)})`
                    : ""}
                </button>
                <button
                  className={btnGhost}
                  onClick={() => act((ch) => resolveObligation(ch, false))}
                >
                  Refuse
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Compliance earns a favor. Two refusals from low standing, and you become the kind of
                problem the society solves.
              </p>
            </div>
          )}

          {c.society.member && (
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                Call in a Favor ({c.society.favors} banked)
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {FAVORS.map((f) => (
                  <button
                    key={f.id}
                    className={btnGhost}
                    disabled={(c.society?.favors ?? 0) < 1}
                    onClick={() => act((ch) => callInFavor(ch, f.id))}
                  >
                    <span className="font-semibold">{f.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{f.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {c.society.enemy && !c.society.member && (
            <p className="text-[11px] text-red-400">
              The society works against you now — contracts slip away, doors close, whispers travel.
              Time may soften it. May.
            </p>
          )}
        </Section>
      )}
    </div>
  );
}
