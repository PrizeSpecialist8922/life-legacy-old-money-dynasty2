import type {
  Character,
  LifestyleState,
  LogEntry,
  LogTone,
  StaffMember,
} from "./types";
import { ensureDynasty } from "./legacy";
import { ensurePedigree } from "./oldmoney";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Lifestyle (Build 11B). The Seat was stone; now it grows wings, gardens,
// vineyards and a staff who know which fork you prefer. None of it is free —
// old money is mostly the art of paying maintenance without flinching.
// ---------------------------------------------------------------------------

export interface LifestyleResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): LifestyleResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export function ensureLifestyle(c: Character): LifestyleState {
  if (!c.lifestyle) c.lifestyle = { staff: [], transport: [], sync: {} };
  if (!c.lifestyle.sync) c.lifestyle.sync = {};
  if (!c.lifestyle.staff) c.lifestyle.staff = [];
  if (!c.lifestyle.transport) c.lifestyle.transport = [];
  return c.lifestyle;
}

// ---------- Estate upgrades ----------

export interface EstateUpgradeDef {
  id: string;
  name: string;
  cost: number;
  maintenance: number; // annual
  prestige: number; // house prestige bonus
  visitors: number; // visitor capacity added
  minSeatValue?: number; // some things need grounds to put them on
}

export const ESTATE_UPGRADES: EstateUpgradeDef[] = [
  {
    id: "manor",
    name: "Manor House",
    cost: 2500000,
    maintenance: 60000,
    prestige: 8,
    visitors: 30,
  },
  {
    id: "mansion",
    name: "Mansion Wing",
    cost: 6000000,
    maintenance: 140000,
    prestige: 12,
    visitors: 60,
    minSeatValue: 3000000,
  },
  {
    id: "gardens",
    name: "Formal Gardens",
    cost: 400000,
    maintenance: 30000,
    prestige: 4,
    visitors: 40,
  },
  {
    id: "vineyard",
    name: "Vineyard",
    cost: 1800000,
    maintenance: 90000,
    prestige: 6,
    visitors: 20,
    minSeatValue: 2000000,
  },
  {
    id: "winery",
    name: "Winery",
    cost: 2200000,
    maintenance: 110000,
    prestige: 7,
    visitors: 25,
    minSeatValue: 2000000,
  },
  {
    id: "tennis",
    name: "Tennis Courts",
    cost: 250000,
    maintenance: 15000,
    prestige: 2,
    visitors: 8,
  },
  {
    id: "golf",
    name: "Golf Course",
    cost: 5000000,
    maintenance: 350000,
    prestige: 10,
    visitors: 40,
    minSeatValue: 8000000,
  },
  {
    id: "pool",
    name: "Swimming Pool",
    cost: 300000,
    maintenance: 20000,
    prestige: 2,
    visitors: 15,
  },
  {
    id: "stable",
    name: "Stables",
    cost: 900000,
    maintenance: 80000,
    prestige: 5,
    visitors: 10,
    minSeatValue: 2000000,
  },
  {
    id: "guesthouses",
    name: "Guest Houses",
    cost: 1200000,
    maintenance: 45000,
    prestige: 4,
    visitors: 25,
  },
  {
    id: "chapel",
    name: "Private Chapel",
    cost: 800000,
    maintenance: 18000,
    prestige: 6,
    visitors: 40,
  },
  {
    id: "museum",
    name: "Private Museum",
    cost: 3500000,
    maintenance: 120000,
    prestige: 9,
    visitors: 60,
    minSeatValue: 5000000,
  },
  {
    id: "library",
    name: "Great Library",
    cost: 1500000,
    maintenance: 35000,
    prestige: 7,
    visitors: 20,
  },
  {
    id: "observatory",
    name: "Observatory",
    cost: 1100000,
    maintenance: 30000,
    prestige: 5,
    visitors: 10,
  },
  {
    id: "conservatory",
    name: "Conservatory",
    cost: 700000,
    maintenance: 25000,
    prestige: 4,
    visitors: 15,
  },
  {
    id: "dock",
    name: "Private Dock",
    cost: 600000,
    maintenance: 28000,
    prestige: 3,
    visitors: 10,
  },
  {
    id: "helipad",
    name: "Helipad",
    cost: 450000,
    maintenance: 20000,
    prestige: 3,
    visitors: 4,
  },
  {
    id: "sculpture",
    name: "Sculpture Garden",
    cost: 550000,
    maintenance: 22000,
    prestige: 4,
    visitors: 20,
  },
  {
    id: "ballroom",
    name: "Ballroom",
    cost: 2000000,
    maintenance: 55000,
    prestige: 8,
    visitors: 120,
    minSeatValue: 3000000,
  },
  {
    id: "cellar",
    name: "Wine Cellar",
    cost: 350000,
    maintenance: 12000,
    prestige: 3,
    visitors: 8,
  },
  {
    id: "security",
    name: "Security Compound",
    cost: 1600000,
    maintenance: 130000,
    prestige: 2,
    visitors: 0,
  },
];

