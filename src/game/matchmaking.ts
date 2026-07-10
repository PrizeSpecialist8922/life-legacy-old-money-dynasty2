import type {
  CadetBranch,
  Character,
  Dynasty,
  Heirloom,
  LogEntry,
  LogTone,
} from "./types";
import { ensureRecords, recordArchive } from "./records";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Matchmaking, Cadet Branches & Heirlooms (Build 11B.3). Marriages are
// arranged over lunch, fortunes are protected by paperwork, second sons get
// seed money and a hyphen, and the founder's watch changes wrists exactly
// once per generation.
// ---------------------------------------------------------------------------

export interface MatchResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): MatchResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

// ---------- Arranged introductions ----------

export interface MatchTargetDef {
  id: string;
  label: string;
  hint: string;
}

export const MATCH_TARGETS: MatchTargetDef[] = [
  {
    id: "rival",
    label: "A rival dynasty's heir",
    hint: "Ends a feud the old way; needs relations above open war",
  },
  {
    id: "political",
    label: "A political family",
    hint: "+Political influence when it lands",
  },
  {
    id: "fortune",
    label: "New money, old fortune",
    hint: "A dowry arrives with the vows",
  },
  {
    id: "love",
    label: "Someone they'd actually like",
    hint: "Highest acceptance; no strategic upside",
  },
];

