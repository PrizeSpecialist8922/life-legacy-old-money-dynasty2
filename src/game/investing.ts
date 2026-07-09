import type {
  AssetClass,
  Character,
  Holding,
  InvestingState,
  LogEntry,
  LogTone,
  Property,
  PropertyKind,
} from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Investing & Real Estate (Build 10). Nine asset classes with a persistent
// market-mood regime, preset strategies, and basic landlord mechanics.
// ---------------------------------------------------------------------------

export interface InvestResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): InvestResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export function ensureInvesting(c: Character): InvestingState {
  if (!c.investing)
    c.investing = {
      holdings: [],
      properties: [],
      realizedGains: 0,
      incomeLifetime: 0,
      lastYearReturnPct: 0,
      marketMood: 0,
    };
  return c.investing;
}

export interface AssetDef {
  id: AssetClass;
  label: string;
  expReturn: number; // % mean annual
  vol: number; // % annual volatility
  incomeYield: number; // % paid out in cash yearly
  beta: number; // sensitivity to market mood
  risk: "Low" | "Medium" | "High" | "Very High";
}

export const ASSETS: AssetDef[] = [
  {
    id: "stocks",
    label: "Stocks",
    expReturn: 8,
    vol: 16,
    incomeYield: 1.5,
    beta: 1.0,
    risk: "Medium",
  },
  {
    id: "etf",
    label: "Index ETFs",
    expReturn: 7.5,
    vol: 13,
    incomeYield: 1.8,
    beta: 1.0,
    risk: "Medium",
  },
  { id: "bonds", label: "Bonds", expReturn: 3.5, vol: 5, incomeYield: 3.2, beta: 0.2, risk: "Low" },
  {
    id: "crypto",
    label: "Crypto",
    expReturn: 14,
    vol: 60,
    incomeYield: 0,
    beta: 1.8,
    risk: "Very High",
  },
  {
    id: "reit",
    label: "Real Estate Funds",
    expReturn: 6.5,
    vol: 14,
    incomeYield: 4,
    beta: 0.8,
    risk: "Medium",
  },
  {
    id: "startups",
    label: "Private Startups",
    expReturn: 15,
    vol: 50,
    incomeYield: 0,
    beta: 1.4,
    risk: "Very High",
  },
  {
    id: "angel",
    label: "Angel Investments",
    expReturn: 18,
    vol: 70,
    incomeYield: 0,
    beta: 1.3,
    risk: "Very High",
  },
  {
    id: "commodities",
    label: "Commodities",
    expReturn: 4,
    vol: 20,
    incomeYield: 0,
    beta: 0.4,
    risk: "High",
  },
  { id: "gold", label: "Gold", expReturn: 3, vol: 12, incomeYield: 0, beta: -0.3, risk: "Low" },
];

export function assetDef(id: AssetClass): AssetDef {
  return ASSETS.find((a) => a.id === id)!;
}

export function portfolioValue(inv: InvestingState): number {
  return inv.holdings.reduce((s, h) => s + h.value, 0);
}

export function realEstateEquity(inv: InvestingState): number {
  return inv.properties.reduce((s, p) => s + p.value - p.mortgage, 0);
}

// ---------- Buy / sell ----------

