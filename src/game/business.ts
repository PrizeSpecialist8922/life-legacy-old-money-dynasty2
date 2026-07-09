import type {
  BizEvent,
  Business,
  BusinessHub,
  BusinessKind,
  Character,
  LogEntry,
  LogTone,
} from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Business / Entrepreneurship (Build 10). Same conventions as politics.ts:
// clone → mutate → return ActionResult shape; advanceBusinesses runs yearly
// from ageUp; dramatic events are serializable data resolved from the hub UI.
// ---------------------------------------------------------------------------

export interface BizResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): BizResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export interface BusinessDef {
  kind: BusinessKind;
  label: string;
  startupCost: number;
  baseRevenue: number; // per location per year at demand 60
  employeeCost: number;
  locationCost: number; // yearly overhead per location
  employeesPerLocation: number; // needed for full operation
  eduFields: string[]; // degree keywords that boost this business
  risk: number; // volatility 0-100
  multiple: number; // valuation = profit * multiple
}

export const BUSINESS_DEFS: BusinessDef[] = [
  {
    kind: "restaurant",
    label: "Restaurant",
    startupCost: 120000,
    baseRevenue: 420000,
    employeeCost: 34000,
    locationCost: 90000,
    employeesPerLocation: 6,
    eduFields: ["business", "hospitality"],
    risk: 60,
    multiple: 3,
  },
  {
    kind: "retail",
    label: "Retail Store",
    startupCost: 80000,
    baseRevenue: 320000,
    employeeCost: 30000,
    locationCost: 70000,
    employeesPerLocation: 4,
    eduFields: ["business", "marketing"],
    risk: 50,
    multiple: 3,
  },
  {
    kind: "consulting",
    label: "Consulting Firm",
    startupCost: 30000,
    baseRevenue: 380000,
    employeeCost: 78000,
    locationCost: 40000,
    employeesPerLocation: 3,
    eduFields: ["business", "economics", "mba"],
    risk: 35,
    multiple: 5,
  },
  {
    kind: "lawfirm",
    label: "Law Firm",
    startupCost: 60000,
    baseRevenue: 520000,
    employeeCost: 105000,
    locationCost: 60000,
    employeesPerLocation: 3,
    eduFields: ["law"],
    risk: 30,
    multiple: 5,
  },
  {
    kind: "accounting",
    label: "Accounting Firm",
    startupCost: 40000,
    baseRevenue: 360000,
    employeeCost: 72000,
    locationCost: 45000,
    employeesPerLocation: 3,
    eduFields: ["accounting", "business", "finance"],
    risk: 25,
    multiple: 5,
  },
  {
    kind: "tech",
    label: "Tech Startup",
    startupCost: 90000,
    baseRevenue: 500000,
    employeeCost: 110000,
    locationCost: 50000,
    employeesPerLocation: 4,
    eduFields: ["computer", "engineering"],
    risk: 80,
    multiple: 9,
  },
  {
    kind: "ai",
    label: "AI Startup",
    startupCost: 150000,
    baseRevenue: 650000,
    employeeCost: 140000,
    locationCost: 55000,
    employeesPerLocation: 4,
    eduFields: ["computer", "math", "engineering"],
    risk: 90,
    multiple: 12,
  },
  {
    kind: "media",
    label: "Media Company",
    startupCost: 50000,
    baseRevenue: 300000,
    employeeCost: 60000,
    locationCost: 35000,
    employeesPerLocation: 3,
    eduFields: ["communications", "marketing", "arts"],
    risk: 65,
    multiple: 6,
  },
  {
    kind: "fitness",
    label: "Fitness Brand",
    startupCost: 70000,
    baseRevenue: 280000,
    employeeCost: 38000,
    locationCost: 55000,
    employeesPerLocation: 3,
    eduFields: ["kinesiology", "business"],
    risk: 55,
    multiple: 4,
  },
  {
    kind: "realestate",
    label: "Real Estate Company",
    startupCost: 100000,
    baseRevenue: 450000,
    employeeCost: 65000,
    locationCost: 45000,
    employeesPerLocation: 3,
    eduFields: ["business", "finance"],
    risk: 45,
    multiple: 4,
  },
];

export function bizDef(kind: BusinessKind): BusinessDef {
  return BUSINESS_DEFS.find((d) => d.kind === kind)!;
}