export function arrangeIntroduction(
  input: Character,
  relId: string,
  target: string,
  prenup: boolean,
  rivalId: string | undefined,
  spend: (c: Character) => boolean,
): MatchResult {
  const c = structuredClone(input);
  const rel = c.relationships.find(
    (r) => r.id === relId && r.type === "child" && r.alive,
  );
  const k = c.children?.find((x) => x.relId === relId);
  if (!rel || !k) return fail(input, "They aren't at your table.");
  if (rel.age < 21)
    return fail(
      input,
      "Introductions start at 21 — before that it's just embarrassing.",
    );
  if (k.spouseName) return fail(input, `${rel.name} is already married.`);
  if (k.courtship)
    return fail(input, "A courtship is already in motion — one at a time.");
  if (k.cutOff)
    return fail(input, "You cut them off. They arrange their own lunches now.");
  if (!MATCH_TARGETS.some((t) => t.id === target))
    return fail(input, "Unknown sort of match.");
  if (target === "rival") {
    const rival = c.dynasty?.rivals?.find((r) => r.id === rivalId);
    if (!rival)
      return fail(
        input,
        "Pick which family — the Vault has files on all of them.",
      );
    if (rival.relation < -30)
      return fail(
        input,
        `${rival.name} won't even share a coatroom with your family right now.`,
      );
  }
  if (!spend(c)) return fail(input, "No energy left this year.");
  const cost = 25000;
  if (c.money < cost)
    return fail(
      input,
      `A proper introduction — the lunch, the box seats, the accident of seating — runs ${formatMoney(cost)}.`,
    );
  c.money -= cost;
  k.courtship = {
    target,
    targetRivalId: target === "rival" ? rivalId : undefined,
    prenup,
    yearsLeft: randInt(1, 2),
  };
  if (prenup && target === "love") k.resentment = clamp(k.resentment + 5); // romance, notarized
  const msg = `An introduction is arranged for ${rel.name}: ${MATCH_TARGETS.find((t) => t.id === target)?.label.toLowerCase()}${prenup ? ", contract to follow the courtship" : ""}. Now the family waits, casually, by the phone.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

const POLITICAL_SURNAMES = [
  "Whitfield",
  "Calder",
  "Renwick",
  "Osborne-Hale",
  "Marchbanks",
];
const FORTUNE_SURNAMES = [
  "Zhao-Bergman",
  "Novak",
  "Al-Rashid",
  "Petrossian",
  "Vanterpool",
];
const FIRST_NAMES_ANY = [
  "Alexandra",
  "Theodore",
  "Priya",
  "Sebastian",
  "Ingrid",
  "Marcus",
  "Camille",
  "Julian",
  "Noor",
  "Vivian",
];

function resolveCourtships(c: Character, d: Dynasty, log: LogEntry[]) {
  for (const rel of c.relationships.filter(
    (r) => r.type === "child" && r.alive,
  )) {
    const k = c.children?.find((x) => x.relId === rel.id);
    if (!k?.courtship || k.spouseName) continue;
    const ct = k.courtship;
    if (ct.yearsLeft > 0) {
      ct.yearsLeft -= 1;
      continue;
    }
    const assured = (ct as { assured?: boolean }).assured === true;
    // Acceptance: love matches land easiest; strategy fights resentment.
    let chance = ct.target === "love" ? 80 : 55;
    chance -= Math.round(k.resentment / 3);
    chance += Math.round((d.unity ?? 60) / 10);
    if (assured) chance = 100;
    const rival =
      ct.target === "rival"
        ? d.rivals?.find((r) => r.id === ct.targetRivalId)
        : undefined;
    if (rival) chance += Math.round(rival.relation / 5);

    if (randInt(1, 100) > clamp(chance, 10, 100)) {
      k.courtship = undefined;
      k.resentment = clamp(k.resentment + 4);
      log.push({
        age: c.age,
        text: `The introduction for ${rel.name} came to nothing — two polite families, one immovable ${rel.name}. The matter is not raised at dinner.`,
        tone: "bad",
      });
      continue;
    }

    // The match lands.
    let spouse = "";
    if (ct.target === "rival" && rival) {
      spouse = `${randItem(FIRST_NAMES_ANY)} ${rival.name.replace(/^the /, "").replace(/s$/, "")}`;
      rival.relation = clamp(rival.relation + 60, -100, 100);
      rival.alliedByMarriage = true;
      d.reputation = clamp(d.reputation + 4);
      log.push({
        age: c.age,
        text: `AN ALLIANCE: ${rel.name} married ${spouse}. Two families that spent a generation not waving now share grandchildren and a pew.`,
        tone: "milestone",
      });
    } else if (ct.target === "political") {
      spouse = `${randItem(FIRST_NAMES_ANY)} ${randItem(POLITICAL_SURNAMES)}`;
      c.politicalInfluence = clamp(c.politicalInfluence + 10);
      log.push({
        age: c.age,
        text: `${rel.name} married ${spouse}, of the ${spouse.split(" ")[1]} political machine. The family gained in-laws and a rolodex.`,
        tone: "milestone",
      });
    } else if (ct.target === "fortune") {
      spouse = `${randItem(FIRST_NAMES_ANY)} ${randItem(FORTUNE_SURNAMES)}`;
      const dowry = randInt(10, 40) * 100000;
      c.money += dowry;
      log.push({
        age: c.age,
        text: `${rel.name} married ${spouse} — new money, gracious about it. A settlement of ${formatMoney(dowry)} arrived with the thank-you notes.`,
        tone: "milestone",
      });
    } else {
      spouse = `${randItem(FIRST_NAMES_ANY)} ${randItem([...POLITICAL_SURNAMES, ...FORTUNE_SURNAMES])}`;
      k.affection = clamp(k.affection + 8);
      log.push({
        age: c.age,
        text: `${rel.name} married ${spouse} — your introduction, their choice, everyone's relief. The toast wrote itself.`,
        tone: "milestone",
      });
    }
    k.spouseName = spouse;
    k.marriedAtAge = rel.age;
    k.prenup = ct.prenup;
    k.contract = ct.target === "love" ? undefined : ct.target;
    k.courtship = undefined;
    d.unity = clamp((d.unity ?? 60) + 3);
    recordArchive(
      c,
      "wedding",
      `${rel.name} married ${spouse}${ct.prenup ? " (contract in place)" : ""}.`,
      `wed:${rel.id}`,
    );
    // Constitution: contracted marriages honored.
    const rule = d.constitution?.find(
      (r) => r.id === "contract_marriages" && r.active && !r.broken,
    );
    if (rule && !ct.prenup) {
      rule.broken = true;
      d.unity = clamp((d.unity ?? 60) - 6);
      d.reputation = clamp(d.reputation - 4);
      log.push({
        age: c.age,
        text: `CONSTITUTIONAL CRISIS: "No marriage without a contract" is broken — ${rel.name} married without one, with your blessing, which made it worse.`,
        tone: "bad",
      });
    }
  }
}