export function upgradeDef(id: string): EstateUpgradeDef | undefined {
  return ESTATE_UPGRADES.find((u) => u.id === id);
}

export function seatUpgrades(c: Character): EstateUpgradeDef[] {
  const ids = c.dynasty?.seat?.upgrades ?? [];
  return ids
    .map((i) => upgradeDef(i))
    .filter((u): u is EstateUpgradeDef => !!u);
}

/** Full estate value: the Seat plus everything bolted onto it. */
export function estateValue(c: Character): number {
  const seat = c.dynasty?.seat;
  if (!seat) return 0;
  return Math.round(
    seat.value + seatUpgrades(c).reduce((s, u) => s + u.cost * 0.8, 0),
  );
}

export function estateMaintenance(c: Character): number {
  const seat = c.dynasty?.seat;
  if (!seat) return 0;
  const upgrades = seatUpgrades(c).reduce((s, u) => s + u.maintenance, 0);
  const tax = Math.round(estateValue(c) * 0.008); // property tax
  return upgrades + tax;
}

export function visitorCapacity(c: Character): number {
  const seat = c.dynasty?.seat;
  if (!seat) return 0;
  return 20 + seatUpgrades(c).reduce((s, u) => s + u.visitors, 0);
}

/** Historical significance grows with years held, portraits, and upgrades. */
export function historicalSignificance(c: Character): number {
  const seat = c.dynasty?.seat;
  if (!seat) return 0;
  return clamp(
    seat.yearsHeld * 2 +
      seat.portraits.length * 5 +
      seatUpgrades(c).length * 3 +
      (c.dynasty?.pedigree ?? 0) / 4,
  );
}

