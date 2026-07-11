import { useState } from "react";
import {
  Anchor,
  Archive,
  BookOpen,
  Building2,
  Castle,
  Crown,
  Gem,
  GitBranch,
  HandHeart,
  Heart,
  KeyRound,
  Landmark,
  Martini,
  Newspaper,
  PiggyBank,
  Repeat,
  Scale,
  Swords,
  Users,
} from "lucide-react";
import { trySpendEnergy } from "../../game/engine";
import {
  CONSTITUTION_RULES,
  adoptRule,
  establishCouncil,
  reaffirmRule,
  repealRule,
  resolveCouncil,
  ruleDef,
} from "../../game/council";
import { ensureRivals, investigateRival, useLeverage } from "../../game/rivals";
import type { LeverageUse } from "../../game/rivals";
import {
  OFFICE_TIERS,
  approveLoan,
  forgiveLoan,
  giftInstead,
  pressLoan,
  refuseLoan,
  setOfficeTier,
  spinScandal,
  suppressScandal,
} from "../../game/familybank";
import {
  MATCH_TARGETS,
  arrangeIntroduction,
  assignHeirloom,
  commissionHeirloom,
  foundBranch,
} from "../../game/matchmaking";
import { renameSeat, renovateSeat } from "../../game/lifestyle";
import {
  ESTATE_UPGRADES,
  STAFF_ROLES,
  TRANSPORT_DEFS,
  buildEstateUpgrade,
  buyBerth,
  buyTransport,
  dismissStaff,
  estateMaintenance,
  estateValue,
  hireStaff,
  historicalSignificance,
  raiseStaff,
  refitTransport,
  sellTransport,
  seatUpgrades,
  staffDef,
  staffPayroll,
  staffQuality,
  transportUpkeep,
  visitorCapacity,
} from "../../game/lifestyle";
import {
  CLUB_DEFS,
  TRADITION_DEFS,
  applyToClub,
  attendClub,
  clubEligibility,
  endTradition,
  establishTradition,
  resignClub,
  setTraditionActive,
} from "../../game/clubs";
import {
  COLLECTION_CATEGORIES,
  acquirePiece,
  collectionCategory,
  collectionsValue,
  sellPiece,
} from "../../game/collections";
import {
  BOARD_DEFS,
  BUILDING_DEFS,
  CAUSES,
  boardEligibility,
  createFoundation,
  donate,
  fundBuilding,
  fundFoundation,
  joinBoard,
  resignBoard,
} from "../../game/philanthropy";
import {
  DYNASTY_GOALS,
  familyNetWorth,
  legacyProgress,
  prestigeBreakdown,
} from "../../game/prestige";
import { descendantCount } from "../../game/familytree";
import { switchToChild } from "../../game/generational";
import type { DescendantRecord } from "../../game/types";
import { FamilyView } from "./FamilyView";
import { LegacyView } from "./LegacyView";
import type { Character, LogTone } from "../../game/types";
import { formatMoney } from "../../game/util";

type AnyResult = {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
};
type Act = (fn: (c: Character) => AnyResult) => void;

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";
const btnDanger =
  "rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40";