/** Divorces: background marriages can end. Prenups decide what it costs. */
function resolveDivorces(c: Character, d: Dynasty, log: LogEntry[]) {
  for (const rel of c.relationships.filter(
    (r) => r.type === "child" && r.alive,
  )) {
    const k = c.children?.find((x) => x.relId === rel.id);
    if (!k?.spouseName || k.branchId) continue;
    const strain = k.contract && k.contract !== "love" ? 5 : 3; // strategic matches strain more
    if (randInt(1, 100) > strain) continue;
    const ex = k.spouseName;
    k.spouseName = undefined;
    k.contract = undefined;
    if (k.prenup) {
      log.push({
        age: c.age,
        text: `${rel.name} and ${ex} divorced. The contract held; the fortune never noticed. The lawyers shook hands.`,
        tone: "neutral",
      });
    } else {
      const bite = Math.min(Math.round(Math.max(0, c.money) * 0.03), 5000000);
      if (bite > 10000) {
        c.money -= bite;
        log.push({
          age: c.age,
          text: `${rel.name} and ${ex} divorced — no contract, no mercy. The settlement reached into the family accounts for ${formatMoney(bite)}.`,
          tone: "bad",
        });
      } else {
        log.push({
          age: c.age,
          text: `${rel.name} and ${ex} divorced quietly.`,
          tone: "neutral",
        });
      }
    }
    k.prenup = undefined;
    d.unity = clamp((d.unity ?? 60) - 2);
    recordArchive(
      c,
      "divorce",
      `${rel.name} and ${ex} divorced.`,
      `div:${rel.id}:${c.age}`,
    );
  }
}

// ---------- Cadet branches ----------

const BRANCH_PLACES = [
  "Ashford",
  "the Coast",
  "the Lakes",
  "Montrose",
  "the Old Quarter",
  "Fairhaven",
];

export function foundBranch(
  input: Character,
  relId: string,
  seed: number,
): MatchResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  const rel = c.relationships.find(
    (r) => r.id === relId && r.type === "child" && r.alive,
  );
  const k = c.children?.find((x) => x.relId === relId);
  if (!rel || !k) return fail(input, "They aren't at your table.");
  if (rel.age < 25)
    return fail(input, "Branches are founded by adults — 25 and up.");
  if (k.branchId) return fail(input, "They already head their own house.");
  if (c.will?.heirId === relId)
    return fail(
      input,
      "The named heir carries the main line — pick a different child, or change the will first.",
    );
  if (seed < 1000000)
    return fail(
      input,
      "A branch that starts under $1M is called an apartment.",
    );
  if (c.money < seed)
    return fail(input, `You don't have ${formatMoney(seed)}.`);
  c.money -= seed;
  d.branches = d.branches ?? [];
  const branch: CadetBranch = {
    id: uid(),
    name: `House ${d.familyName} of ${randItem(BRANCH_PLACES)}`,
    founder: rel.name,
    wealth: seed,
    prestige: 20,
    loyalty: clamp(70 - k.resentment + Math.round(k.affection / 4)),
    foundedGeneration: d.generation,
  };
  d.branches.push(branch);
  k.branchId = branch.id;
  k.affection = clamp(k.affection + 10);
  d.unity = clamp((d.unity ?? 60) + 2);
  recordArchive(
    c,
    "branch",
    `${branch.name} founded by ${rel.name} with ${formatMoney(seed)}.`,
    `br:${branch.id}`,
  );
  const msg = `${branch.name} is founded — ${rel.name}, ${formatMoney(seed)}, and a hyphen of their own. The main line keeps the name; the branch keeps the chip on its shoulder.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

function advanceBranches(c: Character, d: Dynasty, log: LogEntry[]) {
  if (!d.branches?.length) return;
  for (const b of d.branches) {
    b.wealth = Math.round(b.wealth * (1 + randInt(-4, 8) / 100));
    b.prestige = clamp(b.prestige + randInt(-1, 2));
    b.loyalty = clamp(
      b.loyalty + randInt(-2, 2) + ((d.unity ?? 60) > 70 ? 1 : 0),
    );

    if (b.loyalty >= 70 && Math.random() < 0.1) {
      const gift = Math.round(b.wealth * 0.02);
      if (gift > 20000) {
        c.money += gift;
        log.push({
          age: c.age,
          text: `${b.name} sent ${formatMoney(gift)} toward the main line's affairs, unasked. Loyalty with a wire number.`,
          tone: "good",
        });
      }
    } else if (b.loyalty <= 30 && Math.random() < 0.12) {
      d.reputation = clamp(d.reputation - 2);
      log.push({
        age: c.age,
        text: `${b.name} gave an interview describing themselves as "the branch that actually works." The society pages loved it.`,
        tone: "bad",
      });
    }
    if (b.wealth > 50000000 && b.prestige > 60 && Math.random() < 0.08) {
      log.push({
        age: c.age,
        text: `${b.name} is now, by some measures, the more prominent house. At the club, someone asked if YOU were the cadet branch.`,
        tone: "bad",
      });
      d.reputation = clamp(d.reputation - 1);
    }
  }
}