export function invest(input: Character, asset: AssetClass, amount: number): InvestResult {
  const c = structuredClone(input);
  const inv = ensureInvesting(c);
  if (c.age < 18) return fail(input, "Brokerages require you to be 18.");
  if (amount <= 0 || c.money < amount) return fail(input, "You don't have that much cash.");
  const def = assetDef(asset);
  if ((asset === "angel" || asset === "startups") && amount < 10000)
    return fail(input, `${def.label} deals start at $10,000 a cheque.`);
  c.money -= amount;
  let h = inv.holdings.find((x) => x.asset === asset);
  if (!h) {
    h = { asset, invested: 0, value: 0 };
    inv.holdings.push(h);
  }
  h.invested += amount;
  h.value += amount;
  const msg = `You invested $${amount.toLocaleString()} in ${def.label}.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function withdraw(input: Character, asset: AssetClass, amount: number): InvestResult {
  const c = structuredClone(input);
  const inv = ensureInvesting(c);
  const h = inv.holdings.find((x) => x.asset === asset);
  if (!h || h.value <= 0) return fail(input, "Nothing to sell in that asset.");
  const amt = Math.min(amount, h.value);
  const costPortion = h.invested * (amt / h.value);
  inv.realizedGains += amt - costPortion;
  h.invested -= costPortion;
  h.value -= amt;
  c.money += Math.round(amt);
  if (h.value < 1) inv.holdings = inv.holdings.filter((x) => x !== h);
  const msg = `You sold $${Math.round(amt).toLocaleString()} of ${assetDef(asset).label}.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Strategy presets ----------

export interface StrategyDef {
  id: string;
  label: string;
  mix: Partial<Record<AssetClass, number>>; // fractions summing to 1
}

export const STRATEGIES: StrategyDef[] = [
  {
    id: "conservative",
    label: "Conservative",
    mix: { bonds: 0.55, etf: 0.25, gold: 0.15, stocks: 0.05 },
  },
  {
    id: "balanced",
    label: "Balanced",
    mix: { etf: 0.4, stocks: 0.2, bonds: 0.25, reit: 0.1, gold: 0.05 },
  },
  {
    id: "aggressive",
    label: "Aggressive",
    mix: { stocks: 0.4, etf: 0.25, startups: 0.15, crypto: 0.15, commodities: 0.05 },
  },
  { id: "crypto", label: "Crypto-Heavy", mix: { crypto: 0.6, stocks: 0.2, etf: 0.15, gold: 0.05 } },
  {
    id: "realestate",
    label: "Real Estate-Heavy",
    mix: { reit: 0.6, etf: 0.2, bonds: 0.15, gold: 0.05 },
  },
  {
    id: "angelinvestor",
    label: "Angel Investor",
    mix: { angel: 0.4, startups: 0.2, etf: 0.25, bonds: 0.15 },
  },
];

export function applyStrategy(input: Character, strategyId: string, amount: number): InvestResult {
  const c = structuredClone(input);
  const inv = ensureInvesting(c);
  const strat = STRATEGIES.find((s) => s.id === strategyId);
  if (!strat) return fail(input, "Unknown strategy.");
  if (c.age < 18) return fail(input, "Brokerages require you to be 18.");
  if (amount <= 0 || c.money < amount) return fail(input, "You don't have that much cash.");
  c.money -= amount;
  for (const [asset, frac] of Object.entries(strat.mix) as [AssetClass, number][]) {
    const slice = Math.round(amount * frac);
    let h = inv.holdings.find((x) => x.asset === asset);
    if (!h) {
      h = { asset, invested: 0, value: 0 };
      inv.holdings.push(h);
    }
    h.invested += slice;
    h.value += slice;
  }
  const msg = `You deployed $${amount.toLocaleString()} into a ${strat.label} portfolio.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Real estate ----------

export interface PropertyDef {
  kind: PropertyKind;
  label: string;
  price: [number, number];
  rentYield: number; // gross annual rent as % of value
  maintPct: number; // annual maintenance as % of value
}

export const PROPERTY_DEFS: PropertyDef[] = [
  { kind: "condo", label: "Condo", price: [250000, 450000], rentYield: 0.055, maintPct: 0.012 },
  { kind: "house", label: "House", price: [400000, 750000], rentYield: 0.05, maintPct: 0.014 },
  {
    kind: "apartment",
    label: "Apartment Building",
    price: [1200000, 2500000],
    rentYield: 0.07,
    maintPct: 0.02,
  },
  {
    kind: "commercial",
    label: "Commercial Property",
    price: [800000, 1800000],
    rentYield: 0.065,
    maintPct: 0.016,
  },
];

const STREETS = [
  "Maple",
  "King",
  "Harbour",
  "Cedar",
  "Wellington",
  "Sunset",
  "Bay",
  "Elm",
  "Victoria",
  "Lakeshore",
];

export function buyProperty(input: Character, kind: PropertyKind): InvestResult {
  const c = structuredClone(input);
  const inv = ensureInvesting(c);
  if (c.age < 18) return fail(input, "You must be 18 to buy property.");
  if (inv.properties.length >= 6)
    return fail(input, "Six properties is enough of an empire for now.");
  const def = PROPERTY_DEFS.find((d) => d.kind === kind)!;
  const price = randInt(def.price[0], def.price[1]);
  const down = Math.round(price * 0.2);
  if (c.money < down)
    return fail(
      input,
      `You need a $${down.toLocaleString()} down payment (20% of $${price.toLocaleString()}).`,
    );
  if (c.criminalRecord >= 3)
    return fail(
      input,
      "No lender will approve a mortgage with your record. Cash buyers only — and you're not there.",
    );
  c.money -= down;
  const p: Property = {
    id: uid(),
    kind,
    name: `${randInt(2, 98) * 10} ${randItem(STREETS)} ${kind === "commercial" ? "Plaza" : kind === "apartment" ? "Ave" : "St"}`,
    value: price,
    mortgage: price - down,
    rate: 0.05,
    rented: false,
    rent: Math.round(price * def.rentYield),
    maintenance: Math.round(price * def.maintPct),
    vacantYear: false,
    renovations: 0,
    yearsOwned: 0,
  };
  inv.properties.push(p);
  const msg = `You bought ${p.name} (${def.label}) for $${price.toLocaleString()} with $${down.toLocaleString()} down.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

function findProp(c: Character, id: string): Property | undefined {
  return c.investing?.properties.find((p) => p.id === id);
}

export function setRented(input: Character, id: string, rented: boolean): InvestResult {
  const c = structuredClone(input);
  const p = findProp(c, id);
  if (!p) return fail(input, "No such property.");
  p.rented = rented;
  const msg = rented
    ? `You listed ${p.name} for rent ($${p.rent.toLocaleString()}/yr).`
    : `You took ${p.name} off the rental market.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function renovate(input: Character, id: string): InvestResult {
  const c = structuredClone(input);
  const p = findProp(c, id);
  if (!p) return fail(input, "No such property.");
  const cost = Math.round(p.value * 0.05);
  if (c.money < cost) return fail(input, `Renovations would cost $${cost.toLocaleString()}.`);
  c.money -= cost;
  p.renovations += 1;
  const uplift = Math.round(cost * (1.3 + randInt(0, 40) / 100));
  p.value += uplift;
  p.rent = Math.round(p.rent * 1.08);
  const msg = `You renovated ${p.name}: +$${uplift.toLocaleString()} value, +8% rent.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function sellProperty(input: Character, id: string): InvestResult {
  const c = structuredClone(input);
  const inv = ensureInvesting(c);
  const p = findProp(c, id);
  if (!p) return fail(input, "No such property.");
  const closing = Math.round(p.value * 0.05);
  const net = p.value - p.mortgage - closing;
  c.money += net;
  inv.realizedGains += net;
  inv.properties = inv.properties.filter((x) => x.id !== id);
  const msg = `You sold ${p.name} for $${p.value.toLocaleString()} — $${net.toLocaleString()} after the mortgage and closing costs.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function refinance(input: Character, id: string): InvestResult {
  const c = structuredClone(input);
  const p = findProp(c, id);
  if (!p) return fail(input, "No such property.");
  const maxLoan = Math.round(p.value * 0.75);
  const cashOut = maxLoan - p.mortgage;
  if (cashOut < 10000) return fail(input, "Not enough equity to make a refinance worthwhile.");
  if (c.criminalRecord >= 3) return fail(input, "The bank declined your refinance application.");
  p.mortgage = maxLoan;
  c.money += cashOut;
  const msg = `You refinanced ${p.name} and pulled out $${cashOut.toLocaleString()} of equity.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Yearly simulation ----------

export function advanceInvesting(c: Character, log: LogEntry[]) {
  const inv = c.investing;
  if (!inv) return;

  // Market regime: mean-reverting random walk with occasional shocks.
  inv.marketMood = clamp(inv.marketMood * 0.6 + randInt(-10, 10) / 10, -2, 2);
  const shock = Math.random();
  let headline: string | null = null;
  if (shock < 0.06) {
    inv.marketMood = -2;
    headline = "MARKET CRASH: indices plunged across the board.";
  } else if (shock < 0.12) {
    inv.marketMood = Math.min(2, inv.marketMood + 1.5);
    headline = "Bull market: stocks boomed this year.";
  } else if (shock < 0.17) {
    headline = "Interest rates rose sharply — bonds wobbled, borrowing got pricier.";
  }
  const ratesUp = headline?.includes("Interest rates") ?? false;
  if (headline) log.push({ age: c.age, text: headline, tone: inv.marketMood > 0 ? "good" : "bad" });

  const startValue = portfolioValue(inv);
  let income = 0;

  for (const h of [...inv.holdings]) {
    const def = assetDef(h.asset);
    let ret = def.expReturn + def.beta * inv.marketMood * 8 + randInt(-def.vol, def.vol) / 1.6;
    if (ratesUp && h.asset === "bonds") ret -= 6;
    if (ratesUp && h.asset === "reit") ret -= 4;
    // Crypto winters happen even in decent markets.
    if (h.asset === "crypto" && Math.random() < 0.12) {
      ret = -randInt(45, 70);
      log.push({ age: c.age, text: "Crypto crashed hard this year.", tone: "bad" });
    }
    // Venture is lumpy: mostly nothing, occasional exits and zeroes.
    if (h.asset === "startups" || h.asset === "angel") {
      const roll = Math.random();
      if (roll < 0.08) {
        ret = randInt(150, 400);
        log.push({
          age: c.age,
          text: `One of your ${def.label.toLowerCase()} had an exit — a huge payoff!`,
          tone: "milestone",
        });
      } else if (roll < 0.3) {
        ret = -randInt(30, 80);
        if (roll < 0.15)
          log.push({
            age: c.age,
            text: `A ${def.label.toLowerCase().replace(/s$/, "")} in your portfolio went under.`,
            tone: "bad",
          });
      } else {
        ret = randInt(-5, 10);
      }
    }
    h.value = Math.max(0, Math.round(h.value * (1 + ret / 100)));
    const payout = Math.round(h.value * (def.incomeYield / 100));
    if (payout > 0) {
      c.money += payout;
      income += payout;
    }
    if (h.value < 1 && h.invested > 0) inv.holdings = inv.holdings.filter((x) => x !== h);
  }

  // Real estate.
  for (const p of inv.properties) {
    p.yearsOwned += 1;
    p.vacantYear = p.rented && Math.random() < 0.1;
    const appreciation = 0.02 + inv.marketMood * 0.01 + randInt(-2, 4) / 100 - (ratesUp ? 0.02 : 0);
    p.value = Math.max(50000, Math.round(p.value * (1 + appreciation)));
    const interest = Math.round(p.mortgage * p.rate);
    const principal = p.mortgage > 0 ? Math.min(p.mortgage, Math.round(p.mortgage * 0.03)) : 0;
    const rentIn = p.rented && !p.vacantYear ? p.rent : 0;
    const net = rentIn - p.maintenance - interest - principal;
    c.money += net;
    p.mortgage -= principal;
    if (rentIn > 0) income += rentIn;
    if (p.vacantYear)
      log.push({
        age: c.age,
        text: `${p.name} sat vacant this year — no rent came in.`,
        tone: "bad",
      });
  }

  inv.incomeLifetime += income;
  const endValue = portfolioValue(inv);
  inv.lastYearReturnPct =
    startValue > 0 ? Math.round(((endValue - startValue) / startValue) * 100) : 0;
}
