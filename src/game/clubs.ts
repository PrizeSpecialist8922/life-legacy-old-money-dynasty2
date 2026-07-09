import type {
  Character,
  ClubMembership,
  LogEntry,
  LogTone,
  Tradition,
} from "./types";
import { ensureDynasty } from "./legacy";
import { ensurePedigree } from "./oldmoney";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Private Clubs & Family Traditions (Build 11B). Clubs are where the real
// meetings happen after the official meeting ends. Traditions are the
// scaffolding that keeps a family standing after the founder is gone.
// ---------------------------------------------------------------------------

export interface ClubResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): ClubResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

// ---------- Private clubs ----------

export interface ClubDef {
  id: string;
  name: string;
  dues: number; // annual
  initiation: number; // one-time
  minMoney: number;
  minPrestige: number; // dynasty reputation OR house prestige proxy
  minNetworking: number;
  perk: string;
}

export const CLUB_DEFS: ClubDef[] = [
  {
    id: "country",
    name: "The Country Club",
    dues: 25000,
    initiation: 100000,
    minMoney: 500000,
    minPrestige: 20,
    minNetworking: 20,
    perk: "Networking; family events",
  },
  {
    id: "golfclub",
    name: "Royal Golf Club",
    dues: 30000,
    initiation: 150000,
    minMoney: 800000,
    minPrestige: 25,
    minNetworking: 25,
    perk: "Business deals close on the back nine",
  },
  {
    id: "yacht",
    name: "The Yacht Club",
    dues: 40000,
    initiation: 250000,
    minMoney: 2000000,
    minPrestige: 30,
    minNetworking: 30,
    perk: "Society invitations; berth privileges",
  },
  {
    id: "polo",
    name: "Polo Club",
    dues: 60000,
    initiation: 400000,
    minMoney: 5000000,
    minPrestige: 45,
    minNetworking: 35,
    perk: "Old families; older money",
  },
  {
    id: "executive",
    name: "The Executive Club",
    dues: 50000,
    initiation: 200000,
    minMoney: 3000000,
    minPrestige: 35,
    minNetworking: 50,
    perk: "Board introductions; investment flow",
  },
  {
    id: "arts",
    name: "The Arts Society",
    dues: 20000,
    initiation: 75000,
    minMoney: 400000,
    minPrestige: 25,
    minNetworking: 15,
    perk: "Collection access; curator contacts",
  },
  {
    id: "investment",
    name: "The Investment Society",
    dues: 45000,
    initiation: 300000,
    minMoney: 4000000,
    minPrestige: 30,
    minNetworking: 45,
    perk: "Deal flow before it reaches the market",
  },
];

export function clubDef(id: string): ClubDef | undefined {
  return CLUB_DEFS.find((x) => x.id === id);
}

export function ensureClubs(c: Character): ClubMembership[] {
  if (!c.clubs) c.clubs = [];
  return c.clubs;
}

function socialScore(c: Character): number {
  const d = c.dynasty;
  return Math.round(
    (d?.reputation ?? 40) * 0.5 +
      (d?.pedigree ?? 0) * 0.3 +
      (d?.seat?.housePrestige ?? 0) * 0.2,
  );
}

export function clubEligibility(
  c: Character,
  def: ClubDef,
): { ok: boolean; why: string } {
  if ((c.clubs ?? []).some((m) => m.id === def.id))
    return { ok: false, why: "Already a member" };
  if (c.money < def.minMoney)
    return { ok: false, why: `Wealth below ${formatMoney(def.minMoney)}` };
  if (socialScore(c) < def.minPrestige)
    return {
      ok: false,
      why: `Standing too new (${socialScore(c)}/${def.minPrestige})`,
    };
  if ((c.networking ?? 0) < def.minNetworking)
    return {
      ok: false,
      why: `Not enough connections (${c.networking ?? 0}/${def.minNetworking})`,
    };
  if (c.criminalRecord >= 2)
    return { ok: false, why: "The membership committee reads the papers" };
  return { ok: true, why: "" };
}