export function ensureBusinessHub(c: Character): BusinessHub {
  if (!c.businessHub)
    c.businessHub = { businesses: [], lifetimeProfit: 0, soldFor: 0, failures: 0 };
  return c.businessHub;
}

/** How well the founder's background fits this business: 0..1. */
export function founderFit(c: Character, def: BusinessDef): number {
  let fit = 0.3;
  fit += (c.stats.smarts / 100) * 0.2;
  fit += ((c.networking ?? 0) / 100) * 0.15;
  fit += (c.businessReputation / 100) * 0.15;
  const degrees = (c.edu.degrees ?? []).join(" ").toLowerCase();
  if (def.eduFields.some((f) => degrees.includes(f))) fit += 0.15;
  if ((c.jobYearsAccrued ?? 0) >= 5) fit += 0.05;
  return Math.min(1, fit);
}

// ---------- Lifecycle ----------

export function startBusiness(input: Character, kind: BusinessKind, name: string): BizResult {
  const c: Character = structuredClone(input);
  const hub = ensureBusinessHub(c);
  const def = bizDef(kind);
  if (c.age < 18) return fail(input, "You must be 18 to register a business.");
  if (hub.businesses.length >= 3)
    return fail(input, "Three businesses is already a full plate. Sell or close one first.");
  if (c.money < def.startupCost)
    return fail(input, `You need $${def.startupCost.toLocaleString()} to start a ${def.label}.`);
  const clean = name.trim().slice(0, 40) || `${c.name.split(" ")[0]}'s ${def.label}`;
  c.money -= def.startupCost;
  const biz: Business = {
    id: uid(),
    kind,
    name: clean,
    cash: Math.round(def.startupCost * 0.5),
    revenue: 0,
    expenses: 0,
    profit: 0,
    employees: Math.max(1, def.employeesPerLocation - 2),
    reputation: 25 + Math.round(c.businessReputation / 4),
    satisfaction: 50,
    quality: 40 + Math.round(founderFit(c, def) * 20),
    marketing: 20,
    priceLevel: 1.0,
    locations: 1,
    growth: 0,
    yearsRunning: 0,
    valuation: Math.round(def.startupCost * 0.8),
    investorOwned: 0,
    loan: 0,
  };
  hub.businesses.push(biz);
  const msg = `You founded ${clean}! Doors open — now make it survive.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

function findBiz(c: Character, id: string): Business | undefined {
  return c.businessHub?.businesses.find((b) => b.id === id);
}

// ---------- Management actions (1 energy each) ----------

type Spend = (c: Character) => boolean;

export function bizHire(input: Character, id: string, spend: Spend): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  const def = bizDef(b.kind);
  if (b.cash < def.employeeCost * 0.5)
    return fail(input, "Not enough business cash to cover a new hire.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  b.employees += 1;
  b.cash -= Math.round(def.employeeCost * 0.25); // recruiting & onboarding
  b.quality = clamp(b.quality + randInt(1, 3));
  const msg = `${b.name} hired a new employee (${b.employees} total).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function bizMarketing(input: Character, id: string, spend: Spend): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  const cost = 8000 + b.locations * 6000;
  if (b.cash < cost)
    return fail(input, `A campaign costs $${cost.toLocaleString()} in business cash.`);
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  b.cash -= cost;
  const gain = randInt(8, 16);
  b.marketing = clamp(b.marketing + gain);
  b.reputation = clamp(b.reputation + randInt(1, 4));
  const msg = `${b.name} ran a marketing push (+${gain} marketing).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function bizImprove(input: Character, id: string, spend: Spend): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  const cost = 10000 + b.locations * 5000;
  if (b.cash < cost)
    return fail(input, `Improvements cost $${cost.toLocaleString()} in business cash.`);
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  b.cash -= cost;
  const gain = randInt(6, 14);
  b.quality = clamp(b.quality + gain);
  b.satisfaction = clamp(b.satisfaction + randInt(3, 8));
  const msg = `${b.name} upgraded its product and service (+${gain} quality).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function bizCutCosts(input: Character, id: string, spend: Spend): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const saved = Math.round(b.expenses * 0.12) + 5000;
  b.cash += saved;
  b.quality = clamp(b.quality - randInt(3, 7));
  b.satisfaction = clamp(b.satisfaction - randInt(2, 6));
  const msg = `${b.name} slashed costs (+$${saved.toLocaleString()} cash) — quality took a hit.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function bizSetPrices(
  input: Character,
  id: string,
  dir: "raise" | "lower",
  spend: Spend,
): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  if (dir === "raise") {
    if (b.priceLevel >= 1.3) return fail(input, "Prices are already at premium levels.");
    b.priceLevel = Math.round((b.priceLevel + 0.1) * 10) / 10;
    b.satisfaction = clamp(b.satisfaction - randInt(4, 9));
  } else {
    if (b.priceLevel <= 0.8) return fail(input, "Prices are already rock-bottom.");
    b.priceLevel = Math.round((b.priceLevel - 0.1) * 10) / 10;
    b.satisfaction = clamp(b.satisfaction + randInt(3, 7));
  }
  const msg = `${b.name} ${dir === "raise" ? "raised" : "lowered"} prices (level ${b.priceLevel.toFixed(1)}).`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function bizExpand(input: Character, id: string, spend: Spend): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  const def = bizDef(b.kind);
  const cost = Math.round(def.startupCost * 0.7 * b.locations);
  if (b.cash < cost)
    return fail(input, `A new location needs $${cost.toLocaleString()} of business cash.`);
  if (b.reputation < 45) return fail(input, "Build your brand reputation to 45 before expanding.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  b.cash -= cost;
  b.locations += 1;
  b.quality = clamp(b.quality - 4); // growing pains
  const msg = `${b.name} opened location #${b.locations}!`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function bizSeekInvestor(input: Character, id: string, spend: Spend): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  if (b.investorOwned >= 0.45)
    return fail(input, "You've sold as much equity as you can while keeping control.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const appeal = b.valuation / 100000 + (c.networking ?? 0) / 20 + b.growth / 10;
  if (randInt(0, 10) > appeal) {
    const msg = `Investors passed on ${b.name}. Grow the numbers and try again.`;
    c.log.push({ age: c.age, text: msg, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  const stake = 0.1 + randInt(0, 10) / 100;
  const cheque = Math.round(Math.max(50000, b.valuation * stake * 1.2));
  b.investorOwned = Math.min(0.49, Math.round((b.investorOwned + stake) * 100) / 100);
  b.cash += cheque;
  const msg = `An investor bought ${(stake * 100).toFixed(0)}% of ${b.name} for $${cheque.toLocaleString()}.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function bizLoan(input: Character, id: string): BizResult {
  const c = structuredClone(input);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  if (c.criminalRecord >= 2)
    return fail(input, "With your criminal record, no bank will extend business credit.");
  const amount = Math.round(Math.max(40000, b.valuation * 0.3));
  if (b.loan > b.valuation * 0.5)
    return fail(input, "The business is already leveraged to the hilt.");
  b.loan += amount;
  b.cash += amount;
  const msg = `${b.name} took a $${amount.toLocaleString()} business loan (7% interest).`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function bizSell(input: Character, id: string): BizResult {
  const c = structuredClone(input);
  const hub = ensureBusinessHub(c);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  const gross = Math.max(0, b.valuation + b.cash - b.loan);
  const yourCut = Math.round(gross * (1 - b.investorOwned));
  c.money += yourCut;
  hub.soldFor += yourCut;
  hub.businesses = hub.businesses.filter((x) => x.id !== id);
  c.businessReputation = clamp(c.businessReputation + (yourCut > 500000 ? 15 : 6));
  const msg = `You sold ${b.name} — your share came to $${yourCut.toLocaleString()}.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function bizShutDown(input: Character, id: string): BizResult {
  const c = structuredClone(input);
  const hub = ensureBusinessHub(c);
  const b = findBiz(c, id);
  if (!b) return fail(input, "No such business.");
  const salvage = Math.max(0, Math.round(b.cash * 0.7 - b.loan));
  c.money += salvage;
  hub.failures += 1;
  hub.businesses = hub.businesses.filter((x) => x.id !== id);
  const msg = `You shut down ${b.name}${salvage > 0 ? ` and salvaged $${salvage.toLocaleString()}` : ""}. Hard lesson, cheap tuition.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Dramatic events ----------

interface BizEventDef {
  id: string;
  title: string;
  description: (b: Business) => string;
  weight: (b: Business, c: Character) => number;
  options: (b: Business) => BizEvent["options"];
}

const BIZ_EVENTS: BizEventDef[] = [
  {
    id: "viral",
    title: "Viral Moment",
    description: (b) =>
      `${b.name} is suddenly all over social media — in a good way. Customers are lining up.`,
    weight: (b) => (b.marketing > 50 ? 2 : 1),
    options: (b) => [
      {
        label: "Ride the wave: extend hours, hire temps",
        text: "You captured the moment. Revenue spiked.",
        tone: "good",
        cash: randInt(25000, 60000) * b.locations,
        reputation: randInt(5, 10),
      },
      {
        label: "Keep operations steady",
        text: "Some demand went unserved, but quality never slipped.",
        tone: "neutral",
        reputation: randInt(2, 5),
        satisfaction: randInt(2, 5),
      },
    ],
  },
  {
    id: "bad-reviews",
    title: "Review Bombing",
    description: (b) => `A string of brutal one-star reviews is dragging ${b.name}'s rating down.`,
    weight: (b) => (b.satisfaction < 50 ? 3 : 1),
    options: () => [
      {
        label: "Respond personally to every review and fix the issues",
        text: "Slow, humbling work — and it turned several critics into fans.",
        tone: "good",
        satisfaction: randInt(6, 12),
        quality: randInt(2, 5),
        cash: -8000,
      },
      {
        label: "Pay a firm to bury the reviews",
        text: "The ratings recovered... and a journalist noticed the fake five-stars.",
        tone: "bad",
        reputation: -randInt(5, 12),
        cash: -15000,
        corrupt: true,
      },
      {
        label: "Ignore it",
        text: "The internet never forgets. Sales sagged.",
        tone: "bad",
        reputation: -randInt(3, 7),
        growth: -5,
      },
    ],
  },
  {
    id: "key-quit",
    title: "Star Employee Quits",
    description: (b) =>
      `Your best person at ${b.name} just handed in their notice — a competitor offered more.`,
    weight: (b) => (b.employees > 2 ? 2 : 0),
    options: (b) => [
      {
        label: "Counter-offer with a big raise",
        text: "They stayed — and everyone else now knows raises come from threatening to leave.",
        tone: "neutral",
        cash: -Math.round(bizDef(b.kind).employeeCost * 0.4),
        quality: 2,
      },
      {
        label: "Let them go and promote from within",
        text: "A rocky quarter, then the new lead found their feet.",
        tone: "neutral",
        employees: -1,
        quality: -randInt(3, 8),
        satisfaction: -3,
      },
    ],
  },
  {
    id: "lawsuit",
    title: "Lawsuit Filed",
    description: (b) =>
      `${b.name} is being sued — a customer claims serious damages. The claim is shaky but loud.`,
    weight: () => 1,
    options: () => [
      {
        label: "Settle quietly",
        text: "Expensive, fast, and forgotten by next quarter.",
        tone: "neutral",
        cash: -randInt(25000, 60000),
      },
      {
        label: "Fight it in court",
        text: "You won — after a year of legal fees and headlines.",
        tone: "neutral",
        cash: -randInt(15000, 40000),
        reputation: -randInt(0, 6),
      },
      {
        label: "Intimidate the plaintiff into dropping it",
        text: "The suit vanished. The story of how may not.",
        tone: "bad",
        corrupt: true,
        criminal: true,
        reputation: -randInt(2, 6),
      },
    ],
  },
  {
    id: "competitor",
    title: "Competitor Opens Nearby",
    description: (b) => `A well-funded rival just opened right in ${b.name}'s market.`,
    weight: () => 2,
    options: () => [
      {
        label: "Compete on quality",
        text: "You went upmarket and kept your loyal base.",
        tone: "good",
        quality: randInt(4, 9),
        cash: -12000,
      },
      {
        label: "Start a price war",
        text: "You bled margin, they bled more.",
        tone: "neutral",
        growth: -3,
        satisfaction: randInt(3, 7),
        cash: -18000,
      },
      {
        label: "Collude with them to fix prices",
        text: "Fat margins for everyone — and a paper trail regulators would love.",
        tone: "bad",
        cash: randInt(30000, 70000),
        corrupt: true,
        criminal: true,
      },
    ],
  },
  {
    id: "cashflow",
    title: "Cash Flow Crisis",
    description: (b) => `${b.name}'s account is running dry — payroll is due in three weeks.`,
    weight: (b) => (b.cash < 20000 ? 4 : 0),
    options: (b) => [
      {
        label: "Inject personal savings",
        text: "Your money kept the lights on.",
        tone: "neutral",
        personalMoney: -Math.min(40000, Math.max(10000, b.employees * 8000)),
        cash: Math.min(40000, Math.max(10000, b.employees * 8000)),
      },
      {
        label: "Emergency layoffs",
        text: "Painful cuts. The survivors are doing two jobs each.",
        tone: "bad",
        employees: -Math.max(1, Math.floor(b.employees / 3)),
        quality: -randInt(5, 10),
        satisfaction: -randInt(3, 8),
      },
      {
        label: "Cook the books to secure a bridge loan",
        text: "The loan cleared. The falsified statements are now a permanent liability.",
        tone: "bad",
        cash: 60000,
        corrupt: true,
        criminal: true,
      },
    ],
  },
  {
    id: "acquisition",
    title: "Acquisition Offer",
    description: (b) => `A larger company wants to buy ${b.name} outright — at a premium.`,
    weight: (b) => (b.valuation > 400000 ? 2 : 0),
    options: (b) => {
      const offer = Math.round(
        (b.valuation + b.cash - b.loan) * (1.2 + randInt(0, 30) / 100) * (1 - b.investorOwned),
      );
      return [
        {
          label: `Accept the buyout (~$${offer.toLocaleString()} to you)`,
          text: "Papers signed. You're out — richer and lighter.",
          tone: "good",
          personalMoney: offer,
          shutdown: true,
        },
        {
          label: "Decline and keep building",
          text: "Word of the rejected offer made the brand look strong.",
          tone: "neutral",
          reputation: randInt(3, 7),
        },
      ];
    },
  },
  {
    id: "extortion",
    title: "Protection Racket",
    description: (b) =>
      `Two men visited ${b.name}. "Nice place. Shame if something happened to it." They want monthly payments.`,
    weight: (b, c) => (c.criminalRecord > 0 ? 3 : 1),
    options: () => [
      {
        label: "Report them to the police",
        text: "Arrests followed. A brick came through the window first, but it ended there.",
        tone: "good",
        cash: -6000,
        reputation: randInt(2, 5),
      },
      {
        label: "Pay them off quietly",
        text: "They'll be back. They're always back.",
        tone: "bad",
        cash: -randInt(20000, 40000),
        corrupt: true,
      },
      {
        label: "Hire private security",
        text: "Expensive — and effective. They moved on to softer targets.",
        tone: "neutral",
        cash: -15000,
      },
    ],
  },
  {
    id: "expansion-op",
    title: "Prime Location Available",
    description: (b) =>
      `The perfect spot for ${b.name}'s next location just hit the market at a below-market rate.`,
    weight: (b) => (b.reputation > 55 && b.cash > 60000 ? 2 : 0),
    options: (b) => [
      {
        label: "Grab it",
        text: "A bargain expansion — the new spot hit the ground running.",
        tone: "good",
        cash: -Math.round(bizDef(b.kind).startupCost * 0.45),
        employees: 2,
      },
      { label: "Pass", text: "Discipline over opportunity. The cash stays put.", tone: "neutral" },
    ],
  },
  {
    id: "unethical-investor",
    title: "Investor Wants Creative Accounting",
    description: (b) =>
      `${b.name}'s newest investor is pushing you to reclassify expenses to inflate the numbers before the next raise.`,
    weight: (b) => (b.investorOwned > 0 ? 2 : 0),
    options: () => [
      {
        label: "Refuse flatly",
        text: "The investor backed down. Your books stay boring and honest.",
        tone: "good",
        reputation: randInt(1, 4),
      },
      {
        label: "Go along with it",
        text: "The metrics glowed. The audit exposure is now yours forever.",
        tone: "bad",
        cash: randInt(20000, 50000),
        corrupt: true,
        criminal: true,
      },
    ],
  },
];

export function resolveBizEvent(input: Character, bizId: string, optionIndex: number): BizResult {
  const c = structuredClone(input);
  const hub = ensureBusinessHub(c);
  const b = findBiz(c, bizId);
  const ev = b?.pendingEvent;
  const opt = ev?.options[optionIndex];
  if (!b || !ev || !opt) return fail(input, "No business event to resolve.");
  if (opt.cash) b.cash += opt.cash;
  if (opt.personalMoney) {
    if (opt.personalMoney < 0 && c.money < -opt.personalMoney)
      return fail(input, "You don't have enough personal money for that option.");
    c.money += opt.personalMoney;
  }
  if (opt.reputation) b.reputation = clamp(b.reputation + opt.reputation);
  if (opt.satisfaction) b.satisfaction = clamp(b.satisfaction + opt.satisfaction);
  if (opt.quality) b.quality = clamp(b.quality + opt.quality);
  if (opt.marketing) b.marketing = clamp(b.marketing + opt.marketing);
  if (opt.growth) b.growth += opt.growth;
  if (opt.employees) b.employees = Math.max(0, b.employees + opt.employees);
  if (opt.corrupt && c.politics)
    c.politics.scandalRisk = clamp(c.politics.scandalRisk + randInt(6, 12), 0, 100);
  if (opt.criminal && Math.random() < 0.3) {
    c.criminalRecord += 1;
    c.log.push({
      age: c.age,
      text: "The scheme surfaced. Charges were laid against you.",
      tone: "bad",
    });
  }
  b.pendingEvent = undefined;
  if (opt.shutdown) {
    hub.soldFor += Math.max(0, opt.personalMoney ?? 0);
    hub.businesses = hub.businesses.filter((x) => x.id !== b.id);
  }
  c.log.push({ age: c.age, text: `${ev.title} — ${opt.text}`, tone: opt.tone });
  return { character: c, message: opt.text, tone: opt.tone, ok: true };
}

// ---------- Yearly simulation ----------

export function advanceBusinesses(c: Character, log: LogEntry[]) {
  const hub = c.businessHub;
  if (!hub?.businesses.length) return;
  for (const b of [...hub.businesses]) {
    const def = bizDef(b.kind);
    b.yearsRunning += 1;

    // Demand blends brand, product and word of mouth; price cuts both ways.
    const demand =
      b.reputation * 0.3 + b.quality * 0.35 + b.marketing * 0.2 + b.satisfaction * 0.15;
    const priceElasticity = 1 - (b.priceLevel - 1) * 1.4; // premium prices shave volume
    const staffing = Math.min(1, b.employees / (def.employeesPerLocation * b.locations));
    const volatility = 1 + randInt(-def.risk, def.risk) / 300;
    const fit = founderFit(c, def);

    const revenue = Math.max(
      0,
      Math.round(
        def.baseRevenue *
          b.locations *
          (demand / 60) *
          priceElasticity *
          b.priceLevel *
          (0.6 + staffing * 0.4) *
          (0.85 + fit * 0.3) *
          volatility,
      ),
    );
    const expenses = Math.round(
      b.employees * def.employeeCost +
        b.locations * def.locationCost +
        b.marketing * 300 +
        b.loan * 0.07,
    );
    const profit = revenue - expenses;
    const prevRevenue = b.revenue;
    b.revenue = revenue;
    b.expenses = expenses;
    b.profit = profit;
    b.cash += profit;
    hub.lifetimeProfit += Math.max(0, profit);
    b.growth = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;

    // Slow drifts.
    b.marketing = clamp(b.marketing - 4);
    b.satisfaction = clamp(b.satisfaction + (b.quality > 60 ? 2 : b.quality < 40 ? -3 : 0));
    b.reputation = clamp(b.reputation + (b.satisfaction > 65 ? 2 : b.satisfaction < 40 ? -3 : 0));
    b.valuation = Math.max(
      0,
      Math.round(
        Math.max(profit, 0) * def.multiple + b.cash * 0.5 + b.locations * def.startupCost * 0.3,
      ),
    );

    if (profit > 0) c.businessReputation = clamp(c.businessReputation + 1);

    // Insolvency: two paths — forced loan, then collapse.
    if (b.cash < -50000) {
      hub.failures += 1;
      hub.businesses = hub.businesses.filter((x) => x.id !== b.id);
      log.push({
        age: c.age,
        text: `${b.name} went bankrupt. Creditors took everything.`,
        tone: "bad",
      });
      c.businessReputation = clamp(c.businessReputation - 8);
      continue;
    }

    // Dramatic events (~1 in 3 years per business, weighted by circumstances).
    if (!b.pendingEvent && Math.random() < 0.35) {
      const pool = BIZ_EVENTS.filter((e) => e.weight(b, c) > 0);
      const weighted: BizEventDef[] = [];
      for (const e of pool) for (let i = 0; i < e.weight(b, c); i++) weighted.push(e);
      const pick = randItem(weighted);
      b.pendingEvent = {
        id: `${pick.id}-${uid()}`,
        title: pick.title,
        description: pick.description(b),
        options: pick.options(b),
      };
      log.push({
        age: c.age,
        text: `${b.name}: ${pick.title} — decision needed in the Business hub.`,
        tone: "neutral",
      });
    }
  }
}
