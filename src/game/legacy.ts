import { createCharacter } from "./engine";
import { curseAssessment, ensurePedigree } from "./oldmoney";
import { ensureCrime } from "./crime";
import { ensurePolitics } from "./politics";
import { settleFamilyTree } from "./familytree";
import type { AncestorRecord, Character, Dynasty, LogTone, Relationship, WillState } from "./types";
import { clamp, randInt, randItem } from "./util";

// ---------------------------------------------------------------------------
// Legacy & Generations (Build 15). The estate settles with taxes and drama —
// empires can crumble in the handoff — and the dynasty carries reputation,
// consequences, and a cumulative legacy score across lives.
// ---------------------------------------------------------------------------

export interface LegacyResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): LegacyResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export function ensureDynasty(c: Character): Dynasty {
  if (!c.dynasty) {
    const familyName = c.name.split(" ").slice(-1)[0] ?? "Legacy";
    c.dynasty = {
      familyName,
      generation: 1,
      reputation: 50,
      legacyScore: 0,
      wealthCreated: 0,
      officesWon: 0,
      championships: 0,
      awards: 0,
      billsPassed: 0,
      crimesGottenAwayWith: 0,
      ancestors: [],
    };
  }
  return c.dynasty;
}

export function ensureWill(c: Character): WillState {
  if (!c.will) c.will = { charityPct: 0, written: false };
  return c.will;
}

export function livingChildren(c: Character): Relationship[] {
  return c.relationships.filter((r) => r.type === "child" && r.alive);
}

// ---------- Writing the will ----------

