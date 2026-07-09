import type { BoardSeat, Character, LogEntry, LogTone } from "./types";
import { ensureRecords, recordArchive } from "./records";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Philanthropy, Named Buildings & Boards (Build 11B). The last stage of money
// is giving it away with your name attached. Buildings outlive fortunes;
// board seats are where the giving is negotiated over bad coffee.
// ---------------------------------------------------------------------------

export interface PhilResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): PhilResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

// ---------- Causes ----------

export interface CauseDef {
  id: string;
  name: string;
  min: number;
  impact: number; // per $1M given
  reputation: number;
}

export const CAUSES: CauseDef[] = [
  {
    id: "scholarship",
    name: "Endow a Scholarship",
    min: 250000,
    impact: 8,
    reputation: 3,
  },
  {
    id: "hospital",
    name: "Fund a Hospital",
    min: 1000000,
    impact: 6,
    reputation: 4,
  },
  {
    id: "university",
    name: "Fund a University",
    min: 1000000,
    impact: 5,
    reputation: 4,
  },
  {
    id: "research",
    name: "Sponsor Research",
    min: 500000,
    impact: 7,
    reputation: 2,
  },
  {
    id: "museum",
    name: "Support a Museum",
    min: 250000,
    impact: 4,
    reputation: 3,
  },
  {
    id: "disaster",
    name: "Disaster Relief",
    min: 100000,
    impact: 9,
    reputation: 3,
  },
  {
    id: "arts",
    name: "Support the Arts",
    min: 100000,
    impact: 4,
    reputation: 2,
  },
  {
    id: "community",
    name: "Community Projects",
    min: 100000,
    impact: 7,
    reputation: 2,
  },
];

export function causeDef(id: string): CauseDef | undefined {
  return CAUSES.find((x) => x.id === id);
}

// ---------- Foundation ----------