const inputCls =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
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
      {subtitle && (
        <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-xs font-bold">{value}</p>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-primary"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type DynView =
  | "overview"
  | "family"
  | "estate"
  | "clubs"
  | "traditions"
  | "collections"
  | "philanthropy"
  | "library"
  | "council"
  | "rivals"
  | "bank"
  | "archives"
  | "legacy";

export function FamilyDynastyPage({
  character,
  act,
}: {
  character: Character;
  act: Act;
}) {
  const c = character;
  const [view, setView] = useState<DynView>("overview");

  const tabs: { id: DynView; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "family", label: "Family" },
    { id: "estate", label: "Estate" },
    { id: "clubs", label: "Clubs" },
    { id: "traditions", label: "Traditions" },
    { id: "council", label: "Council" },
    { id: "rivals", label: "Rivals" },
    { id: "bank", label: "Bank" },
    { id: "collections", label: "Collections" },
    { id: "philanthropy", label: "Philanthropy" },
    { id: "library", label: "Library" },
    { id: "archives", label: "Archives" },
    { id: "legacy", label: "Legacy" },
  ];

  return (
    <div className="space-y-3">
      <div className="glass no-scrollbar flex gap-1 overflow-x-auto rounded-2xl p-1.5">
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

      {view === "overview" && <OverviewView c={c} act={act} />}
      {view === "family" && (
        <div className="space-y-3">
          <FamilyView c={c} act={act} />
          <MatchmakingSection c={c} act={act} />
          <ExtendedFamily c={c} />
          <SuccessionSection c={c} act={act} />
        </div>
      )}
      {view === "estate" && <EstateView c={c} act={act} />}
      {view === "clubs" && <ClubsView c={c} act={act} />}
      {view === "traditions" && <TraditionsView c={c} act={act} />}
      {view === "collections" && (
        <div className="space-y-3">
          <CollectionsView c={c} act={act} />
          <HeirloomsSection c={c} act={act} />
        </div>
      )}
      {view === "philanthropy" && <PhilanthropyView c={c} act={act} />}
      {view === "library" && <LibraryView c={c} />}
      {view === "archives" && <ArchivesView c={c} />}
      {view === "council" && <CouncilView c={c} act={act} />}
      {view === "rivals" && <RivalsView c={c} act={act} />}
      {view === "bank" && <BankView c={c} act={act} />}
      {view === "legacy" && <LegacyView c={c} act={act} />}
    </div>
  );
}

// ---------- Overview: the dynasty dashboard ----------

function OverviewView({ c, act }: { c: Character; act: Act }) {
  const d = c.dynasty;
  const p = prestigeBreakdown(c);
  const goalsDone = d?.goalsDone ?? [];
  const descendants = descendantCount(c);

  return (
    <div className="space-y-3">
      <ScandalBanner c={c} act={act} />
      <Section
        icon={Crown}
        title={d ? `House ${d.familyName}` : "The Family"}
        subtitle="The dashboard of a dynasty. Everything below outlives you — that is the point."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Family Net Worth"
            value={formatMoney(familyNetWorth(c))}
          />
          <Stat label="Dynasty Prestige" value={`${p.overall}/100`} />
          <Stat label="Dynasty Score" value={`${d?.legacyScore ?? 0}`} />
          <Stat label="Family Unity" value={`${d?.unity ?? 60}/100`} />
          <Stat label="Reputation" value={`${d?.reputation ?? 40}/100`} />
          <Stat label="Estate Value" value={formatMoney(estateValue(c))} />
          <Stat
            label="Philanthropy"
            value={`${Math.round(d?.foundation?.impact ?? 0)}/100`}
          />
          <Stat label="Legacy Progress" value={`${legacyProgress(c)}%`} />
          <Stat label="Descendants" value={`${descendants}`} />
          <Stat label="Generations" value={`${d?.generation ?? 1}`} />
          <Stat
            label="Businesses"
            value={`${c.businessHub?.businesses.length ?? 0}`}
          />
          <Stat label="Foundations" value={`${d?.foundation ? 1 : 0}`} />
          <Stat
            label="Traditions"
            value={`${d?.traditions?.filter((t) => t.active).length ?? 0}`}
          />
          <Stat label="Archive Entries" value={`${d?.archives?.length ?? 0}`} />
          <Stat label="Library Items" value={`${d?.library?.length ?? 0}`} />
          <Stat
            label="Named Buildings"
            value={`${d?.namedBuildings?.length ?? 0}`}
          />
        </div>
      </Section>

      <Section
        icon={Gem}
        title="Prestige"
        subtitle="Seven kinds of standing, one name."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Bar label="Wealth" value={p.wealth} />
          <Bar label="Academic" value={p.academic} />
          <Bar label="Political" value={p.political} />
          <Bar label="Athletic" value={p.athletic} />
          <Bar label="Business" value={p.business} />
          <Bar label="Philanthropic" value={p.philanthropic} />
          <Bar label="Social" value={p.social} />
          <Bar label="Overall" value={p.overall} />
        </div>
      </Section>

      <Section
        icon={Landmark}
        title="Dynasty Goals"
        subtitle="Objectives no single lifetime can finish."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {DYNASTY_GOALS.map((g) => {
            const done = goalsDone.includes(g.id);
            return (
              <div
                key={g.id}
                className={`rounded-xl border p-3 ${done ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5"}`}
              >
                <p className="text-sm font-bold">
                  {done ? "✓ " : ""}
                  {g.title}
                </p>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ---------- Estate: upgrades, staff, transport ----------

function EstateView({ c, act }: { c: Character; act: Act }) {
  const seat = c.dynasty?.seat;
  const owned = new Set(seat?.upgrades ?? []);
  const staff = c.lifestyle?.staff ?? [];
  const fleet = c.lifestyle?.transport ?? [];

  return (
    <div className="space-y-3">
      <SeatCustomization c={c} act={act} />
      <Section
        icon={Castle}
        title={seat ? seat.name : "The Family Estate"}
        subtitle={
          seat
            ? "The Seat, and everything bolted onto it. Maintenance, staff and taxes are paid every year automatically."
            : "Acquire a Family Seat first (Legacy tab) — everything here builds on it."
        }
      >
        {seat && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Estate Value" value={formatMoney(estateValue(c))} />
            <Stat
              label="Annual Upkeep + Tax"
              value={formatMoney(estateMaintenance(c))}
            />
            <Stat label="Staff Payroll" value={formatMoney(staffPayroll(c))} />
            <Stat label="House Prestige" value={`${seat.housePrestige}/100`} />
            <Stat label="Visitor Capacity" value={`${visitorCapacity(c)}`} />
            <Stat
              label="Historical Significance"
              value={`${historicalSignificance(c)}/100`}
            />
            <Stat label="Years Held" value={`${seat.yearsHeld}`} />
            <Stat label="Staff Quality" value={`${staffQuality(c)}/100`} />
          </div>
        )}
      </Section>

      {seat && (
        <Section
          icon={Building2}
          title="Estate Upgrades"
          subtitle="Grounds are bought once and paid for forever."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {ESTATE_UPGRADES.map((u) => {
              const has = owned.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {has ? "✓ " : ""}
                      {u.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatMoney(u.cost)} · upkeep{" "}
                      {formatMoney(u.maintenance)}/yr · +{u.prestige} prestige
                    </p>
                  </div>
                  {!has && (
                    <button
                      className={btn}
                      disabled={c.money < u.cost}
                      onClick={() => act((ch) => buildEstateUpgrade(ch, u.id))}
                    >
                      Build
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        icon={Users}
        title="Household Staff"
        subtitle="Good staff are the quietest luxury. Salaries are paid yearly; unpaid staff leave."
      >
        {staff.length > 0 && (
          <div className="mb-3 space-y-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">
                    {s.name} — {staffDef(s.role)?.role ?? s.role}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Competence {s.competence} · Loyalty {s.loyalty} ·{" "}
                    {s.experience} yrs · {formatMoney(s.salary)}/yr
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={btnGhost}
                    onClick={() => act((ch) => raiseStaff(ch, s.id))}
                  >
                    Raise
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => act((ch) => dismissStaff(ch, s.id))}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {STAFF_ROLES.filter((r) => !staff.some((s) => s.role === r.id)).map(
            (r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">{r.role}</p>
                  <p className="text-[11px] text-muted-foreground">
                    ~{formatMoney(r.baseSalary)}/yr · {r.hint}
                  </p>
                </div>
                <button
                  className={btn}
                  onClick={() => act((ch) => hireStaff(ch, r.id))}
                >
                  Hire
                </button>
              </div>
            ),
          )}
        </div>
      </Section>

      <Section
        icon={Anchor}
        title="Private Aviation & Transport"
        subtitle="A hole in the sky or the water that you pour money into, beautifully."
      >
        {fleet.length > 0 && (
          <div className="mb-3 space-y-2">
            {fleet.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">
                    {t.name}
                    {t.upgraded ? " · refitted" : ""}
                    {t.berth ? " · berthed" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Value {formatMoney(t.value)} · crew {t.crew} ·{" "}
                    {formatMoney(t.upkeep)}/yr
                  </p>
                </div>
                <div className="flex gap-2">
                  {!t.upgraded && (
                    <button
                      className={btnGhost}
                      onClick={() => act((ch) => refitTransport(ch, t.id))}
                    >
                      Refit
                    </button>
                  )}
                  {!t.berth && (
                    <button
                      className={btnGhost}
                      onClick={() => act((ch) => buyBerth(ch, t.id))}
                    >
                      Berth
                    </button>
                  )}
                  <button
                    className={btnDanger}
                    onClick={() => act((ch) => sellTransport(ch, t.id))}
                  >
                    Sell
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Total running costs: {formatMoney(transportUpkeep(c))}/yr
            </p>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {TRANSPORT_DEFS.filter(
            (d) => !fleet.some((t) => t.kind === d.kind),
          ).map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div>
                <p className="text-sm font-bold">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(d.cost)} · {formatMoney(d.upkeep)}/yr · crew{" "}
                  {d.crew}
                </p>
              </div>
              <button
                className={btn}
                disabled={c.money < d.cost}
                onClick={() => act((ch) => buyTransport(ch, d.id))}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------- Clubs ----------

function ClubsView({ c, act }: { c: Character; act: Act }) {
  const memberships = c.clubs ?? [];
  return (
    <div className="space-y-3">
      <Section
        icon={Martini}
        title="Private Clubs"
        subtitle="Invitation-only. Membership depends on wealth, standing and connections; dues are paid yearly."
      >
        {memberships.length > 0 && (
          <div className="mb-3 space-y-2">
            {memberships.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Member {m.yearsMember} yr{m.yearsMember === 1 ? "" : "s"} ·
                    standing {m.standing}/100
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={btn}
                    onClick={() =>
                      act((ch) => attendClub(ch, m.id, trySpendEnergy))
                    }
                  >
                    Attend (1 energy)
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => act((ch) => resignClub(ch, m.id))}
                  >
                    Resign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {CLUB_DEFS.filter((d) => !memberships.some((m) => m.id === d.id)).map(
            (d) => {
              const elig = clubEligibility(c, d);
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="text-sm font-bold">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Initiation {formatMoney(d.initiation)} · dues{" "}
                    {formatMoney(d.dues)}/yr · {d.perk}
                  </p>
                  {!elig.ok && (
                    <p className="mt-1 text-[11px] text-red-300">{elig.why}</p>
                  )}
                  <button
                    className={`${btn} mt-2`}
                    disabled={!elig.ok || c.money < d.initiation + d.dues}
                    onClick={() =>
                      act((ch) => applyToClub(ch, d.id, trySpendEnergy))
                    }
                  >
                    Apply (1 energy)
                  </button>
                </div>
              );
            },
          )}
        </div>
      </Section>
    </div>
  );
}

// ---------- Traditions ----------

function TraditionsView({ c, act }: { c: Character; act: Act }) {
  const [customName, setCustomName] = useState("");
  const traditions = c.dynasty?.traditions ?? [];
  return (
    <div className="space-y-3">
      <Section
        icon={Repeat}
        title="Family Traditions"
        subtitle={`Held automatically each year while active and affordable. Skipping repeatedly erodes Family Unity (currently ${c.dynasty?.unity ?? 60}/100).`}
      >
        {traditions.length > 0 && (
          <div className="mb-3 space-y-2">
            {traditions.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">
                    {t.active ? "" : "⏸ "}
                    {t.name}
                    {t.custom ? " (custom)" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.yearsMaintained} yr{t.yearsMaintained === 1 ? "" : "s"}{" "}
                    kept · {formatMoney(t.cost)}/yr · spent{" "}
                    {formatMoney(t.totalSpent)}
                    {t.attendance ? ` · last attendance ${t.attendance}` : ""}
                    {t.missedStreak ? ` · missed ${t.missedStreak}×` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={btnGhost}
                    onClick={() =>
                      act((ch) => setTraditionActive(ch, t.id, !t.active))
                    }
                  >
                    {t.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => act((ch) => endTradition(ch, t.id))}
                  >
                    End
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {TRADITION_DEFS.filter(
            (d) => !traditions.some((t) => t.id === d.id),
          ).map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div>
                <p className="text-sm font-bold">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(d.cost)}/yr · +unity {d.unity} · +prestige{" "}
                  {d.prestige}
                </p>
              </div>
              <button
                className={btn}
                onClick={() => act((ch) => establishTradition(ch, d.id))}
              >
                Establish
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Create a custom tradition…"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <button
            className={btn}
            disabled={!customName.trim()}
            onClick={() => {
              act((ch) => establishTradition(ch, customName, true));
              setCustomName("");
            }}
          >
            Establish
          </button>
        </div>
      </Section>
    </div>
  );
}

// ---------- Collections ----------

function CollectionsView({ c, act }: { c: Character; act: Act }) {
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const items = c.dynasty?.collections ?? [];
  return (
    <div className="space-y-3">
      <Section
        icon={Gem}
        title="Luxury Collections"
        subtitle={`Inheritable — pieces stay with the dynasty across generations. Total value ${formatMoney(collectionsValue(c))}.`}
      >
        {items.length > 0 && (
          <div className="mb-3 space-y-2">
            {items.map((p) => {
              const cat = collectionCategory(p.category);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {p.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({cat?.name ?? p.category})
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Value {formatMoney(p.value)} · paid{" "}
                      {formatMoney(p.boughtFor)} · significance {p.significance}
                      /100
                    </p>
                  </div>
                  <button
                    className={btnDanger}
                    onClick={() => act((ch) => sellPiece(ch, p.id))}
                  >
                    Auction
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {COLLECTION_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold">{cat.name}</p>
              <p className="text-[11px] text-muted-foreground">
                From {formatMoney(cat.min)} · ~{cat.drift}%/yr appreciation
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  className={`${inputCls} w-32`}
                  placeholder={`${cat.min}`}
                  inputMode="numeric"
                  value={budgets[cat.id] ?? ""}
                  onChange={(e) =>
                    setBudgets({
                      ...budgets,
                      [cat.id]: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) =>
                      acquirePiece(
                        ch,
                        cat.id,
                        Number(budgets[cat.id] || cat.min),
                      ),
                    )
                  }
                >
                  Acquire
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------- Philanthropy: foundation, buildings, boards ----------

function PhilanthropyView({ c, act }: { c: Character; act: Act }) {
  const d = c.dynasty;
  const f = d?.foundation;
  const [fdnName, setFdnName] = useState("");
  const [seed, setSeed] = useState("1000000");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [viaFdn, setViaFdn] = useState(false);
  const boards = c.boards ?? [];

  return (
    <div className="space-y-3">
      <Section
        icon={HandHeart}
        title="Family Foundation"
        subtitle="An endowment that gives 5% away every year and earns its keep in reputation."
      >
        {f ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Foundation" value={f.name} />
            <Stat label="Assets" value={formatMoney(f.assets)} />
            <Stat
              label="Lifetime Giving"
              value={formatMoney(f.lifetimeDonations)}
            />
            <Stat label="Social Impact" value={`${Math.round(f.impact)}/100`} />
            <Stat label="Scholarships" value={`${f.scholarships}`} />
            <Stat label="Causes" value={`${f.causes.length}`} />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder={`The ${d?.familyName ?? "Family"} Foundation`}
              value={fdnName}
              onChange={(e) => setFdnName(e.target.value)}
            />
            <input
              className={`${inputCls} w-36`}
              inputMode="numeric"
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <button
              className={btn}
              onClick={() =>
                act((ch) => createFoundation(ch, fdnName, Number(seed || 0)))
              }
            >
              Charter Foundation
            </button>
          </div>
        )}
        {f && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} w-36`}
              placeholder="500000"
              inputMode="numeric"
              value={amounts["topup"] ?? ""}
              onChange={(e) =>
                setAmounts({
                  ...amounts,
                  topup: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
            />
            <button
              className={btn}
              onClick={() =>
                act((ch) => fundFoundation(ch, Number(amounts["topup"] || 0)))
              }
            >
              Add to Corpus
            </button>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={viaFdn}
                onChange={(e) => setViaFdn(e.target.checked)}
              />
              Give via foundation
            </label>
          </div>
        )}
      </Section>

      <Section
        icon={HandHeart}
        title="Give"
        subtitle="Impact is the only return that compounds after death."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {CAUSES.map((cause) => (
            <div
              key={cause.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold">{cause.name}</p>
              <p className="text-[11px] text-muted-foreground">
                From {formatMoney(cause.min)}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  className={`${inputCls} w-32`}
                  placeholder={`${cause.min}`}
                  inputMode="numeric"
                  value={amounts[cause.id] ?? ""}
                  onChange={(e) =>
                    setAmounts({
                      ...amounts,
                      [cause.id]: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />
                <button
                  className={btn}
                  onClick={() =>
                    act((ch) =>
                      donate(
                        ch,
                        cause.id,
                        Number(amounts[cause.id] || cause.min),
                        viaFdn,
                      ),
                    )
                  }
                >
                  Donate
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon={Building2}
        title="Named Buildings"
        subtitle="The family name in stone above a door strangers will use for a century."
      >
        {(d?.namedBuildings?.length ?? 0) > 0 && (
          <div className="mb-3 space-y-2">
            {d!.namedBuildings!.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-primary/40 bg-primary/10 p-3"
              >
                <p className="text-sm font-bold">{b.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(b.cost)} · permanent
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {BUILDING_DEFS.filter(
            (bd) => !(d?.namedBuildings ?? []).some((b) => b.kind === bd.kind),
          ).map((bd) => (
            <div
              key={bd.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div>
                <p className="text-sm font-bold">{bd.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(bd.cost)}
                </p>
              </div>
              <button
                className={btn}
                onClick={() => act((ch) => fundBuilding(ch, bd.id, viaFdn))}
              >
                Fund
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon={Landmark}
        title="Board Memberships"
        subtitle="Where the giving is negotiated over bad coffee. Corporate seats pay a stipend."
      >
        {boards.length > 0 && (
          <div className="mb-3 space-y-2">
            {boards.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">{b.org}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {b.years} yr{b.years === 1 ? "" : "s"} · influence{" "}
                    {b.influence}/100
                    {b.stipend ? ` · ${formatMoney(b.stipend)}/yr` : ""}
                  </p>
                </div>
                <button
                  className={btnDanger}
                  onClick={() => act((ch) => resignBoard(ch, b.id))}
                >
                  Step Down
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {BOARD_DEFS.filter(
            (bd) => !boards.some((b) => b.kind === bd.kind),
          ).map((bd) => {
            const elig = boardEligibility(c, bd);
            return (
              <div
                key={bd.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold capitalize">{bd.kind} board</p>
                <p className="text-[11px] text-muted-foreground">
                  {bd.stipend
                    ? `${formatMoney(bd.stipend)}/yr stipend`
                    : "Unpaid; influence and standing"}
                </p>
                {!elig.ok && (
                  <p className="mt-1 text-[11px] text-red-300">{elig.why}</p>
                )}
                <button
                  className={`${btn} mt-2`}
                  disabled={!elig.ok}
                  onClick={() =>
                    act((ch) => joinBoard(ch, bd.id, trySpendEnergy))
                  }
                >
                  Seek Appointment (1 energy)
                </button>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ---------- Library ----------

const LIBRARY_CATEGORIES = [
  "All",
  "Degree",
  "Championship",
  "Award",
  "Office",
  "Business",
  "Philanthropy",
  "Honor",
];

function LibraryView({ c }: { c: Character }) {
  const [cat, setCat] = useState("All");
  const items = [...(c.dynasty?.library ?? [])].reverse();
  const filtered =
    cat === "All" ? items : items.filter((l) => l.category === cat);
  return (
    <div className="space-y-3">
      <Section
        icon={BookOpen}
        title="The Family Library"
        subtitle="Every achievement, every generation, recorded automatically and kept forever."
      >
        <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
          {LIBRARY_CATEGORIES.map((k) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                cat === k
                  ? "bg-primary/25 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            The shelves are waiting. Degrees, championships, offices, awards and
            endowments will appear here on their own.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((l) => (
              <div
                key={l.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold">{l.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {l.category} · {l.person} · Gen {l.generation} · age {l.age}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------- Archives ----------

function ArchivesView({ c }: { c: Character }) {
  const [q, setQ] = useState("");
  const entries = [...(c.dynasty?.archives ?? [])].reverse();
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? entries.filter(
        (a) =>
          a.text.toLowerCase().includes(needle) ||
          a.kind.toLowerCase().includes(needle) ||
          a.person.toLowerCase().includes(needle),
      )
    : entries;
  return (
    <div className="space-y-3">
      <Section
        icon={Archive}
        title="The Family Archives"
        subtitle="The dynasty's timeline — searchable, permanent, unflattering when it needs to be."
      >
        <input
          className={`${inputCls} mb-3 w-full`}
          placeholder="Search the archives (name, event, keyword)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {needle
              ? "Nothing in the record matches that."
              : "Births, weddings, graduations, foundings and passings will be recorded here automatically."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm">{a.text}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {a.kind} · Gen {a.generation} · {a.person}, age {a.age}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------- Extended Family: the tree that grows on its own ----------

function ExtendedFamily({ c }: { c: Character }) {
  const kids = c.relationships.filter((r) => r.type === "child");
  const married = kids
    .map((r) => ({ rel: r, rec: c.children?.find((k) => k.relId === r.id) }))
    .filter((x) => x.rec?.spouseName);
  const tree: DescendantRecord[] = c.dynasty?.descendants ?? [];
  const living = tree.filter((t) => t.alive);
  const departed = tree.filter((t) => !t.alive);

  if (!married.length && !tree.length) {
    return (
      <Section
        icon={Users}
        title="Extended Family"
        subtitle="The tree grows on its own. Once your children reach their mid-twenties, they'll marry and start families — no buttons required."
      >
        <p className="text-xs text-muted-foreground">
          Nothing yet. Weddings, grandchildren and the occasional unannounced
          dinner guest will appear here as the years pass.
        </p>
      </Section>
    );
  }

  return (
    <Section
      icon={Users}
      title="Extended Family"
      subtitle="Marriages, grandchildren and cousins — all of it happening whether you watch or not."
    >
      {married.length > 0 && (
        <div className="mb-3 space-y-2">
          {married.map(({ rel, rec }) => (
            <div
              key={rel.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold">
                {rel.name} &amp; {rec!.spouseName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Married{rec!.marriedAtAge ? ` at ${rec!.marriedAtAge}` : ""}
                {(() => {
                  const theirs = living.filter(
                    (t) => t.parentName === rel.name,
                  );
                  return theirs.length
                    ? ` · ${theirs.length} ${theirs.length === 1 ? "child" : "children"}`
                    : "";
                })()}
              </p>
            </div>
          ))}
        </div>
      )}
      {living.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {living.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">
                Age {t.age} · child of {t.parentName}
                {t.married && t.spouseName
                  ? ` · married to ${t.spouseName}`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      {departed.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Remembered: {departed.map((t) => t.name).join(", ")}
        </p>
      )}
    </Section>
  );
}

// ---------- Council: matters on the table + the Constitution ----------

function CouncilView({ c, act }: { c: Character; act: Act }) {
  const d = c.dynasty;
  const council = d?.council;
  const matter = council?.pending;
  const rules = d?.constitution ?? [];

  return (
    <div className="space-y-3">
      <Section
        icon={Scale}
        title="The Family Council"
        subtitle="One long table, one meeting a year. Matters left unresolved go stale and cost unity."
      >
        {!council?.established ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              The Council needs at least one adult child. Once established it
              convenes automatically every year and puts real decisions on the
              table.
            </p>
            <button
              className={btn}
              onClick={() => act((ch) => establishCouncil(ch))}
            >
              Establish the Family Council
            </button>
          </div>
        ) : (
          <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Years Convened" value={`${council.yearsHeld}`} />
            <Stat label="Family Unity" value={`${d?.unity ?? 60}/100`} />
            <Stat
              label="Articles in Force"
              value={`${rules.filter((r) => r.active && !r.broken).length}`}
            />
          </div>
        )}
        {council?.established && !matter && (
          <p className="text-xs text-muted-foreground">
            {council.lastOutcome
              ? `Last session: ${council.lastOutcome}`
              : "No matter is currently before the Council. Next session convenes at year's end."}
          </p>
        )}
        {matter && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
            <p className="text-sm font-bold">{matter.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{matter.text}</p>
            <div className="mt-2 space-y-1.5">
              {matter.options.map((o) => (
                <button
                  key={o.id}
                  className={`${btnGhost} w-full text-left`}
                  onClick={() => act((ch) => resolveCouncil(ch, o.id))}
                >
                  <span className="font-semibold text-foreground">
                    {o.label}
                  </span>
                  {o.hint && (
                    <span className="ml-1 text-muted-foreground">
                      — {o.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section
        icon={Scale}
        title="The Family Constitution"
        subtitle="House law. Every article is audited every year — the checkmarks below are earned, not decorative."
      >
        {rules.length > 0 && (
          <div className="mb-3 space-y-2">
            {rules.map((r) => {
              const def = ruleDef(r.id);
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-3 ${
                    r.broken
                      ? "border-red-400/40 bg-red-500/10"
                      : "border-primary/40 bg-primary/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">
                      {r.broken ? "✗" : "✓"} {def?.label ?? r.id}
                    </p>
                    <div className="flex gap-2">
                      {r.broken && (
                        <button
                          className={btnGhost}
                          onClick={() => act((ch) => reaffirmRule(ch, r.id))}
                        >
                          Reaffirm ($100k)
                        </button>
                      )}
                      <button
                        className={btnDanger}
                        onClick={() => act((ch) => repealRule(ch, r.id))}
                      >
                        Repeal
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {def?.detail}{" "}
                    {r.broken
                      ? "· BROKEN"
                      : `· kept ${r.keptYears} yr${r.keptYears === 1 ? "" : "s"}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {CONSTITUTION_RULES.filter(
            (def) => !rules.some((r) => r.id === def.id),
          ).map((def) => (
            <div
              key={def.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold">{def.label}</p>
              <p className="text-[11px] text-muted-foreground">{def.detail}</p>
              <button
                className={`${btn} mt-2`}
                disabled={!council?.established}
                onClick={() => act((ch) => adoptRule(ch, def.id))}
              >
                Adopt
              </button>
            </div>
          ))}
        </div>
        {!council?.established && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Adopting articles requires an established Council.
          </p>
        )}
      </Section>
    </div>
  );
}

// ---------- Rivals & The Vault ----------

function RivalsView({ c, act }: { c: Character; act: Act }) {
  const [use, setUse] = useState<Record<string, LeverageUse>>({});
  // ensureRivals mutates a clone via act pattern normally; for display, read directly
  const rivals = c.dynasty?.rivals ?? [];
  const vault = c.dynasty?.vault ?? [];

  return (
    <div className="space-y-3">
      <Section
        icon={Swords}
        title="Rival Dynasties"
        subtitle="Every old family has an opposite number. Rivalries are conducted in auction paddles, board votes and seating charts."
      >
        {rivals.length === 0 ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              No rivals yet — acquire a Seat or build reputation, and the
              opposite numbers will introduce themselves.
            </p>
            <button
              className={btnGhost}
              onClick={() =>
                act((ch) => {
                  const out = structuredClone(ch);
                  ensureRivals(out);
                  return {
                    character: out,
                    message: "You start noticing which families notice you.",
                    tone: "neutral" as const,
                    ok: true,
                  };
                })
              }
            >
              Take Stock of Society
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rivals.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      {r.name}
                      {r.alliedByMarriage ? " · allied by marriage" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Wealth {formatMoney(r.wealth)} · prestige {r.prestige} ·
                      relations{" "}
                      {r.relation > 30
                        ? "warm"
                        : r.relation > -10
                          ? "cool"
                          : r.relation > -50
                            ? "hostile"
                            : "open feud"}{" "}
                      ({r.relation})
                      {r.leverageOnYou >= 20
                        ? ` · they hold a file on you (${r.leverageOnYou})`
                        : ""}
                    </p>
                  </div>
                  <button
                    className={btn}
                    disabled={c.money < 250000}
                    onClick={() =>
                      act((ch) => investigateRival(ch, r.id, trySpendEnergy))
                    }
                  >
                    Investigate ($250k, 1 energy)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={KeyRound}
        title="The Vault"
        subtitle="What the family knows, sealed and patient. Using an item consumes it."
      >
        {vault.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Empty. Investigations fill it; patience arms it.
          </p>
        ) : (
          <div className="space-y-2">
            {vault.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold">{v.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  Concerning {v.rivalName} · potency {v.potency}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    value={use[v.id] ?? "relation"}
                    onChange={(e) =>
                      setUse({ ...use, [v.id]: e.target.value as LeverageUse })
                    }
                  >
                    <option value="relation">
                      Force a détente (relations +)
                    </option>
                    <option value="board">
                      Win a board fight (influence +)
                    </option>
                    <option value="scandal">Kill the running story</option>
                    <option value="leak">
                      Leak it to the press (hurt them; 30% traced)
                    </option>
                    <option value="marriage">
                      Secure a courtship with them
                    </option>
                  </select>
                  <button
                    className={btn}
                    onClick={() =>
                      act((ch) =>
                        // eslint-disable-next-line react-hooks/rules-of-hooks -- game function, not a React hook
                        useLeverage(ch, v.id, use[v.id] ?? "relation"),
                      )
                    }
                  >
                    Use It
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------- The Family Bank & Family Office ----------

function BankView({ c, act }: { c: Character; act: Act }) {
  const bank = c.dynasty?.bank;
  const office = c.dynasty?.office;
  const req = bank?.pendingRequest;

  return (
    <div className="space-y-3">
      <Section
        icon={PiggyBank}
        title="The Family Bank"
        subtitle="Relatives financed on terms, or on trust. Deadbeats strain unity; forgiveness buys it."
      >
        {req ? (
          <div className="mb-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
            <p className="text-sm font-bold">
              {req.borrower} asks for {formatMoney(req.amount)}
            </p>
            <p className="text-xs text-muted-foreground">For {req.reason}.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className={btn}
                disabled={c.money < req.amount}
                onClick={() => act((ch) => approveLoan(ch, 0))}
              >
                Lend at 0%
              </button>
              <button
                className={btn}
                disabled={c.money < req.amount}
                onClick={() => act((ch) => approveLoan(ch, 5))}
              >
                Lend at 5%
              </button>
              <button
                className={btn}
                disabled={c.money < req.amount}
                onClick={() => act((ch) => approveLoan(ch, 10))}
              >
                Lend at 10%
              </button>
              <button
                className={btnGhost}
                disabled={c.money < req.amount}
                onClick={() => act((ch) => giftInstead(ch))}
              >
                Gift It
              </button>
              <button
                className={btnDanger}
                onClick={() => act((ch) => refuseLoan(ch))}
              >
                Refuse
              </button>
            </div>
          </div>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">
            Nobody at the window. Requests arrive on their own.
          </p>
        )}
        {(bank?.loans.length ?? 0) > 0 && (
          <div className="space-y-2">
            {bank!.loans.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-bold">
                    {l.borrower}
                    {l.delinquent ? " · DELINQUENT" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Owes {formatMoney(l.owed)} · {l.rate}% · {l.yearsLeft} yr
                    {l.yearsLeft === 1 ? "" : "s"} left
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={btnGhost}
                    onClick={() => act((ch) => forgiveLoan(ch, l.id))}
                  >
                    Forgive
                  </button>
                  {l.delinquent && (
                    <button
                      className={btnDanger}
                      onClick={() => act((ch) => pressLoan(ch, l.id))}
                    >
                      Send Lawyers
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {bank && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Lifetime lent {formatMoney(bank.lifetimeLent)} · forgiven{" "}
            {formatMoney(bank.lifetimeForgiven)}
          </p>
        )}
      </Section>

      <Section
        icon={Landmark}
        title="The Family Office"
        subtitle="Professionals between you and your money. Fees yearly; services quietly."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {OFFICE_TIERS.map((t) => (
            <div
              key={t.tier}
              className={`rounded-xl border p-3 ${
                office?.tier === t.tier
                  ? "border-primary/40 bg-primary/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-sm font-bold">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.feePct}%/yr of liquid assets · {t.hint}
              </p>
              {office?.tier !== t.tier && (
                <button
                  className={`${btn} mt-2`}
                  onClick={() => act((ch) => setOfficeTier(ch, t.tier))}
                >
                  Engage
                </button>
              )}
            </div>
          ))}
        </div>
        {(office?.tier ?? 0) > 0 && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Fees paid {formatMoney(office!.feesPaid)} · earned{" "}
              {formatMoney(office!.earned)} · scandals killed{" "}
              {office!.scandalsKilled}
            </p>
            <button
              className={btnDanger}
              onClick={() => act((ch) => setOfficeTier(ch, 0))}
            >
              Dissolve
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------- The Society Pages banner (rendered on Overview) ----------

function ScandalBanner({ c, act }: { c: Character; act: Act }) {
  const s = c.dynasty?.press?.active;
  if (!s) return null;
  return (
    <Section
      icon={Newspaper}
      title="The Society Pages"
      subtitle="A story is running. It costs reputation and unity every year it lives."
    >
      <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3">
        <p className="text-sm font-bold">"{s.headline}"</p>
        <p className="text-[11px] text-muted-foreground">
          Heat {s.heat} · running {s.yearsRunning} yr
          {s.yearsRunning === 1 ? "" : "s"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            className={btn}
            onClick={() => act((ch) => suppressScandal(ch))}
          >
            Suppress (~
            {formatMoney(
              s.heat * 40000 * ((c.dynasty?.office?.tier ?? 0) >= 2 ? 0.7 : 1),
            )}
            )
          </button>
          <button
            className={btnGhost}
            onClick={() => act((ch) => spinScandal(ch, trySpendEnergy))}
          >
            Spin It (1 energy)
          </button>
          <span className="self-center text-[11px] text-muted-foreground">
            …or outlast it. Stories starve in ~3 years.
          </span>
        </div>
      </div>
    </Section>
  );
}

// ---------- Matchmaking & Cadet Branches (rendered under Family tab) ----------

function MatchmakingSection({ c, act }: { c: Character; act: Act }) {
  const [target, setTarget] = useState<Record<string, string>>({});
  const [prenup, setPrenup] = useState<Record<string, boolean>>({});
  const [rivalPick, setRivalPick] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<Record<string, string>>({});
  const rivals = c.dynasty?.rivals ?? [];
  const branches = c.dynasty?.branches ?? [];
  const eligible = c.relationships.filter((r) => {
    if (r.type !== "child" || !r.alive || r.age < 21) return false;
    const k = c.children?.find((x) => x.relId === r.id);
    return k && !k.spouseName && !k.cutOff && !k.branchId;
  });
  const courting = c.relationships.filter((r) => {
    const k = c.children?.find((x) => x.relId === r.id);
    return k?.courtship;
  });
  const branchable = c.relationships.filter((r) => {
    if (r.type !== "child" || !r.alive || r.age < 25) return false;
    const k = c.children?.find((x) => x.relId === r.id);
    return k && !k.branchId && c.will?.heirId !== r.id;
  });

  return (
    <>
      <Section
        icon={Heart}
        title="Introductions"
        subtitle="Marriages arranged over lunch. They can always refuse — resentful children refuse loudest."
      >
        {courting.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {courting.map((r) => (
              <p
                key={r.id}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground"
              >
                A courtship is in motion for{" "}
                <span className="font-semibold text-foreground">{r.name}</span>.
                The family waits, casually, by the phone.
              </p>
            ))}
          </div>
        )}
        {eligible.length === 0 && courting.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No unmarried adult children (21+) at the table right now.
          </p>
        ) : (
          <div className="space-y-2">
            {eligible.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold">
                  {r.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · age {r.age}
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    value={target[r.id] ?? "love"}
                    onChange={(e) =>
                      setTarget({ ...target, [r.id]: e.target.value })
                    }
                  >
                    {MATCH_TARGETS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {(target[r.id] ?? "love") === "rival" && (
                    <select
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                      value={rivalPick[r.id] ?? rivals[0]?.id ?? ""}
                      onChange={(e) =>
                        setRivalPick({ ...rivalPick, [r.id]: e.target.value })
                      }
                    >
                      {rivals.map((rv) => (
                        <option key={rv.id} value={rv.id}>
                          {rv.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={prenup[r.id] ?? true}
                      onChange={(e) =>
                        setPrenup({ ...prenup, [r.id]: e.target.checked })
                      }
                    />
                    Prenup
                  </label>
                  <button
                    className={btn}
                    disabled={c.money < 25000}
                    onClick={() =>
                      act((ch) =>
                        arrangeIntroduction(
                          ch,
                          r.id,
                          target[r.id] ?? "love",
                          prenup[r.id] ?? true,
                          rivalPick[r.id] ?? rivals[0]?.id,
                          trySpendEnergy,
                        ),
                      )
                    }
                  >
                    Arrange ($25k, 1 energy)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={GitBranch}
        title="Cadet Branches"
        subtitle="A second child, seed money, and a hyphen of their own. Branches live in the background — loyal ones send money; bitter ones give interviews."
      >
        {branches.length > 0 && (
          <div className="mb-3 space-y-2">
            {branches.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold">{b.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Founded by {b.founder} (Gen {b.foundedGeneration}) · wealth{" "}
                  {formatMoney(b.wealth)} · prestige {b.prestige} · loyalty{" "}
                  {b.loyalty}/100
                </p>
              </div>
            ))}
          </div>
        )}
        {branchable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Founding a branch needs a child of 25+ who isn't the named heir. (At
            succession, any child taking 25%+ of a divided estate founds one
            automatically.)
          </p>
        ) : (
          <div className="space-y-2">
            {branchable.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold">
                  {r.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · age {r.age}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    className={`${inputCls} w-32`}
                    placeholder="1000000"
                    inputMode="numeric"
                    value={seed[r.id] ?? ""}
                    onChange={(e) =>
                      setSeed({
                        ...seed,
                        [r.id]: e.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                  />
                  <button
                    className={btn}
                    onClick={() =>
                      act((ch) =>
                        foundBranch(ch, r.id, Number(seed[r.id] || 0)),
                      )
                    }
                  >
                    Found Branch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// ---------- Heirlooms (rendered under Collections tab) ----------

function HeirloomsSection({ c, act }: { c: Character; act: Act }) {
  const [name, setName] = useState("");
  const heirlooms = c.dynasty?.heirlooms ?? [];
  const kids = c.relationships.filter((r) => r.type === "child" && r.alive);

  return (
    <Section
      icon={KeyRound}
      title="Heirlooms"
      subtitle="Named objects, passed hand to hand. Assign them in the will — unassigned heirlooms breed a decade of grievance."
    >
      {heirlooms.length > 0 && (
        <div className="mb-3 space-y-2">
          {heirlooms.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold">{h.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {h.description} · held by {h.holder} · significance{" "}
                {h.significance}/100 · Gen {h.generationAcquired}
              </p>
              {h.holder === c.name && kids.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    value={h.assignedTo ?? ""}
                    onChange={(e) =>
                      act((ch) =>
                        assignHeirloom(ch, h.id, e.target.value || undefined),
                      )
                    }
                  >
                    <option value="">— unassigned —</option>
                    {kids.map((k) => (
                      <option key={k.id} value={k.id}>
                        to {k.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-muted-foreground">
                    in the will
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Commission an heirloom (or leave blank for the jeweler's suggestion)…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className={btn}
          disabled={c.money < 150000}
          onClick={() => {
            act((ch) => commissionHeirloom(ch, name));
            setName("");
          }}
        >
          Commission ($150k)
        </button>
      </div>
    </Section>
  );
}

// ---------- Seat customization (rendered under Estate tab) ----------

function SeatCustomization({ c, act }: { c: Character; act: Act }) {
  const [amount, setAmount] = useState("");
  const [newName, setNewName] = useState("");
  const seat = c.dynasty?.seat;
  if (!seat) return null;
  return (
    <Section
      icon={Castle}
      title="The Seat Itself"
      subtitle={`${seat.name} is currently worth ${formatMoney(seat.value)} — its value is whatever the family puts into it.`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} w-40`}
          placeholder="500000"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <button
          className={btn}
          disabled={
            Number(amount || 0) < 100000 || c.money < Number(amount || 0)
          }
          onClick={() => {
            act((ch) => renovateSeat(ch, Number(amount || 0)));
            setAmount("");
          }}
        >
          Renovate (adds 90% to value)
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} w-56`}
          placeholder={`Rename ${seat.name}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className={btnGhost}
          disabled={!newName.trim()}
          onClick={() => {
            act((ch) => renameSeat(ch, newName));
            setNewName("");
          }}
        >
          Rename
        </button>
      </div>
    </Section>
  );
}

// ---------- The Generation Switch: continue as your child, irreversibly ----------

function SuccessionSection({ c, act }: { c: Character; act: Act }) {
  const [confirming, setConfirming] = useState<string | undefined>(undefined);
  const eligible = c.relationships.filter((r) => {
    if (r.type !== "child" || !r.alive || r.age < 18) return false;
    const k = c.children?.find((x) => x.relId === r.id);
    return !k?.cutOff && !k?.branchId;
  });
  if (!eligible.length) return null;
  return (
    <Section
      icon={Crown}
      title="Step Back"
      subtitle="Continue the game as one of your adult children — while you're still alive. You become their parent NPC, still holding the fortune until the day it passes. THERE IS NO WAY BACK."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {eligible.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <p className="text-sm font-bold">
              {r.name}{" "}
              <span className="font-normal text-muted-foreground">
                — age {r.age}
              </span>
            </p>
            {confirming === r.id ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-red-300">
                  Final answer? {c.name}'s life ends as a playable character.
                  The liquid fortune stays with them as an NPC until they die.
                </p>
                <div className="flex gap-2">
                  <button
                    className={btnDanger}
                    onClick={() => {
                      setConfirming(undefined);
                      act((ch) => switchToChild(ch, r.id));
                    }}
                  >
                    Yes — become {r.name.split(" ")[0]}
                  </button>
                  <button
                    className={btnGhost}
                    onClick={() => setConfirming(undefined)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={`${btnGhost} mt-2`}
                onClick={() => setConfirming(r.id)}
              >
                Continue as {r.name.split(" ")[0]}…
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