export function buildEstateUpgrade(
  input: Character,
  upgradeId: string,
): LifestyleResult {
  const c = structuredClone(input);
  const seat = c.dynasty?.seat;
  const def = upgradeDef(upgradeId);
  if (!seat)
    return fail(input, "You need a Family Seat before you can improve one.");
  if (!def) return fail(input, "Unknown upgrade.");
  seat.upgrades = seat.upgrades ?? [];
  if (seat.upgrades.includes(def.id))
    return fail(input, `The estate already has ${def.name.toLowerCase()}.`);
  if (def.minSeatValue && seat.value < def.minSeatValue)
    return fail(
      input,
      `${def.name} needs grander grounds — a Seat worth at least ${formatMoney(def.minSeatValue)}.`,
    );
  if (c.money < def.cost)
    return fail(input, `You need ${formatMoney(def.cost)}.`);
  c.money -= def.cost;
  seat.upgrades.push(def.id);
  seat.housePrestige = clamp(seat.housePrestige + def.prestige);
  const msg = `${def.name} added to ${seat.name}. Annual upkeep ${formatMoney(def.maintenance)} — the price of never having to explain who you are.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Household staff ----------

export interface StaffRoleDef {
  id: string;
  role: string;
  baseSalary: number;
  hint: string;
}

export const STAFF_ROLES: StaffRoleDef[] = [
  {
    id: "butler",
    role: "Butler",
    baseSalary: 95000,
    hint: "Runs the house; house prestige grows faster",
  },
  {
    id: "estatemanager",
    role: "Estate Manager",
    baseSalary: 120000,
    hint: "Cuts estate maintenance costs",
  },
  {
    id: "chef",
    role: "Chef",
    baseSalary: 85000,
    hint: "+Health and happier gatherings",
  },
  {
    id: "housekeeper",
    role: "Housekeeper",
    baseSalary: 55000,
    hint: "Keeps the estate in condition",
  },
  {
    id: "chauffeur",
    role: "Chauffeur",
    baseSalary: 60000,
    hint: "Convenience; a little energy back",
  },
  {
    id: "gardener",
    role: "Gardener",
    baseSalary: 50000,
    hint: "Gardens and grounds shine",
  },
  {
    id: "groundskeeper",
    role: "Groundskeeper",
    baseSalary: 58000,
    hint: "Protects estate value",
  },
  {
    id: "securityteam",
    role: "Security Team",
    baseSalary: 180000,
    hint: "Guards the family and its secrets",
  },
  {
    id: "nanny",
    role: "Nanny",
    baseSalary: 65000,
    hint: "Children feel looked after",
  },
  {
    id: "tutor",
    role: "Tutor",
    baseSalary: 75000,
    hint: "Children's academics improve yearly",
  },
  {
    id: "pa",
    role: "Personal Assistant",
    baseSalary: 70000,
    hint: "Networking compounds",
  },
  {
    id: "sommelier",
    role: "Sommelier",
    baseSalary: 68000,
    hint: "Wine collection appreciates faster",
  },
  {
    id: "curator",
    role: "Curator",
    baseSalary: 90000,
    hint: "Art and collections appreciate faster",
  },
];

const STAFF_NAMES = [
  "Mrs. Danvers",
  "Carson",
  "Alfred",
  "Ines",
  "Mr. Stevens",
  "Beatrice",
  "Laszlo",
  "Marguerite",
  "Oyelaran",
  "Tomasz",
  "Consuelo",
  "Haruki",
  "Fatima",
  "Declan",
  "Vivienne",
  "Ngozi",
];

export function staffDef(id: string): StaffRoleDef | undefined {
  return STAFF_ROLES.find((s) => s.id === id);
}

export function hireStaff(input: Character, roleId: string): LifestyleResult {
  const c = structuredClone(input);
  const def = staffDef(roleId);
  if (!def) return fail(input, "Unknown position.");
  if (!c.dynasty?.seat)
    return fail(
      input,
      "Household staff need a household — acquire a Family Seat first.",
    );
  const ls = ensureLifestyle(c);
  if (ls.staff.some((s) => s.role === def.id))
    return fail(input, `You already employ a ${def.role.toLowerCase()}.`);
  const competence = randInt(35, 85);
  const salary = Math.round(def.baseSalary * (0.8 + competence / 200));
  if (c.money < salary)
    return fail(
      input,
      `First year's salary is ${formatMoney(salary)} — you can't cover it.`,
    );
  const member: StaffMember = {
    id: uid(),
    role: def.id,
    name: randItem(STAFF_NAMES),
    competence,
    loyalty: randInt(40, 70),
    experience: 0,
    salary,
  };
  ls.staff.push(member);
  const msg = `${member.name} joins as ${def.role} — competence ${member.competence}, ${formatMoney(salary)}/yr. Good staff are the quietest luxury.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function dismissStaff(
  input: Character,
  staffId: string,
): LifestyleResult {
  const c = structuredClone(input);
  const ls = ensureLifestyle(c);
  const idx = ls.staff.findIndex((s) => s.id === staffId);
  if (idx < 0) return fail(input, "They don't work here.");
  const s = ls.staff[idx];
  const severance = Math.round(s.salary * Math.min(1, s.experience * 0.15));
  if (c.money < severance)
    return fail(
      input,
      `Severance would be ${formatMoney(severance)} — you can't afford to let them go properly.`,
    );
  c.money -= severance;
  ls.staff.splice(idx, 1);
  const msg = `${s.name} (${staffDef(s.role)?.role ?? s.role}) dismissed with ${formatMoney(severance)} severance and a reference written in the old style.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function raiseStaff(input: Character, staffId: string): LifestyleResult {
  const c = structuredClone(input);
  const ls = ensureLifestyle(c);
  const s = ls.staff.find((x) => x.id === staffId);
  if (!s) return fail(input, "They don't work here.");
  const bump = Math.round(s.salary * 0.12);
  if (c.money < bump) return fail(input, "You can't cover the raise.");
  c.money -= bump; // first year paid now
  s.salary += bump;
  s.loyalty = clamp(s.loyalty + randInt(8, 15));
  s.competence = clamp(s.competence + randInt(1, 4));
  const msg = `${s.name}'s salary raised to ${formatMoney(s.salary)}/yr. Loyalty is bought slowly and lost quickly.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function staffQuality(c: Character): number {
  const staff = c.lifestyle?.staff ?? [];
  if (!staff.length) return 0;
  return Math.round(
    staff.reduce(
      (s, m) => s + m.competence + Math.min(20, m.experience * 2),
      0,
    ) / staff.length,
  );
}

export function staffPayroll(c: Character): number {
  return (c.lifestyle?.staff ?? []).reduce((s, m) => s + m.salary, 0);
}

function hasStaff(c: Character, roleId: string): StaffMember | undefined {
  return c.lifestyle?.staff.find((s) => s.role === roleId);
}

// ---------- Private aviation & transport ----------

export interface TransportDef {
  id: string;
  kind: string;
  name: string;
  cost: number;
  upkeep: number;
  crew: number;
  prestige: number;
  berthLabel: string;
  berthCost: number;
}

export const TRANSPORT_DEFS: TransportDef[] = [
  {
    id: "helicopter",
    kind: "helicopter",
    name: "Helicopter",
    cost: 3500000,
    upkeep: 400000,
    crew: 2,
    prestige: 3,
    berthLabel: "Hangar",
    berthCost: 350000,
  },
  {
    id: "jet",
    kind: "jet",
    name: "Private Jet",
    cost: 18000000,
    upkeep: 2200000,
    crew: 4,
    prestige: 6,
    berthLabel: "Hangar",
    berthCost: 900000,
  },
  {
    id: "yacht",
    kind: "yacht",
    name: "Luxury Yacht",
    cost: 12000000,
    upkeep: 1200000,
    crew: 6,
    prestige: 5,
    berthLabel: "Marina berth",
    berthCost: 500000,
  },
  {
    id: "superyacht",
    kind: "superyacht",
    name: "Superyacht",
    cost: 80000000,
    upkeep: 8000000,
    crew: 25,
    prestige: 12,
    berthLabel: "Marina berth",
    berthCost: 2500000,
  },
];

export function transportDef(id: string): TransportDef | undefined {
  return TRANSPORT_DEFS.find((t) => t.id === id);
}

export function buyTransport(input: Character, defId: string): LifestyleResult {
  const c = structuredClone(input);
  const def = transportDef(defId);
  if (!def) return fail(input, "Unknown vessel.");
  const ls = ensureLifestyle(c);
  if (ls.transport.some((t) => t.kind === def.kind))
    return fail(input, `You already own a ${def.name.toLowerCase()}.`);
  if (c.money < def.cost)
    return fail(input, `You need ${formatMoney(def.cost)}.`);
  c.money -= def.cost;
  ls.transport.push({
    id: uid(),
    kind: def.kind,
    name: def.name,
    value: def.cost,
    upkeep: def.upkeep,
    crew: def.crew,
  });
  const msg = `${def.name} delivered — crew of ${def.crew}, ${formatMoney(def.upkeep)}/yr to run. New money buys the boat; old money knows the boat is a hole in the water.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function sellTransport(
  input: Character,
  transportId: string,
): LifestyleResult {
  const c = structuredClone(input);
  const ls = ensureLifestyle(c);
  const idx = ls.transport.findIndex((t) => t.id === transportId);
  if (idx < 0) return fail(input, "You don't own that.");
  const t = ls.transport[idx];
  const price = Math.round(t.value * 0.85);
  c.money += price;
  ls.transport.splice(idx, 1);
  const msg = `${t.name} sold for ${formatMoney(price)}. The crew found new berths; the family found the money useful.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function refitTransport(
  input: Character,
  transportId: string,
): LifestyleResult {
  const c = structuredClone(input);
  const t = ensureLifestyle(c).transport.find((x) => x.id === transportId);
  if (!t) return fail(input, "You don't own that.");
  if (t.upgraded) return fail(input, "Already refitted to the last rivet.");
  const cost = Math.round(t.value * 0.15);
  if (c.money < cost)
    return fail(input, `The refit quote is ${formatMoney(cost)}.`);
  c.money -= cost;
  t.upgraded = true;
  t.value = Math.round(t.value * 1.12);
  const msg = `${t.name} refitted — ${formatMoney(cost)} of walnut, leather and avionics.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function buyBerth(
  input: Character,
  transportId: string,
): LifestyleResult {
  const c = structuredClone(input);
  const t = ensureLifestyle(c).transport.find((x) => x.id === transportId);
  if (!t) return fail(input, "You don't own that.");
  if (t.berth) return fail(input, "Already berthed.");
  const def = TRANSPORT_DEFS.find((d) => d.kind === t.kind);
  const cost = def?.berthCost ?? 500000;
  if (c.money < cost)
    return fail(
      input,
      `${def?.berthLabel ?? "Berth"} costs ${formatMoney(cost)}.`,
    );
  c.money -= cost;
  t.berth = true;
  t.upkeep = Math.round(t.upkeep * 0.9); // owning the berth beats renting it
  const msg = `${def?.berthLabel ?? "Berth"} secured for the ${t.name.toLowerCase()} — running costs drop to ${formatMoney(t.upkeep)}/yr.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function transportValue(c: Character): number {
  return (c.lifestyle?.transport ?? []).reduce((s, t) => s + t.value, 0);
}

export function transportUpkeep(c: Character): number {
  return (c.lifestyle?.transport ?? []).reduce((s, t) => s + t.upkeep, 0);
}

export function transportPrestige(c: Character): number {
  return (c.lifestyle?.transport ?? []).reduce((s, t) => {
    const def = TRANSPORT_DEFS.find((d) => d.kind === t.kind);
    return s + (def?.prestige ?? 0);
  }, 0);
}

// ---------- Estate events ----------

const ESTATE_EVENTS: {
  text: string;
  tone: LogTone;
  unity: number;
  happiness: number;
}[] = [
  {
    text: "A summer garden party sprawled across the lawns — someone's aunt held court by the roses until midnight.",
    tone: "good",
    unity: 3,
    happiness: 3,
  },
  {
    text: "The cousins organised a doubles tournament on the court. The trophy is a soup tureen and it is taken deadly seriously.",
    tone: "good",
    unity: 4,
    happiness: 3,
  },
  {
    text: "A quiet evening in the library: three generations, one fire, no phones.",
    tone: "good",
    unity: 3,
    happiness: 2,
  },
  {
    text: "Harvest weekend at the vineyard — everyone's hands were purple and nobody minded.",
    tone: "good",
    unity: 4,
    happiness: 3,
  },
  {
    text: "The winter ball filled the ballroom for the first time in years. The floor remembered how.",
    tone: "milestone",
    unity: 5,
    happiness: 4,
  },
  {
    text: "A pipe burst in the east wing during the family weekend. The staff handled it; the stories about it will outlive the pipe.",
    tone: "neutral",
    unity: 2,
    happiness: 1,
  },
];

// ---------- Yearly advance ----------

export function advanceLifestyle(c: Character, log: LogEntry[]) {
  const ls = c.lifestyle;
  const seat = c.dynasty?.seat;

  // --- Estate maintenance + property tax ---
  if (seat) {
    let bill = estateMaintenance(c);
    const manager = hasStaff(c, "estatemanager");
    if (manager) bill = Math.round(bill * (1 - manager.competence / 400)); // up to −25%
    if (bill > 0) {
      if (c.money >= bill) {
        c.money -= bill;
      } else {
        c.money = Math.max(0, c.money - bill);
        seat.value = Math.round(seat.value * 0.97);
        log.push({
          age: c.age,
          text: "Estate maintenance went unpaid in full. Deferred repairs are a loan the house collects with interest.",
          tone: "bad",
        });
      }
    }
    // Groundskeeper protects value; neglect erodes it slowly.
    const grounds = hasStaff(c, "groundskeeper") || hasStaff(c, "gardener");
    seat.value = Math.round(seat.value * (grounds ? 1.015 : 1.005));

    // Estate events — family gathers where there's room to gather.
    const upgrades = seat.upgrades?.length ?? 0;
    if (Math.random() < 0.25 + upgrades * 0.03) {
      const ev = randItem(ESTATE_EVENTS);
      const d = ensurePedigree(ensureDynasty(c));
      d.unity = clamp((d.unity ?? 60) + ev.unity);
      c.stats.happiness = clamp(c.stats.happiness + ev.happiness);
      log.push({ age: c.age, text: ev.text, tone: ev.tone });
    }
  }

  if (!ls) return;

  // --- Staff payroll + drift ---
  let payroll = staffPayroll(c);
  if (payroll > 0) {
    if (c.money >= payroll) {
      c.money -= payroll;
      for (const s of ls.staff) {
        s.experience += 1;
        s.competence = clamp(s.competence + randInt(0, 2));
        s.loyalty = clamp(s.loyalty + randInt(-2, 3));
      }
    } else {
      // Can't make payroll: the best leave first.
      c.money = Math.max(0, c.money - payroll);
      ls.staff.sort((a, b) => b.competence - a.competence);
      const leaver = ls.staff.shift();
      if (leaver)
        log.push({
          age: c.age,
          text: `Payroll came up short. ${leaver.name} gave notice with perfect manners, which somehow made it worse.`,
          tone: "bad",
        });
      payroll = staffPayroll(c);
    }
  }

  // Departures: low loyalty staff drift away.
  const quitting = ls.staff.filter(
    (s) => s.loyalty < 25 && Math.random() < 0.4,
  );
  for (const q of quitting) {
    ls.staff = ls.staff.filter((s) => s.id !== q.id);
    log.push({
      age: c.age,
      text: `${q.name} left for another household. No scene; just a letter on the tray.`,
      tone: "neutral",
    });
  }

  // Staff effects.
  const butler = hasStaff(c, "butler");
  if (butler && seat)
    seat.housePrestige = clamp(
      seat.housePrestige + (butler.competence >= 60 ? 1 : 0),
    );
  const chef = hasStaff(c, "chef");
  if (chef) c.stats.health = clamp(c.stats.health + 1);
  const pa = hasStaff(c, "pa");
  if (pa) c.networking = clamp((c.networking ?? 0) + 1);
  const security = hasStaff(c, "securityteam");
  if (security && c.dynasty?.sin && !c.dynasty.sin.detonated) {
    c.dynasty.sin.exposure = clamp(c.dynasty.sin.exposure - 2);
  }
  const tutor = hasStaff(c, "tutor");
  const nanny = hasStaff(c, "nanny");
  if ((tutor || nanny) && c.children?.length) {
    for (const kid of c.children) {
      if (kid.cutOff) continue;
      if (tutor)
        kid.academics = clamp(
          kid.academics + Math.max(1, Math.round(tutor.competence / 30)),
        );
      if (nanny) {
        kid.affection = clamp(kid.affection + 1);
        kid.resentment = clamp(kid.resentment - 1);
      }
    }
  }

  // --- Transport upkeep + depreciation ---
  const upkeep = transportUpkeep(c);
  if (upkeep > 0) {
    if (c.money >= upkeep) {
      c.money -= upkeep;
      c.stats.happiness = clamp(c.stats.happiness + 1); // convenience is real
    } else {
      c.money = Math.max(0, c.money - upkeep);
      // A vessel you can't run gets sold at a discount by your own accountant.
      const t = ls.transport[0];
      if (t) {
        const price = Math.round(t.value * 0.7);
        c.money += price;
        ls.transport.shift();
        log.push({
          age: c.age,
          text: `The ${t.name.toLowerCase()} couldn't be kept running and went for ${formatMoney(price)}. Boats forgive nothing.`,
          tone: "bad",
        });
      }
    }
    for (const t of ls.transport) t.value = Math.round(t.value * 0.96);
  }
}