export function applyToClub(
  input: Character,
  clubId: string,
  spend: (c: Character) => boolean,
): ClubResult {
  const c = structuredClone(input);
  const def = clubDef(clubId);
  if (!def) return fail(input, "Unknown club.");
  const elig = clubEligibility(c, def);
  if (!elig.ok)
    return fail(
      input,
      `${def.name} won't consider it: ${elig.why.toLowerCase()}.`,
    );
  if (c.money < def.initiation + def.dues)
    return fail(
      input,
      `Initiation plus first year's dues run ${formatMoney(def.initiation + def.dues)}.`,
    );
  if (!spend(c)) return fail(input, "No energy left this year.");
  // Sponsored applications rarely fail — the vetting happens before the ask.
  const chance = clamp(
    50 + socialScore(c) - def.minPrestige + (c.networking ?? 0) / 4,
    15,
    95,
  );
  if (randInt(1, 100) > chance) {
    const msg = `${def.name} regrets that membership is at capacity. Everyone involved understands what that sentence means.`;
    c.log.push({ age: c.age, text: msg, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  c.money -= def.initiation + def.dues;
  ensureClubs(c).push({
    id: def.id,
    name: def.name,
    yearsMember: 0,
    standing: 40,
  });
  c.networking = clamp((c.networking ?? 0) + 5);
  const msg = `Elected to ${def.name}. Your name went on a board in a hallway that smells of cedar and consequence.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function resignClub(input: Character, clubId: string): ClubResult {
  const c = structuredClone(input);
  const clubs = ensureClubs(c);
  const idx = clubs.findIndex((m) => m.id === clubId);
  if (idx < 0) return fail(input, "You're not a member.");
  const m = clubs[idx];
  clubs.splice(idx, 1);
  const msg = `Resigned from ${m.name}. Resignations are read aloud at committee; yours got a silence.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function attendClub(
  input: Character,
  clubId: string,
  spend: (c: Character) => boolean,
): ClubResult {
  const c = structuredClone(input);
  const m = ensureClubs(c).find((x) => x.id === clubId);
  if (!m) return fail(input, "You're not a member.");
  if (!spend(c)) return fail(input, "No energy left this year.");
  m.standing = clamp(m.standing + randInt(4, 10));
  c.networking = clamp((c.networking ?? 0) + randInt(2, 5));
  c.stats.happiness = clamp(c.stats.happiness + 2);
  const flavors = [
    `An evening at ${m.name}: two introductions, one standing dinner invitation, and a rumor worth checking.`,
    `Lunch at ${m.name} ran three hours. The useful part was the last ten minutes, as always.`,
    `A committee weekend at ${m.name} — dull, dutiful, and exactly where the next opportunity was mentioned first.`,
  ];
  const msg = randItem(flavors);
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Family traditions ----------

export interface TraditionDef {
  id: string;
  name: string;
  cost: number;
  unity: number;
  prestige: number;
  happiness: number;
}

export const TRADITION_DEFS: TraditionDef[] = [
  {
    id: "reunion",
    name: "Annual Family Reunion",
    cost: 25000,
    unity: 5,
    prestige: 1,
    happiness: 3,
  },
  {
    id: "christmas",
    name: "Christmas Gathering",
    cost: 15000,
    unity: 4,
    prestige: 0,
    happiness: 4,
  },
  {
    id: "thanksgiving",
    name: "Thanksgiving Dinner",
    cost: 8000,
    unity: 3,
    prestige: 0,
    happiness: 3,
  },
  {
    id: "summer",
    name: "Summer Vacation",
    cost: 60000,
    unity: 4,
    prestige: 1,
    happiness: 5,
  },
  {
    id: "ski",
    name: "Family Ski Trip",
    cost: 45000,
    unity: 3,
    prestige: 1,
    happiness: 4,
  },
  {
    id: "golftournament",
    name: "Family Golf Tournament",
    cost: 20000,
    unity: 3,
    prestige: 1,
    happiness: 3,
  },
  {
    id: "gala",
    name: "Charity Gala",
    cost: 150000,
    unity: 2,
    prestige: 4,
    happiness: 2,
  },
  {
    id: "council",
    name: "Annual Family Council",
    cost: 10000,
    unity: 6,
    prestige: 1,
    happiness: 1,
  },
  {
    id: "retreat",
    name: "Family Business Retreat",
    cost: 40000,
    unity: 4,
    prestige: 2,
    happiness: 1,
  },
  {
    id: "yachtweekend",
    name: "Yacht Weekend",
    cost: 80000,
    unity: 3,
    prestige: 2,
    happiness: 4,
  },
  {
    id: "graduationfete",
    name: "Graduation Celebrations",
    cost: 12000,
    unity: 3,
    prestige: 1,
    happiness: 3,
  },
  {
    id: "anniversary",
    name: "Anniversary Celebration",
    cost: 15000,
    unity: 3,
    prestige: 1,
    happiness: 3,
  },
  {
    id: "founderday",
    name: "Founder's Day",
    cost: 30000,
    unity: 4,
    prestige: 2,
    happiness: 2,
  },
  {
    id: "birthdays",
    name: "Birthday Celebrations",
    cost: 10000,
    unity: 3,
    prestige: 0,
    happiness: 3,
  },
];

export function traditionDef(id: string): TraditionDef | undefined {
  return TRADITION_DEFS.find((t) => t.id === id);
}

export function ensureTraditions(c: Character): Tradition[] {
  const d = ensurePedigree(ensureDynasty(c));
  if (!d.traditions) d.traditions = [];
  if (d.unity === undefined) d.unity = 60;
  return d.traditions;
}

export function establishTradition(
  input: Character,
  defIdOrName: string,
  custom = false,
): ClubResult {
  const c = structuredClone(input);
  const traditions = ensureTraditions(c);
  if (custom) {
    const name = defIdOrName.trim();
    if (!name) return fail(input, "A tradition needs a name.");
    if (traditions.some((t) => t.name.toLowerCase() === name.toLowerCase()))
      return fail(input, "That tradition already exists.");
    traditions.push({
      id: uid(),
      name,
      cost: 15000,
      active: true,
      yearsMaintained: 0,
      missedStreak: 0,
      totalSpent: 0,
      attendance: 0,
      custom: true,
    });
    const msg = `"${name}" is now a family tradition. Traditions start as decisions and end as identity.`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  const def = traditionDef(defIdOrName);
  if (!def) return fail(input, "Unknown tradition.");
  if (traditions.some((t) => t.id === def.id))
    return fail(input, "That tradition already exists.");
  traditions.push({
    id: def.id,
    name: def.name,
    cost: def.cost,
    active: true,
    yearsMaintained: 0,
    missedStreak: 0,
    totalSpent: 0,
    attendance: 0,
  });
  const msg = `The ${def.name} is established — ${formatMoney(def.cost)} a year, every year, no matter what.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function setTraditionActive(
  input: Character,
  traditionId: string,
  active: boolean,
): ClubResult {
  const c = structuredClone(input);
  const t = ensureTraditions(c).find((x) => x.id === traditionId);
  if (!t) return fail(input, "No such tradition.");
  t.active = active;
  const msg = active
    ? `The ${t.name} resumes. The family noticed it stopped; they'll notice it's back.`
    : `The ${t.name} is paused. The first year it's "paused"; after that it's "used to".`;
  c.log.push({ age: c.age, text: msg, tone: active ? "good" : "neutral" });
  return {
    character: c,
    message: msg,
    tone: active ? "good" : "neutral",
    ok: true,
  };
}

export function endTradition(
  input: Character,
  traditionId: string,
): ClubResult {
  const c = structuredClone(input);
  const d = ensurePedigree(ensureDynasty(c));
  const traditions = ensureTraditions(c);
  const idx = traditions.findIndex((x) => x.id === traditionId);
  if (idx < 0) return fail(input, "No such tradition.");
  const t = traditions[idx];
  traditions.splice(idx, 1);
  const penalty = Math.min(8, 2 + Math.floor(t.yearsMaintained / 5));
  d.unity = clamp((d.unity ?? 60) - penalty);
  const msg = `The ${t.name} is ended after ${t.yearsMaintained} year${t.yearsMaintained === 1 ? "" : "s"}. Someone will bring it up at every gathering for a decade.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

// ---------- Yearly advance ----------

function familyHeadcount(c: Character): number {
  return (
    1 +
    c.relationships.filter(
      (r) =>
        r.alive && ["partner", "child", "sibling", "parent"].includes(r.type),
    ).length
  );
}

export function advanceClubs(c: Character, log: LogEntry[]) {
  const d = c.dynasty;

  // Clubs: dues, standing, perks, occasional invitations.
  if (c.clubs?.length) {
    for (const m of [...c.clubs]) {
      const def = clubDef(m.id);
      const dues = def?.dues ?? 25000;
      if (c.money >= dues) {
        c.money -= dues;
        m.yearsMember += 1;
        m.standing = clamp(m.standing + randInt(0, 3));
        c.networking = clamp((c.networking ?? 0) + 1);
        if (m.id === "investment" && c.investing && Math.random() < 0.3) {
          const gain = randInt(2, 6);
          log.push({
            age: c.age,
            text: `A tip over dinner at ${m.name} was early and correct — portfolio nudged +${gain}%.`,
            tone: "good",
          });
          for (const h of c.investing.holdings)
            h.value = Math.round(h.value * (1 + gain / 100));
        }
        if (m.id === "executive" && Math.random() < 0.25) {
          c.businessReputation = clamp(c.businessReputation + 3);
        }
      } else {
        c.clubs = c.clubs.filter((x) => x.id !== m.id);
        log.push({
          age: c.age,
          text: `Dues at ${m.name} went unpaid. The letter that followed was brief, typed, and final.`,
          tone: "bad",
        });
        if (d) d.reputation = clamp(d.reputation - 2);
      }
    }
  }

  // Traditions: auto-hold when active and affordable; skipping erodes unity.
  if (d?.traditions?.length) {
    if (d.unity === undefined) d.unity = 60;
    for (const t of d.traditions) {
      const def = TRADITION_DEFS.find((x) => x.id === t.id);
      if (t.active && c.money >= t.cost) {
        c.money -= t.cost;
        t.yearsMaintained += 1;
        t.missedStreak = 0;
        t.totalSpent += t.cost;
        t.attendance = Math.max(2, familyHeadcount(c) + randInt(-1, 3));
        const streakBonus = t.yearsMaintained % 10 === 0 ? 3 : 0;
        d.unity = clamp(d.unity + (def?.unity ?? 3) / 2 + streakBonus);
        d.reputation = clamp(d.reputation + (def?.prestige ?? 1) / 2);
        c.stats.happiness = clamp(
          c.stats.happiness + Math.ceil((def?.happiness ?? 2) / 2),
        );
        if (streakBonus)
          log.push({
            age: c.age,
            text: `${t.yearsMaintained} straight years of the ${t.name}. It stopped being an event and became who the family is.`,
            tone: "milestone",
          });
      } else {
        t.missedStreak += 1;
        if (t.missedStreak >= 2) {
          d.unity = clamp(d.unity - Math.min(6, t.missedStreak * 2));
          if (t.missedStreak === 2)
            log.push({
              age: c.age,
              text: `The ${t.name} was skipped again. Two misses is a pattern, and families read patterns.`,
              tone: "bad",
            });
        }
      }
    }
    // Unity drifts toward the middle without care.
    if (!d.traditions.some((t) => t.active)) d.unity = clamp(d.unity - 1);
  }
}