export function createFoundation(
  input: Character,
  name: string,
  seed: number,
): PhilResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  if (d.foundation)
    return fail(input, `The ${d.foundation.name} already exists.`);
  const cleanName = name.trim() || `The ${d.familyName} Foundation`;
  const minSeed = 1000000;
  if (seed < minSeed)
    return fail(
      input,
      `A serious foundation starts at ${formatMoney(minSeed)}.`,
    );
  if (c.money < seed)
    return fail(input, `You don't have ${formatMoney(seed)}.`);
  c.money -= seed;
  d.foundation = {
    name: cleanName,
    assets: seed,
    lifetimeDonations: seed,
    impact: 5,
    scholarships: 0,
    causes: [],
  };
  d.foundationsLaunched = (d.foundationsLaunched ?? 0) + 1;
  d.reputation = clamp(d.reputation + 5);
  recordArchive(
    c,
    "foundation",
    `${c.name} launched the ${cleanName} with ${formatMoney(seed)}.`,
    `fdnA:${cleanName}`,
  );
  const msg = `The ${cleanName} is chartered with ${formatMoney(seed)}. Money finally doing something it can be proud of.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function donate(
  input: Character,
  causeId: string,
  amount: number,
  viaFoundation: boolean,
): PhilResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  const cause = causeDef(causeId);
  if (!cause) return fail(input, "Unknown cause.");
  if (amount < cause.min)
    return fail(input, `${cause.name} starts at ${formatMoney(cause.min)}.`);
  const f = d.foundation;
  if (viaFoundation) {
    if (!f) return fail(input, "No foundation exists yet.");
    if (f.assets < amount)
      return fail(input, `The foundation holds only ${formatMoney(f.assets)}.`);
    f.assets -= amount;
  } else {
    if (c.money < amount)
      return fail(input, `You don't have ${formatMoney(amount)}.`);
    c.money -= amount;
  }
  const impactGain = Math.min(15, (amount / 1000000) * cause.impact);
  if (f) {
    f.lifetimeDonations += amount;
    f.impact = clamp(f.impact + impactGain);
    if (!f.causes.includes(cause.name)) f.causes.push(cause.name);
    if (cause.id === "scholarship")
      f.scholarships += Math.max(1, Math.floor(amount / 250000));
  }
  d.reputation = clamp(
    d.reputation +
      Math.min(6, cause.reputation * Math.ceil(amount / cause.min / 2)),
  );
  c.stats.happiness = clamp(c.stats.happiness + 2);
  const msg = `${formatMoney(amount)} to ${cause.name.toLowerCase().replace("endow a ", "endow ").replace("fund a ", "")}${viaFoundation && f ? ` via the ${f.name}` : ""}. Impact is the only return that compounds after death.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function fundFoundation(input: Character, amount: number): PhilResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  const f = d.foundation;
  if (!f) return fail(input, "No foundation exists yet.");
  if (amount < 100000) return fail(input, "Top-ups start at $100,000.");
  if (c.money < amount)
    return fail(input, `You don't have ${formatMoney(amount)}.`);
  c.money -= amount;
  f.assets += amount;
  f.lifetimeDonations += amount;
  const msg = `${formatMoney(amount)} transferred to the ${f.name} — corpus now ${formatMoney(f.assets)}.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Named buildings ----------

export interface BuildingDef {
  id: string;
  kind: string;
  label: string;
  cost: number;
  reputation: number;
}

export const BUILDING_DEFS: BuildingDef[] = [
  {
    id: "publiclibrary",
    kind: "library",
    label: "Public Library",
    cost: 5000000,
    reputation: 6,
  },
  {
    id: "universityhall",
    kind: "hall",
    label: "University Hall",
    cost: 15000000,
    reputation: 8,
  },
  {
    id: "medicalcenter",
    kind: "medical",
    label: "Medical Center",
    cost: 40000000,
    reputation: 12,
  },
  {
    id: "researchinstitute",
    kind: "research",
    label: "Research Institute",
    cost: 25000000,
    reputation: 10,
  },
  {
    id: "museumwing",
    kind: "museum",
    label: "Museum Wing",
    cost: 10000000,
    reputation: 7,
  },
  {
    id: "artscenter",
    kind: "arts",
    label: "Performing Arts Center",
    cost: 20000000,
    reputation: 9,
  },
];

export function buildingDef(id: string): BuildingDef | undefined {
  return BUILDING_DEFS.find((b) => b.id === id);
}

export function fundBuilding(
  input: Character,
  buildingId: string,
  viaFoundation: boolean,
): PhilResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  const def = buildingDef(buildingId);
  if (!def) return fail(input, "Unknown project.");
  d.namedBuildings = d.namedBuildings ?? [];
  if (d.namedBuildings.some((b) => b.kind === def.kind))
    return fail(
      input,
      `The family name is already on a ${def.label.toLowerCase()}.`,
    );
  const f = d.foundation;
  if (viaFoundation) {
    if (!f) return fail(input, "No foundation exists yet.");
    if (f.assets < def.cost)
      return fail(input, `The foundation holds only ${formatMoney(f.assets)}.`);
    f.assets -= def.cost;
  } else {
    if (c.money < def.cost)
      return fail(input, `${def.label} costs ${formatMoney(def.cost)}.`);
    c.money -= def.cost;
  }
  const name = `The ${d.familyName} ${def.label}`;
  d.namedBuildings.push({ id: uid(), kind: def.kind, name, cost: def.cost });
  if (f) {
    f.lifetimeDonations += def.cost;
    f.impact = clamp(f.impact + 8);
  }
  d.reputation = clamp(d.reputation + def.reputation);
  if (!d.patronage) d.patronage = [];
  d.patronage.push(name);
  recordArchive(c, "foundation", `${name} opened its doors.`, `bldA:${name}`);
  // A large enough gift to a university tends to come back as a robe and a scroll.
  if ((def.kind === "hall" || def.kind === "research") && Math.random() < 0.6) {
    c.log.push({
      age: c.age,
      text: "The university conferred an honorary doctorate at the dedication. Nobody said the quiet part; everyone heard it anyway.",
      tone: "good",
    });
    const lib = d.library ?? (d.library = []);
    const key = `hon:${c.name}`;
    if (!lib.some((l) => l.id === key))
      lib.push({
        id: key,
        category: "Honor",
        title: "Honorary Doctorate",
        person: c.name,
        generation: d.generation,
        age: c.age,
      });
  }
  const msg = `${name} — ${formatMoney(def.cost)}, and the family name in stone above a door strangers will walk through for a century.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Boards ----------

export interface BoardDef {
  id: string;
  kind: string;
  orgs: string[];
  minReputation: number; // dynasty reputation
  minNetworking: number;
  stipend: number;
}

export const BOARD_DEFS: BoardDef[] = [
  {
    id: "university",
    kind: "university",
    orgs: [
      "the University Board of Trustees",
      "the College Board of Governors",
    ],
    minReputation: 45,
    minNetworking: 40,
    stipend: 0,
  },
  {
    id: "museum",
    kind: "museum",
    orgs: ["the Museum Board", "the Gallery Trust"],
    minReputation: 40,
    minNetworking: 30,
    stipend: 0,
  },
  {
    id: "hospital",
    kind: "hospital",
    orgs: ["the Hospital Board", "the Medical Trust"],
    minReputation: 45,
    minNetworking: 35,
    stipend: 0,
  },
  {
    id: "foundation",
    kind: "foundation",
    orgs: ["a Charitable Foundation Board", "the Community Trust"],
    minReputation: 35,
    minNetworking: 25,
    stipend: 0,
  },
  {
    id: "corporation",
    kind: "corporation",
    orgs: ["a Public Company Board", "a Bank Board"],
    minReputation: 50,
    minNetworking: 60,
    stipend: 250000,
  },
];