// ---------- Heirlooms ----------

const HEIRLOOM_IDEAS = [
  {
    name: "the Founder's Watch",
    description: "Stops twice a day; corrected by no one.",
  },
  {
    name: "Grandmother's Ring",
    description: "Three stones, two stories, one truth.",
  },
  {
    name: "the Library Globe",
    description: "Shows four countries that no longer exist.",
  },
  {
    name: "the Dueling Pistols",
    description: "Never fired, endlessly implied.",
  },
  {
    name: "the First Ledger",
    description: "Page one is the whole family in nine entries.",
  },
  {
    name: "the Portrait Miniature",
    description: "An ancestor, painted small enough to carry into exile.",
  },
];

export function commissionHeirloom(
  input: Character,
  name: string,
): MatchResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  d.heirlooms = d.heirlooms ?? [];
  const cost = 150000;
  if (c.money < cost)
    return fail(
      input,
      `An object worth handing down starts at ${formatMoney(cost)}.`,
    );
  c.money -= cost;
  const idea = name.trim()
    ? {
        name: name.trim().slice(0, 60),
        description: "Commissioned to outlast everyone who remembers why.",
      }
    : (randItem(
        HEIRLOOM_IDEAS.filter(
          (h) => !d.heirlooms!.some((x) => x.name === h.name),
        ),
      ) ?? randItem(HEIRLOOM_IDEAS));
  const h: Heirloom = {
    id: uid(),
    name: idea.name,
    description: idea.description,
    holder: c.name,
    significance: randInt(30, 60),
    generationAcquired: d.generation,
  };
  d.heirlooms.push(h);
  recordArchive(
    c,
    "heirloom",
    `${h.name} entered the family: ${h.description}`,
    `hl:${h.id}`,
  );
  const msg = `${h.name} joins the family's things-that-matter. ${h.description}`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function assignHeirloom(
  input: Character,
  heirloomId: string,
  relId: string | undefined,
): MatchResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const h = d?.heirlooms?.find((x) => x.id === heirloomId);
  if (!h) return fail(input, "The family owns no such thing.");
  if (h.holder !== c.name)
    return fail(
      input,
      `${h.name} is in ${h.holder}'s hands — not yours to assign.`,
    );
  if (
    relId &&
    !c.relationships.some(
      (r) => r.id === relId && r.type === "child" && r.alive,
    )
  )
    return fail(input, "Assign it to a living child, or to no one.");
  h.assignedTo = relId;
  const kidName = c.relationships.find((r) => r.id === relId)?.name;
  const msg = relId
    ? `${h.name} is written to ${kidName} in the will. Somewhere, a sibling has already noticed.`
    : `${h.name} is left unassigned in the will. Bold.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

/** Auto-created heirlooms at milestones; significance grows with age. */
function advanceHeirlooms(c: Character, d: Dynasty) {
  d.heirlooms = d.heirlooms ?? [];
  for (const h of d.heirlooms)
    h.significance = clamp(h.significance + (Math.random() < 0.3 ? 1 : 0));
  if (d.seat && !d.heirlooms.some((h) => h.id === `seatkey:${d.familyName}`)) {
    d.heirlooms.push({
      id: `seatkey:${d.familyName}`,
      name: `the Key to ${d.seat.name}`,
      description: "Opens nothing anymore. Opens everything.",
      holder: c.name,
      significance: 50,
      generationAcquired: d.generation,
    });
  }
}

// ---------- Succession settlement (called from createHeir) ----------

export function settleHouseAffairs(
  dead: Character,
  heir: Character,
  chosenId: string | undefined,
  dynasty: Dynasty,
  netCash: number,
  drama: string[],
) {
  // Heirlooms change hands per the will.
  for (const h of dynasty.heirlooms ?? []) {
    if (h.holder !== dead.name) continue;
    if (h.assignedTo && h.assignedTo === chosenId) {
      h.holder = heir.name;
      h.assignedTo = undefined;
      dynasty.pedigree = clamp((dynasty.pedigree ?? 0) + 1);
      drama.push(
        `${h.name} passed to the heir, as written. It fit their hands immediately.`,
      );
    } else if (h.assignedTo) {
      const kidName =
        dead.relationships.find((r) => r.id === h.assignedTo)?.name ??
        "a sibling";
      h.holder = kidName;
      h.assignedTo = undefined;
      drama.push(
        `${h.name} went to ${kidName}, as written. The heir looked at it exactly once.`,
      );
    } else {
      h.holder = heir.name;
      h.assignedTo = undefined;
      dynasty.unity = clamp((dynasty.unity ?? 60) - 2);
      drama.push(
        `${h.name} was never assigned — the heir took it by default, and a decade of grievance took root over an object.`,
      );
    }
  }

  // Constitution: an educated heir, checked at the moment it matters.
  const eduRule = dynasty.constitution?.find(
    (r) => r.id === "educated_heir" && r.active && !r.broken,
  );
  if (eduRule && chosenId) {
    const rec = dead.children?.find((k) => k.relId === chosenId);
    if ((rec?.academics ?? 0) < 60) {
      eduRule.broken = true;
      dynasty.unity = clamp((dynasty.unity ?? 60) - 6);
      dynasty.reputation = clamp(dynasty.reputation - 4);
      drama.push(
        `CONSTITUTIONAL CRISIS: "An educated heir" is broken — the estate passed to unstudied hands, and the Council's minutes say so.`,
      );
    } else {
      eduRule.keptYears += 1;
      dynasty.pedigree = clamp((dynasty.pedigree ?? 0) + 1);
      drama.push(
        `The Constitution held: an educated heir, as the house requires.`,
      );
    }
  }

  // A second child taking a major share founds a cadet branch with it —
  // one heir carries the name; the other carries their fortune out the door
  // and hangs a shingle of their own.
  const splits = dead.will?.splits ?? [];
  if (splits.length && chosenId) {
    dynasty.branches = dynasty.branches ?? [];
    const kids = dead.relationships.filter(
      (r) => r.type === "child" && r.alive,
    );
    for (const s of splits) {
      if (s.relId === chosenId || s.pct < 25) continue;
      const kid = kids.find((k) => k.id === s.relId);
      const rec = dead.children?.find((k) => k.relId === s.relId);
      if (!kid || rec?.branchId) continue;
      const seed = Math.round(netCash * (s.pct / 100));
      if (seed < 500000) continue;
      const branch: CadetBranch = {
        id: uid(),
        name: `House ${dynasty.familyName} of ${randItem(BRANCH_PLACES)}`,
        founder: kid.name,
        wealth: seed,
        prestige: 15,
        loyalty: clamp(
          60 - (rec?.resentment ?? 20) + Math.round((rec?.affection ?? 40) / 4),
        ),
        foundedGeneration: dynasty.generation,
      };
      dynasty.branches.push(branch);
      drama.push(
        `${kid.name} took their ${s.pct}% — ${formatMoney(seed)} — and founded ${branch.name}. Two heirs after all: one kept the name, one kept the leverage to ignore it.`,
      );
    }
  }
}

// ---------- Yearly advance ----------

export function advanceMatchmaking(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return;
  resolveCourtships(c, d, log);
  resolveDivorces(c, d, log);
  advanceBranches(c, d, log);
  advanceHeirlooms(c, d);
}
