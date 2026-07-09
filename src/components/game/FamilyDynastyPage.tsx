import { useState } from "react";
import {
  Anchor,
  Archive,
  BookOpen,
  Building2,
  Castle,
  Crown,
  Gem,
  HandHeart,
  Landmark,
  Martini,
  Repeat,
  Users,
} from "lucide-react";
import { trySpendEnergy } from "../../game/engine";
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

      {view === "overview" && <OverviewView c={c} />}
      {view === "family" && (
        <div className="space-y-3">
          <FamilyView c={c} act={act} />
          <ExtendedFamily c={c} />
        </div>
      )}
      {view === "estate" && <EstateView c={c} act={act} />}
      {view === "clubs" && <ClubsView c={c} act={act} />}
      {view === "traditions" && <TraditionsView c={c} act={act} />}
      {view === "collections" && <CollectionsView c={c} act={act} />}
      {view === "philanthropy" && <PhilanthropyView c={c} act={act} />}
      {view === "library" && <LibraryView c={c} />}
      {view === "archives" && <ArchivesView c={c} />}
      {view === "legacy" && <LegacyView c={c} act={act} />}
    </div>
  );
}

// ---------- Overview: the dynasty dashboard ----------

function OverviewView({ c }: { c: Character }) {
  const d = c.dynasty;
  const p = prestigeBreakdown(c);
  const goalsDone = d?.goalsDone ?? [];
  const descendants = descendantCount(c);

  return (
    <div className="space-y-3">
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