export function writeWill(
  input: Character,
  heirId: string | undefined,
  charityPct: number,
): LegacyResult {
  const c = structuredClone(input);
  const w = ensureWill(c);
  if (c.age < 18) return fail(input, "Estate law starts at 18.");
  const kids = livingChildren(c);
  if (heirId && !kids.some((k) => k.id === heirId))
    return fail(input, "That heir isn't one of your living children.");
  w.heirId = heirId;
  w.charityPct = clamp(charityPct, 0, 50);
  w.written = true;
  const heirName = kids.find((k) => k.id === heirId)?.name;
  const msg = heirName
    ? `Will updated: ${heirName} inherits the estate${w.charityPct ? `, ${w.charityPct}% to charity` : ""}. The lawyers have their copies.`
    : `Will updated${w.charityPct ? `: ${w.charityPct}% to charity` : ""} — no heir named yet.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

/** Words for a future you won't see — sealed until the heir's chosen age. */
export function writeLetter(
  input: Character,
  text: string,
  openAtAge: number,
  attachedMoney: number,
): LegacyResult {
  const c = structuredClone(input);
  const w = ensureWill(c);
  if (!text.trim())
    return fail(input, "The page is blank. Say something — you won't get to explain it later.");
  const money = Math.max(0, Math.min(attachedMoney, c.money));
  c.money -= money;
  w.letter = {
    text: text.trim().slice(0, 600),
    openAtAge: clamp(openAtAge, 5, 80),
    attachedMoney: money,
    delivered: false,
  };
  const msg = `The letter is sealed${money ? ` with $${money.toLocaleString()} inside` : ""} — to be opened at ${w.letter.openAtAge}. You read it twice before closing the envelope. It will have to do.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Legacy scoring ----------

/** One life's contribution to the dynasty score. */
export function lifeLegacyScore(c: Character): number {
  const nw =
    c.money +
    (c.investing
      ? c.investing.holdings.reduce((s, h) => s + h.value, 0) +
        c.investing.properties.reduce((s, p) => s + p.value - p.mortgage, 0)
      : 0);
  let score = 0;
  score += Math.min(60, nw / 250000); // wealth
  score +=
    (c.politics?.highestLevelWon ?? -1) >= 0 ? ((c.politics?.highestLevelWon ?? 0) + 1) * 8 : 0;
  score += (c.politics?.billsPassed ?? 0) * 2;
  score +=
    (c.athlete?.majors ?? 0) * 10 + (c.athlete?.mvps ?? 0) * 6 + (c.athlete?.hallOfFame ? 20 : 0);
  score += (c.entertainment?.awards ?? 0) * 8;
  score += Math.min(20, (c.entertainment?.lifetimeEarnings ?? 0) / 500000);
  score += Math.min(15, (c.businessHub?.soldFor ?? 0) / 400000);
  score += Math.min(15, c.fame / 5);
  score +=
    (c.crime?.crimesCommitted ?? 0) > 0
      ? Math.min(10, (c.crime!.crimesCommitted - c.crime!.timesCaught) / 3)
      : 0;
  score -= c.criminalRecord * 5;
  return Math.max(0, Math.round(score));
}

function lifeHeadline(c: Character): string {
  if ((c.politics?.highestLevelWon ?? -1) >= 6)
    return `Led the nation as ${c.politics!.electionHistory.find((e) => e.result === "won")?.office ?? "a head of state"}`;
  if (c.athlete?.hallOfFame) return `Hall of Fame ${c.athlete.sport}`;
  if ((c.entertainment?.awards ?? 0) >= 2) return "Award-winning entertainer";
  if ((c.businessHub?.soldFor ?? 0) > 2000000) return "Built and sold a business empire";
  if ((c.crime?.rank ?? "") === "boss") return "Ran a criminal empire";
  if (c.crime?.informant) return "Turned state's witness — the family never forgot";
  if ((c.politics?.highestLevelWon ?? -1) >= 0) return "A life in public service";
  if (c.money > 2000000) return "Died wealthy and comfortable";
  return "Lived a full life";
}

// ---------- The estate & the heir ----------

export interface EstateReport {
  grossEstate: number;
  tax: number;
  charity: number;
  netToHeir: number;
  drama: string[];
  businessesKept: number;
  businessesLost: number;
  propertiesKept: number;
}

/** Progressive estate tax: first $1M free, 25% to $5M, 40% above. */
function estateTax(gross: number): number {
  let tax = 0;
  if (gross > 1000000) tax += Math.min(gross - 1000000, 4000000) * 0.25;
  if (gross > 5000000) tax += (gross - 5000000) * 0.4;
  return Math.round(tax);
}

/**
 * Settle the dead character's affairs and build the heir. The estate can
 * crumble: no will means executor fire-sales, businesses face succession
 * crises, syndicates collect debts, and the taxman always eats first.
 */
export function createHeir(
  dead: Character,
  heirId: string,
): { heir: Character; report: EstateReport } {
  const kids = livingChildren(dead);
  const chosen = kids.find((k) => k.id === heirId) ?? kids[0];
  const dynasty = structuredClone(ensureDynasty(structuredClone(dead)));
  const will = dead.will ?? { charityPct: 0, written: false, heirId: undefined };
  const drama: string[] = [];

  // --- Tally the dead life into the dynasty ---
  const earned = lifeLegacyScore(dead);
  dynasty.legacyScore += earned;
  dynasty.generation += 1;
  dynasty.wealthCreated += Math.max(0, dead.money);
  dynasty.officesWon +=
    dead.politics?.electionHistory.filter((e) => e.result === "won" && e.stage === "general")
      .length ?? 0;
  dynasty.championships += (dead.athlete?.majors ?? 0) + (dead.athlete?.beltDefenses ?? 0);
  dynasty.awards += dead.entertainment?.awards ?? 0;
  dynasty.billsPassed += dead.politics?.billsPassed ?? 0;
  dynasty.crimesGottenAwayWith += Math.max(
    0,
    (dead.crime?.crimesCommitted ?? 0) - (dead.crime?.timesCaught ?? 0),
  );
  const ancestor: AncestorRecord = {
    name: dead.name,
    generation: dynasty.generation - 1,
    diedAge: dead.age,
    headline: lifeHeadline(dead),
    legacyEarned: earned,
  };
  dynasty.ancestors.push(ancestor);
  dynasty.reputation = clamp(
    dynasty.reputation +
      (earned > 60 ? 8 : earned > 25 ? 3 : -2) -
      dead.criminalRecord * 4 +
      (will.charityPct >= 20 ? 5 : 0),
  );
  // Pedigree: only quiet, intact generations earn it. Noise erodes it.
  ensurePedigree(dynasty);
  const quietGain =
    6 - Math.min(4, Math.floor(dead.fame / 25)) - dead.criminalRecord * 2 + (dynasty.seat ? 2 : 0);
  dynasty.pedigree = clamp((dynasty.pedigree ?? 0) + Math.max(-3, quietGain));
  if (dead.crime?.informant) dynasty.markedBySyndicate = "the families";
  if (dead.society?.member && dead.society.standing >= 70)
    dynasty.legacySociety = dead.society.member;

  // --- Liquid estate: cash + investments settle to cash ---
  let grossEstate = Math.max(0, dead.money);
  if (dead.investing) {
    grossEstate += dead.investing.holdings.reduce((s, h) => s + h.value, 0);
  }
  // Build 11B: jets and yachts go to auction during probate; the estate keeps
  // most of it. Collections stay on the dynasty — art doesn't read wills.
  const fleet = dead.lifestyle?.transport ?? [];
  if (fleet.length) {
    const fleetValue = Math.round(fleet.reduce((s, t) => s + t.value, 0) * 0.75);
    grossEstate += fleetValue;
    drama.push(
      `The ${fleet.map((t) => t.name.toLowerCase()).join(" and ")} went to auction — $${fleetValue.toLocaleString()} back into the estate.`,
    );
  }
  if (dead.lifestyle?.staff.length) {
    drama.push(
      "The household staff were let go with full severance and letters written in the old style. The butler locked up last.",
    );
  }
  // The dynasty timeline records the passing.
  dynasty.archives = dynasty.archives ?? [];
  dynasty.archives.push({
    id: `death:${dead.name}:${dynasty.generation - 1}`,
    generation: dynasty.generation - 1,
    age: dead.age,
    person: dead.name,
    kind: "death",
    text: `${dead.name} died at ${dead.age}. ${lifeHeadline(dead)}`,
  });
  // Unlaundered money doesn't survive probate.
  if ((dead.crime?.dirtyMoney ?? 0) > 0) {
    drama.push(
      `$${dead.crime!.dirtyMoney.toLocaleString()} of unexplained cash vanished into lawyers' pockets during probate.`,
    );
  }
  const tax = estateTax(grossEstate);
  const charity = Math.round((grossEstate - tax) * (will.charityPct / 100));
  let netCash = grossEstate - tax - charity;
  if (!will.written) {
    const legalBurn = Math.round(netCash * 0.15);
    netCash -= legalBurn;
    drama.push(
      `No will: cousins appeared from everywhere. Probate lawyers burned $${legalBurn.toLocaleString()} sorting it out.`,
    );
  }
  if (charity > 0)
    drama.push(
      `$${charity.toLocaleString()} went to charity — the family name shines a little brighter.`,
    );

  // --- Build the heir ---
  const heirAge = Math.max(0, Math.min(chosen?.age ?? 18, 60));
  const blend = (p: number) => clamp(Math.round(p * 0.5 + 50 * 0.2 + randInt(-15, 25)), 10, 100);
  // A genuinely fresh life (correct defaults for every subsystem), then layer
  // the inheritance on top.
  const heir: Character = createCharacter({
    name: chosen
      ? `${chosen.name.split(" ")[0]} ${dynasty.familyName}`
      : `Heir ${dynasty.familyName}`,
    gender: Math.random() > 0.5 ? "male" : "female",
    country: dead.country,
  });
  heir.age = heirAge;
  heir.stats.smarts = blend(dead.stats.smarts);
  heir.stats.looks = blend(dead.stats.looks);
  heir.stats.health = clamp(85 + randInt(-10, 10));
  heir.stats.happiness = clamp(55 + randInt(-10, 15));
  // The upbringing record is the real inheritance.
  const rec = dead.children?.find((k) => k.relId === (chosen?.id ?? ""));
  if (rec) {
    heir.stats.smarts = clamp(Math.round(heir.stats.smarts * 0.5 + rec.academics * 0.5 + 5));
    if (rec.cutOff)
      drama.push(
        "The chosen heir had been cut off — the reconciliation at the deathbed was brief, and binding.",
      );
    if (rec.resentment >= 70) {
      const burn = Math.round(netCash * 0.1);
      netCash -= burn;
      drama.push(
        `THE READING WENT BADLY: years of resentment surfaced as litigation over terms. $${burn.toLocaleString()} burned in a fight nobody needed.`,
      );
    } else if (rec.affection >= 70) {
      dynasty.reputation = clamp(dynasty.reputation + 5);
      drama.push(
        "The reading of the will was quiet and complete. The heir asked for the letter opener from the study — nothing else. Some inheritances are grief, held properly.",
      );
    }
    if (rec.taughtSkills.length) {
      const names: Record<string, string> = {
        tennis: "your tennis technique",
        law: "your courtroom instincts",
        deal: "how a deal closes",
        stage: "how to hold a room",
        vote: "how votes are counted",
        books: "how the books get cooked",
        grit: "how to lose and get up",
        errand: "discretion",
        "conspiracy-with-parent": "your secrets",
        negotiation: "a negotiator's table manner",
      };
      drama.push(
        `What was actually inherited: ${rec.taughtSkills.map((t) => names[t] ?? t).join(", ")}. Money is the smallest part of an estate.`,
      );
    }
  }
  heir.money = Math.max(0, netCash);
  if (heirAge >= 22) heir.education = "graduated";
  heir.log = [];
  heir.relationships = dead.relationships
    .filter((r) => r.alive && r.type !== "partner" && r.id !== chosen?.id)
    .map((r) => ({
      ...r,
      type: r.type === "child" ? ("sibling" as Relationship["type"]) : r.type,
      relationship: clamp(r.relationship - 10),
    }));
  heir.networking = clamp(Math.round((dead.networking ?? 0) * 0.3));
  heir.businessReputation = clamp(Math.round(dead.businessReputation * 0.3));
  heir.fame = clamp(Math.round(dead.fame * 0.3)); // "child of a legend"
  heir.will = { charityPct: 0, written: false };
  heir.dynasty = dynasty;
  // Build 11B.1: the heir's background spouse and children become real;
  // everyone else in the tree becomes named extended family.
  settleFamilyTree(dead, heir, chosen, dynasty, drama);
  if (rec) {
    if (rec.taughtSkills.includes("deal"))
      heir.businessReputation = clamp(heir.businessReputation + 15);
    if (rec.taughtSkills.includes("vote")) {
      const hp = ensurePolitics(heir);
      hp.reputation = clamp(hp.reputation + 10);
    }
    if (rec.taughtSkills.includes("books")) {
      const hc = ensureCrime(heir);
      hc.notoriety = clamp(hc.notoriety + 8);
      heir.log.push({
        age: heirAge,
        text: "You know how the books get cooked. You were taught at the kitchen table, which is the traditional classroom for it.",
        tone: "neutral",
      });
    }
    if (rec.taughtSkills.includes("tennis")) {
      heir.log.push({
        age: heirAge,
        text: "Your serve was built on a private court, one correction at a time, by someone who knew. Pick up a racket — it's all still there.",
        tone: "good",
      });
    }
    const curse = curseAssessment(rec.spoiled, rec.grit, dynasty.generation);
    if (curse.line)
      heir.log.push({ age: heirAge, text: curse.line, tone: curse.gilded ? "bad" : "milestone" });
    if (curse.gilded) {
      heir.gilded = true;
      heir.stats.happiness = clamp(heir.stats.happiness - 5);
      heir.networking = clamp(Math.round(heir.networking * 0.7));
    }
  }
  // The widow becomes the Dowager — the family's memory, and its sharpest instrument.
  const widow = dead.relationships.find((x) => x.type === "partner" && x.alive);
  if (widow) {
    heir.dowager = {
      name: widow.name,
      alive: true,
      age: widow.age,
      relationship: 50,
      yearsSinceVisit: 0,
      loreShared: 0,
    };
    heir.log.push({
      age: heirAge,
      text: `${widow.name} has taken the east rooms${dynasty.seat ? ` at ${dynasty.seat.name}` : ""} and, without any announcement, command of the family's social affairs. Call on her. That is not a suggestion.`,
      tone: "neutral",
    });
  }
  // The heirloom letter waits for its year.
  if (will.letter && !will.letter.delivered) {
    heir.will = { charityPct: 0, written: false, letter: { ...will.letter } };
  }

  // --- Properties transfer intact ---
  let propertiesKept = 0;
  if (dead.investing) {
    heir.investing = {
      holdings: [],
      properties: structuredClone(dead.investing.properties),
      realizedGains: 0,
      incomeLifetime: 0,
      lastYearReturnPct: 0,
      marketMood: dead.investing.marketMood,
    };
    propertiesKept = heir.investing.properties.length;
  } else {
    heir.investing = undefined;
  }

  // --- Businesses: succession drama ---
  let kept = 0;
  let lost = 0;
  heir.businessHub = undefined;
  if (dead.businessHub?.businesses.length) {
    const surviving = [];
    for (const b of dead.businessHub.businesses) {
      if (!will.written && Math.random() < 0.5) {
        const sale = Math.round(
          Math.max(0, (b.valuation + b.cash - b.loan) * (1 - b.investorOwned)) * 0.7,
        );
        heir.money += sale;
        lost++;
        drama.push(
          `Executors fire-sold ${b.name} for $${sale.toLocaleString()} (70 cents on the dollar).`,
        );
        continue;
      }
      const nb = structuredClone(b);
      if (Math.random() < 0.35) {
        nb.quality = clamp(nb.quality - randInt(10, 20));
        nb.reputation = clamp(nb.reputation - randInt(8, 15));
        drama.push(`Succession crisis at ${nb.name}: key people walked when the founder died.`);
      }
      surviving.push(nb);
      kept++;
    }
    if (surviving.length)
      heir.businessHub = { businesses: surviving, lifetimeProfit: 0, soldFor: 0, failures: 0 };
  }

  // --- Path inheritances ---
  if ((dead.politics?.highestLevelWon ?? -1) >= 3) {
    const p = ensurePolitics(heir);
    p.reputation = clamp(p.reputation + 15);
    p.partySupport = 20;
    heir.log.push({
      age: heirAge,
      text: `The ${dynasty.familyName} name still opens doors in politics. A dynasty expects things of you.`,
      tone: "neutral",
    });
  }
  const deadRank = dead.crime?.rank;
  if (
    dead.crime?.syndicate &&
    (deadRank === "soldier" ||
      deadRank === "capo" ||
      deadRank === "underboss" ||
      deadRank === "boss")
  ) {
    const cr = ensureCrime(heir);
    cr.notoriety = 20;
    heir.log.push({
      age: heirAge,
      text: `The ${dead.crime.syndicate} sent flowers to the funeral — and made it clear the family's arrangements are expected to continue.`,
      tone: "neutral",
    });
  }
  if (dynasty.markedBySyndicate) {
    const cr = ensureCrime(heir);
    cr.heat = 15;
    heir.log.push({
      age: heirAge,
      text: "Your family is marked: an ancestor turned informant, and the families have long memories. Watch yourself.",
      tone: "bad",
    });
  }

  const report: EstateReport = {
    grossEstate,
    tax,
    charity,
    netToHeir: Math.max(0, netCash),
    drama,
    businessesKept: kept,
    businessesLost: lost,
    propertiesKept,
  };

  for (const d of report.drama) heir.log.unshift({ age: heirAge, text: d, tone: "neutral" });
  heir.log.unshift({
    age: heirAge,
    text: `Generation ${dynasty.generation} of the ${dynasty.familyName} dynasty begins. ${dead.name} (${ancestor.headline.toLowerCase()}) left you $${report.netToHeir.toLocaleString()} after taxes.`,
    tone: "milestone",
  });
  return { heir, report };
}