export function boardDef(id: string): BoardDef | undefined {
  return BOARD_DEFS.find((b) => b.id === id);
}

export function ensureBoards(c: Character): BoardSeat[] {
  if (!c.boards) c.boards = [];
  return c.boards;
}

export function boardEligibility(
  c: Character,
  def: BoardDef,
): { ok: boolean; why: string } {
  if ((c.boards ?? []).some((b) => b.kind === def.kind))
    return { ok: false, why: "Already serving" };
  const rep = c.dynasty?.reputation ?? 40;
  if (rep < def.minReputation)
    return { ok: false, why: `Family reputation ${rep}/${def.minReputation}` };
  if ((c.networking ?? 0) < def.minNetworking)
    return {
      ok: false,
      why: `Connections ${c.networking ?? 0}/${def.minNetworking}`,
    };
  if (c.age < 30)
    return { ok: false, why: "Boards prefer grey at the temples" };
  if (c.criminalRecord >= 2)
    return { ok: false, why: "Governance committees run background checks" };
  return { ok: true, why: "" };
}

export function joinBoard(
  input: Character,
  boardId: string,
  spend: (c: Character) => boolean,
): PhilResult {
  const c = structuredClone(input);
  const def = boardDef(boardId);
  if (!def) return fail(input, "Unknown board.");
  const elig = boardEligibility(c, def);
  if (!elig.ok) return fail(input, `Not yet: ${elig.why.toLowerCase()}.`);
  if (!spend(c)) return fail(input, "No energy left this year.");
  ensureBoards(c).push({
    id: uid(),
    kind: def.kind,
    org: randItem(def.orgs),
    years: 0,
    influence: 10,
    stipend: def.stipend,
  });
  const d = ensureRecords(c);
  d.boardYearsTotal = d.boardYearsTotal ?? 0;
  const seat = c.boards![c.boards!.length - 1];
  const msg = `Appointed to ${seat.org}. The real agenda is never on the agenda.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function resignBoard(input: Character, seatId: string): PhilResult {
  const c = structuredClone(input);
  const boards = ensureBoards(c);
  const idx = boards.findIndex((b) => b.id === seatId);
  if (idx < 0) return fail(input, "You don't sit on that board.");
  const b = boards[idx];
  boards.splice(idx, 1);
  const msg = `Stepped down from ${b.org} after ${b.years} year${b.years === 1 ? "" : "s"}. The minutes will record "with thanks."`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Yearly advance ----------

const BOARD_EVENTS = [
  "A governance fight at %ORG% ended in the corridor, as they do. You backed the winner.",
  "The %ORG% retreat produced one useful introduction and forty slides.",
  "You chaired a committee at %ORG% this year. Influence is mostly attendance.",
];

export function advancePhilanthropy(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return;

  // Foundation: endowment returns, grants out, impact drift.
  const f = d.foundation;
  if (f) {
    const ret = f.assets * (0.04 + randInt(0, 4) / 100);
    const grants = f.assets * 0.05;
    f.assets = Math.max(0, Math.round(f.assets + ret - grants));
    if (grants > 0) {
      f.lifetimeDonations += Math.round(grants);
      f.impact = clamp(f.impact + Math.min(3, grants / 2000000));
    }
    f.impact = clamp(f.impact - 0.5); // impact fades without fresh giving
    if (Math.random() < 0.15 && f.impact >= 40) {
      d.reputation = clamp(d.reputation + 2);
      log.push({
        age: c.age,
        text: `A profile of the ${f.name} ran this year — the kind of press money can't buy directly, only eventually.`,
        tone: "good",
      });
    }
  }

  // Boards: years, influence, stipends, occasional flavor.
  if (c.boards?.length) {
    for (const b of c.boards) {
      b.years += 1;
      b.influence = clamp(b.influence + randInt(2, 6));
      d.boardYearsTotal = (d.boardYearsTotal ?? 0) + 1;
      if (b.stipend > 0) c.money += b.stipend;
      c.networking = clamp((c.networking ?? 0) + 1);
      if (Math.random() < 0.2) {
        log.push({
          age: c.age,
          text: randItem(BOARD_EVENTS).replace("%ORG%", b.org),
          tone: "neutral",
        });
      }
    }
  }

  // Invitations: high-reputation families get asked.
  if (c.age >= 35 && Math.random() < 0.12) {
    const open = BOARD_DEFS.filter((def) => boardEligibility(c, def).ok);
    if (open.length) {
      const def = randItem(open);
      log.push({
        age: c.age,
        text: `A discreet call: ${randItem(def.orgs)} has a vacancy and your name came up. (Family tab → Philanthropy)`,
        tone: "good",
      });
    }
  }
}
