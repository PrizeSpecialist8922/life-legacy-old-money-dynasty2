import { FIRST_NAMES_POOL, POLITICIAN_SURNAMES } from "./politicsData";
import type {
  BizEvent,
  Character,
  CrewMember,
  CrimeRank,
  CrimeState,
  LawyerTier,
  LogEntry,
  LogTone,
  PrisonState,
  TrialStage,
  TrialState,
} from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Crime path (Build 12). Design: risk/reward — a careful criminal who manages
// heat, builds a loyal crew and launders through legitimate businesses can
// genuinely win; a sloppy one eats trials, prison years and betrayal. All
// abstract game mechanics, fictional and consequence-driven.
// ---------------------------------------------------------------------------

export interface CrimeResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): CrimeResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

type Spend = (c: Character) => boolean;

export function ensureCrime(c: Character): CrimeState {
  if (!c.crime)
    c.crime = {
      active: false,
      notoriety: 0,
      heat: 0,
      dirtyMoney: 0,
      crew: [],
      rackets: 0,
      crimesCommitted: 0,
      timesCaught: 0,
      totalYearsServed: 0,
      informant: false,
      leftTheLife: false,
    };
  if (c.crime.trial && !c.crime.trial.stage) {
    c.crime.trial.stage = "interrogation";
    c.crime.trial.courtLog = [];
  }
  return c.crime;
}

export const RANKS: { id: CrimeRank; label: string; minNotoriety: number }[] = [
  { id: "petty", label: "Street Hustler", minNotoriety: 0 },
  { id: "associate", label: "Associate", minNotoriety: 25 },
  { id: "soldier", label: "Soldier", minNotoriety: 40 },
  { id: "capo", label: "Capo", minNotoriety: 60 },
  { id: "underboss", label: "Underboss", minNotoriety: 78 },
  { id: "boss", label: "Boss", minNotoriety: 92 },
];

export function rankLabel(rank?: CrimeRank): string {
  return RANKS.find((r) => r.id === rank)?.label ?? "Civilian";
}

const SYNDICATES = [
  "Moretti Family",
  "Volkov Bratva",
  "Red Lantern Triad",
  "Costa Cartel",
  "Kessler Ring",
];

// ---------- Crimes ----------

export interface CrimeJobDef {
  id: string;
  label: string;
  minAge: number;
  minNotoriety: number;
  needsSyndicate: boolean;
  needsCrew: number; // crew members required
  payout: [number, number];
  heat: [number, number];
  catchBase: number; // % base chance of being caught on failure paths
  severity: number; // 1-10 sentencing weight
  notoriety: [number, number];
}

export const CRIME_JOBS: CrimeJobDef[] = [
  {
    id: "pickpocket",
    label: "Pickpocketing",
    minAge: 16,
    minNotoriety: 0,
    needsSyndicate: false,
    needsCrew: 0,
    payout: [50, 400],
    heat: [1, 3],
    catchBase: 18,
    severity: 1,
    notoriety: [1, 2],
  },
  {
    id: "shoplift",
    label: "Shoplifting Ring",
    minAge: 16,
    minNotoriety: 0,
    needsSyndicate: false,
    needsCrew: 0,
    payout: [200, 900],
    heat: [2, 4],
    catchBase: 20,
    severity: 1,
    notoriety: [1, 3],
  },
  {
    id: "scam",
    label: "Online Scam",
    minAge: 16,
    minNotoriety: 5,
    needsSyndicate: false,
    needsCrew: 0,
    payout: [800, 4000],
    heat: [2, 5],
    catchBase: 15,
    severity: 2,
    notoriety: [1, 3],
  },
  {
    id: "cartheft",
    label: "Car Theft",
    minAge: 18,
    minNotoriety: 12,
    needsSyndicate: false,
    needsCrew: 0,
    payout: [3000, 12000],
    heat: [4, 8],
    catchBase: 25,
    severity: 3,
    notoriety: [2, 5],
  },
  {
    id: "burglary",
    label: "Burglary",
    minAge: 18,
    minNotoriety: 15,
    needsSyndicate: false,
    needsCrew: 0,
    payout: [4000, 20000],
    heat: [5, 9],
    catchBase: 26,
    severity: 3,
    notoriety: [2, 5],
  },
  {
    id: "fraud",
    label: "Corporate Fraud",
    minAge: 21,
    minNotoriety: 20,
    needsSyndicate: false,
    needsCrew: 0,
    payout: [15000, 80000],
    heat: [6, 10],
    catchBase: 22,
    severity: 4,
    notoriety: [3, 6],
  },
  {
    id: "hijack",
    label: "Truck Hijacking",
    minAge: 18,
    minNotoriety: 30,
    needsSyndicate: true,
    needsCrew: 1,
    payout: [25000, 90000],
    heat: [8, 14],
    catchBase: 28,
    severity: 5,
    notoriety: [3, 7],
  },
  {
    id: "extortion",
    label: "Extortion Round",
    minAge: 18,
    minNotoriety: 35,
    needsSyndicate: true,
    needsCrew: 1,
    payout: [20000, 60000],
    heat: [6, 12],
    catchBase: 22,
    severity: 5,
    notoriety: [2, 6],
  },
  {
    id: "jewelry",
    label: "Jewelry Store Heist",
    minAge: 21,
    minNotoriety: 45,
    needsSyndicate: true,
    needsCrew: 2,
    payout: [80000, 300000],
    heat: [14, 22],
    catchBase: 34,
    severity: 7,
    notoriety: [5, 10],
  },
  {
    id: "bank",
    label: "Bank Job",
    minAge: 21,
    minNotoriety: 60,
    needsSyndicate: true,
    needsCrew: 3,
    payout: [200000, 900000],
    heat: [20, 30],
    catchBase: 40,
    severity: 9,
    notoriety: [8, 14],
  },
  {
    id: "vault",
    label: "The Big Score (casino vault)",
    minAge: 25,
    minNotoriety: 75,
    needsSyndicate: true,
    needsCrew: 4,
    payout: [800000, 3000000],
    heat: [28, 40],
    catchBase: 45,
    severity: 10,
    notoriety: [12, 20],
  },
];

function crewQuality(cr: CrimeState): number {
  if (!cr.crew.length) return 0;
  return cr.crew.reduce((s, m) => s + m.skill, 0) / cr.crew.length;
}

/** Success chance 5–95: smarts + crew + notoriety vs heat and job difficulty. */
export function jobSuccessChance(c: Character, job: CrimeJobDef): number {
  const cr = c.crime ?? ensureCrime(structuredClone(c));
  let chance = 55;
  chance += (c.stats.smarts - 50) * 0.4;
  chance += cr.notoriety * 0.15;
  chance += crewQuality(cr) * 0.2 * Math.min(1, job.needsCrew);
  chance -= cr.heat * 0.35; // hot criminals get watched
  chance -= job.severity * 2.5;
  return clamp(Math.round(chance), 5, 95);
}

export function commitCrime(input: Character, jobId: string, spend: Spend): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const job = CRIME_JOBS.find((j) => j.id === jobId);
  if (!job) return fail(input, "Unknown job.");
  if (cr.prison) return fail(input, "You're behind bars. Crime out here can wait.");
  if (cr.trial) return fail(input, "You're awaiting trial — lay low.");
  if (c.age < job.minAge) return fail(input, `Too young for that (${job.minAge}+).`);
  if (cr.notoriety < job.minNotoriety)
    return fail(input, `Nobody trusts you with that yet (needs ${job.minNotoriety} notoriety).`);
  if (job.needsSyndicate && !cr.syndicate)
    return fail(input, "That's syndicate work. Get connected first.");
  if (cr.crew.length < job.needsCrew)
    return fail(input, `You need a crew of ${job.needsCrew} for that.`);
  if (job.severity >= 7)
    return fail(
      input,
      "Jobs this big are planned, not improvised — run it as a heist with an approach.",
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  cr.active = true;
  cr.leftTheLife = false;
  if (!cr.rank) cr.rank = "petty";
  cr.crimesCommitted += 1;

  const chance = jobSuccessChance(c, job);
  const roll = randInt(1, 100);

  if (roll <= chance) {
    const take = randInt(job.payout[0], job.payout[1]);
    const cut = cr.syndicate && job.needsSyndicate ? 0.7 : 1; // the family takes its slice
    const yours = Math.round(take * cut);
    cr.dirtyMoney += yours;
    cr.heat = clamp(cr.heat + randInt(job.heat[0], job.heat[1]));
    cr.notoriety = clamp(cr.notoriety + randInt(job.notoriety[0], job.notoriety[1]));
    maybePromote(c, cr);
    const msg = `${job.label} went clean: $${yours.toLocaleString()} in dirty money.${cut < 1 ? " The family took its cut." : ""}`;
    c.log.push({ age: c.age, text: msg, tone: "good" });
    return { character: c, message: msg, tone: "good", ok: true };
  }

  // Failed — did you get away?
  const caught = randInt(1, 100) <= job.catchBase + cr.heat * 0.3;
  cr.heat = clamp(cr.heat + randInt(job.heat[0], job.heat[1]) + 4);
  if (!caught) {
    const msg = `The ${job.label.toLowerCase()} fell apart — you got out empty-handed, heart pounding.`;
    c.log.push({ age: c.age, text: msg, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  cr.timesCaught += 1;
  cr.trial = makeTrial(job.label, job.severity, clamp(45 + randInt(0, 30) + cr.heat * 0.2, 20, 95));
  const msg = `Busted mid-${job.label.toLowerCase()}! You're charged and awaiting trial.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

function maybePromote(c: Character, cr: CrimeState) {
  if (!cr.syndicate || !cr.rank) return;
  const idx = RANKS.findIndex((r) => r.id === cr.rank);
  const next = RANKS[idx + 1];
  if (next && cr.notoriety >= next.minNotoriety && Math.random() < 0.5) {
    cr.rank = next.id;
    c.log.push({
      age: c.age,
      text: `The ${cr.syndicate} made you ${next.label}.`,
      tone: "milestone",
    });
    c.fame += next.id === "boss" ? 5 : 1;
  }
}

// ---------- Syndicate & crew ----------

export function joinSyndicate(input: Character, spend: Spend): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  if (cr.syndicate) return fail(input, `You already answer to the ${cr.syndicate}.`);
  if (cr.prison) return fail(input, "Not from inside. (Though the yard has its own recruiters...)");
  if (c.age < 18) return fail(input, "The families don't take minors.");
  const connected = c.contacts?.some((x) => x.type === "lawyer" || x.type === "wealthy") ?? false;
  if (cr.notoriety < 20 && !connected)
    return fail(
      input,
      "Nobody vouches for you yet. Build 20 notoriety on the street, or know the right people.",
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  cr.syndicate = randItem(SYNDICATES);
  cr.active = true;
  cr.rank = cr.rank && RANKS.findIndex((r) => r.id === cr.rank) > 0 ? cr.rank : "associate";
  cr.notoriety = clamp(cr.notoriety + 5);
  const msg = `You were brought into the ${cr.syndicate} as an ${rankLabel(cr.rank)}. There's no HR department here.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function recruitCrew(input: Character, spend: Spend): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  if (cr.prison) return fail(input, "You're inside.");
  if (cr.crew.length >= 5) return fail(input, "Five is a crew. Six is a liability.");
  if (cr.notoriety < 15) return fail(input, "Nobody follows an unknown (needs 15 notoriety).");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const member: CrewMember = {
    id: uid(),
    name: `${randItem(FIRST_NAMES_POOL)} "${randItem(["Ghost", "Wrench", "Ace", "Smokes", "Tiny", "Preacher", "Doc", "Blackjack"])}" ${randItem(POLITICIAN_SURNAMES)}`,
    role: randItem(["driver", "muscle", "safecracker", "lookout", "fixer"]),
    skill: randInt(30, 90),
    loyalty: randInt(40, 85),
  };
  cr.crew.push(member);
  const msg = `${member.name} (${member.role}) joined your crew.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function startRacket(input: Character, spend: Spend): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  if (cr.prison) return fail(input, "You're inside.");
  if (!cr.syndicate) return fail(input, "Rackets need the syndicate's blessing.");
  if (cr.notoriety < 40) return fail(input, "Territory goes to earners (needs 40 notoriety).");
  if (cr.rackets >= 5) return fail(input, "Five rackets is an empire already.");
  if (cr.dirtyMoney + c.money < 30000)
    return fail(input, "Setting up a racket takes $30,000 seed money.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const fromDirty = Math.min(cr.dirtyMoney, 30000);
  cr.dirtyMoney -= fromDirty;
  c.money -= 30000 - fromDirty;
  cr.rackets += 1;
  const msg = `You set up racket #${cr.rackets}. It'll kick up dirty money every year — and draw heat.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function layLow(input: Character, spend: Spend): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  if (cr.prison) return fail(input, "You're already as low as it gets.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const drop = randInt(10, 20);
  cr.heat = clamp(cr.heat - drop);
  const msg = `You laid low all year: no jobs, no noise. Heat −${drop}.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function leaveTheLife(input: Character): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  if (cr.prison) return fail(input, "Serve your time first.");
  if (!cr.active) return fail(input, "You're already a civilian.");
  const hadSyndicate = !!cr.syndicate;
  cr.syndicate = undefined;
  cr.rank = undefined;
  cr.crew = [];
  cr.rackets = 0;
  cr.active = false;
  cr.leftTheLife = true;
  let msg =
    "You walked away from the life. The money stops; the looking over your shoulder doesn't, yet.";
  if (hadSyndicate && Math.random() < 0.4) {
    cr.heat = clamp(cr.heat + 10);
    msg += " Word is the family isn't thrilled about loose ends.";
  }
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Dirty money ----------

/** Launder through one of your own businesses: 85% comes out clean. */
export function launderThroughBusiness(
  input: Character,
  bizId: string,
  amount: number,
): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const biz = c.businessHub?.businesses.find((b) => b.id === bizId);
  if (!biz) return fail(input, "You need a legitimate business to wash money through.");
  const amt = Math.min(amount, cr.dirtyMoney);
  if (amt < 1000) return fail(input, "Not enough dirty money to bother.");
  const cap = Math.max(20000, biz.revenue * 0.5);
  if (amt > cap)
    return fail(
      input,
      `${biz.name} can only plausibly absorb $${Math.round(cap).toLocaleString()} a year.`,
    );
  cr.dirtyMoney -= amt;
  const cleaned = Math.round(amt * 0.85);
  biz.cash += cleaned;
  cr.heat = clamp(cr.heat + Math.round(amt / 40000));
  const msg = `$${amt.toLocaleString()} went through ${biz.name}'s books; $${cleaned.toLocaleString()} came out clean as business cash.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

/** Spend dirty money directly — fast, lossy, and hot. */
export function spendDirty(input: Character, amount: number): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const amt = Math.min(amount, cr.dirtyMoney);
  if (amt < 100) return fail(input, "Nothing to spend.");
  cr.dirtyMoney -= amt;
  c.money += Math.round(amt * 0.7);
  cr.heat = clamp(cr.heat + Math.max(1, Math.round(amt / 15000)));
  const msg = `You moved $${amt.toLocaleString()} of dirty cash into your pocket at 70 cents on the dollar. Flashy spending gets noticed.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Lawyers & Trial ----------
// The trial is a playable, multi-stage courtroom battle. Evidence is a live
// meter; every stage moves it; your lawyer's quality changes what plays are
// even available. Verdict comes after closing arguments.

export interface LawyerDef {
  tier: LawyerTier;
  label: string;
  fee: number;
  power: number; // flat reduction to conviction odds + better stage outcomes
  blurb: string;
}

export const LAWYERS: LawyerDef[] = [
  {
    tier: "public",
    label: "Public Defender",
    fee: 0,
    power: 4,
    blurb: "Free, sincere, and juggling 80 other cases",
  },
  {
    tier: "local",
    label: "Local Attorney",
    fee: 15000,
    power: 10,
    blurb: "Knows the judges, works the calendar",
  },
  {
    tier: "specialist",
    label: "Criminal Defense Specialist",
    fee: 60000,
    power: 18,
    blurb: "This is all they do, and they win",
  },
  {
    tier: "elite",
    label: "Elite Defense Firm",
    fee: 200000,
    power: 28,
    blurb: "Motions, experts, suppression — the full machine",
  },
  {
    tier: "fixer",
    label: "The Fixer",
    fee: 500000,
    power: 34,
    blurb: "Wins cases in ways that are themselves crimes",
  },
];

export function lawyerDef(tier?: LawyerTier): LawyerDef {
  return LAWYERS.find((l) => l.tier === tier) ?? LAWYERS[0];
}

/** Network lawyer contact (50+ rel) discounts fees 30% and adds 4 power. */
export function lawyerContactBonus(c: Character): {
  discount: number;
  power: number;
  name?: string;
} {
  const friend = c.contacts?.find((x) => x.type === "lawyer" && x.relationship >= 50);
  return friend ? { discount: 0.3, power: 4, name: friend.name } : { discount: 0, power: 0 };
}

export function effectiveLawyerFee(c: Character, def: LawyerDef): number {
  const bonus = lawyerContactBonus(c);
  let fee = Math.round(def.fee * (1 - bonus.discount));
  if (def.tier === "fixer" && c.crime?.syndicate) fee = Math.round(fee * 0.5); // family rates
  return fee;
}

export function trialConvictionChance(c: Character): number {
  const t = c.crime?.trial;
  if (!t) return 0;
  const bonus = lawyerContactBonus(c);
  let chance = t.evidence;
  chance -= t.lawyer ? lawyerDef(t.lawyer).power + bonus.power : 0;
  chance -= (c.stats.smarts - 50) * 0.15;
  chance += c.criminalRecord * 4;
  return clamp(Math.round(chance), 5, 95);
}

/** Plea offers track the evidence: strong cases mean worse deals. */
export function currentPleaOffer(c: Character): number {
  const t = c.crime?.trial;
  if (!t) return 0;
  return Math.max(1, Math.round(t.severity * 0.5 * (0.6 + t.evidence / 100)));
}

function makeTrial(charge: string, severity: number, evidence: number): TrialState {
  return {
    charge,
    severity,
    evidence: Math.round(evidence),
    offeredPleaYears: Math.max(1, Math.round(severity * 0.5)),
    stage: "interrogation",
    courtLog: [],
  };
}

export function hireLawyer(input: Character, tier: LawyerTier): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const t = cr.trial;
  if (!t) return fail(input, "No case to defend.");
  if (t.lawyer) return fail(input, `You already have ${lawyerDef(t.lawyer).label} on retainer.`);
  const def = lawyerDef(tier);
  if (tier === "fixer" && !cr.syndicate && cr.notoriety < 60)
    return fail(
      input,
      "The Fixer doesn't take calls from strangers. Syndicate ties or 60+ notoriety.",
    );
  const fee = effectiveLawyerFee(c, def);
  const fromDirty = Math.min(cr.dirtyMoney, fee);
  if (c.money + cr.dirtyMoney < fee)
    return fail(input, `${def.label} wants $${fee.toLocaleString()} up front. You don't have it.`);
  cr.dirtyMoney -= fromDirty;
  c.money -= fee - fromDirty;
  t.lawyer = tier;
  const bonus = lawyerContactBonus(c);
  const msg = `${def.label} took your case for $${fee.toLocaleString()}.${bonus.name ? ` ${bonus.name} made the introduction.` : ""}`;
  t.courtLog.push(msg);
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export interface TrialOption {
  id: string;
  label: string;
  hint: string;
  needsLawyer?: LawyerTier[];
  corrupt?: boolean;
}

const STAGE_TITLES: Record<TrialStage, string> = {
  interrogation: "The Interrogation Room",
  jury: "Jury Selection",
  witness: "The Prosecution's Star Witness",
  defense: "Your Defense",
  closing: "Closing Arguments",
};

export function trialStageTitle(stage: TrialStage): string {
  return STAGE_TITLES[stage];
}

export function trialOptions(c: Character): TrialOption[] {
  const t = c.crime?.trial;
  if (!t) return [];
  switch (t.stage) {
    case "interrogation":
      return [
        {
          id: "silent",
          label: "Say nothing",
          hint: "They can't use what you don't give them (evidence −4 to −8)",
        },
        {
          id: "talk",
          label: "Talk your way out",
          hint: "Smarts gamble: big drop or a self-inflicted wound",
        },
        {
          id: "demand",
          label: "Demand your lawyer immediately",
          hint: "Ends the interview cold (evidence −6, reliable)",
        },
      ];
    case "jury":
      return [
        { id: "standard", label: "Standard selection", hint: "Take the jury as it comes" },
        {
          id: "consult",
          label: "Jury consultants",
          hint: "Read the pool for sympathy (lawyer-skill gamble)",
          needsLawyer: ["local", "specialist", "elite", "fixer"],
        },
        {
          id: "tamper",
          label: "Get to a juror",
          hint: "One guaranteed friend in the box — unless it surfaces",
          needsLawyer: ["fixer"],
          corrupt: true,
        },
      ];
    case "witness":
      return [
        {
          id: "cross",
          label: "Cross-examine hard",
          hint: "Break their story (lawyer-skill gamble)",
        },
        {
          id: "object",
          label: "Object to everything",
          hint: "Blunt their impact (small, reliable drop)",
        },
        {
          id: "suppress",
          label: "Motion to suppress the key evidence",
          hint: "If it lands, the case guts itself",
          needsLawyer: ["elite", "fixer"],
        },
        { id: "pass", label: "Let the testimony stand", hint: "Risky to leave it unanswered" },
      ];
    case "defense":
      return [
        {
          id: "testify",
          label: "Take the stand yourself",
          hint: "High risk, high reward — juries love or destroy defendants",
        },
        {
          id: "alibi",
          label: "Call alibi witnesses",
          hint: c.crime?.crew.length
            ? "Your crew swears you were elsewhere (loyalty matters)"
            : "A thin bench without a crew",
        },
        {
          id: "rest",
          label: "Rest without testifying",
          hint: "Make them prove it (small, safe drop)",
        },
      ];
    case "closing":
      return [
        { id: "emotion", label: "Emotional appeal", hint: "Make twelve people feel your story" },
        {
          id: "doubt",
          label: "Methodical reasonable doubt",
          hint: "Your lawyer's craft, distilled",
        },
      ];
  }
}

/** Play one stage of the trial. After closing arguments, the verdict lands. */
export function trialStep(input: Character, optionId: string): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const t = cr.trial;
  if (!t) return fail(input, "No trial in progress.");
  const opts = trialOptions(c);
  const opt = opts.find((o) => o.id === optionId);
  if (!opt) return fail(input, "That play isn't available.");
  if (opt.needsLawyer && (!t.lawyer || !opt.needsLawyer.includes(t.lawyer)))
    return fail(input, "Your current counsel can't run that play.");

  const power = t.lawyer ? lawyerDef(t.lawyer).power + lawyerContactBonus(c).power : 2;
  const skillRoll = () => randInt(1, 100) <= 35 + power * 1.6;
  let delta = 0;
  let text = "";
  let tone: LogTone = "neutral";

  switch (optionId) {
    case "silent":
      delta = -randInt(4, 8);
      text = "You gave them nothing but your name.";
      tone = "good";
      break;
    case "talk": {
      if (randInt(1, 100) <= 30 + c.stats.smarts * 0.4) {
        delta = -randInt(10, 16);
        text = "Somehow, you talked the room into doubt.";
        tone = "good";
      } else {
        delta = randInt(8, 14);
        text = "You talked. They wrote everything down. All of it.";
        tone = "bad";
      }
      break;
    }
    case "demand":
      delta = -randInt(5, 7);
      text = "The interview ended the moment you said the word 'lawyer.'";
      tone = "good";
      break;
    case "standard":
      delta = randInt(-2, 2);
      text = "Twelve strangers, sworn in. Now it's real.";
      break;
    case "consult": {
      if (skillRoll()) {
        delta = -randInt(6, 10);
        text = "The consultants found you a sympathetic jury.";
        tone = "good";
      } else {
        delta = randInt(2, 5);
        text = "The pool ran hostile no matter how they cut it.";
        tone = "bad";
      }
      break;
    }
    case "tamper": {
      cr.heat = clamp(cr.heat + 5);
      if (c.politics) c.politics.scandalRisk = clamp(c.politics.scandalRisk + 10, 0, 100);
      if (randInt(1, 100) <= 75) {
        delta = -randInt(20, 28);
        text = "Juror number seven won't be a problem.";
        tone = "good";
      } else {
        t.evidence = 95;
        t.severity = Math.min(10, t.severity + 2);
        t.stage = "closing";
        const msg2 =
          "CAUGHT: the tampering surfaced mid-trial. New charges, furious judge, case all but lost.";
        t.courtLog.push(msg2);
        c.log.push({ age: c.age, text: msg2, tone: "bad" });
        return { character: c, message: msg2, tone: "bad", ok: true };
      }
      break;
    }
    case "cross": {
      if (skillRoll()) {
        delta = -randInt(10, 15);
        text = "The witness's story fell apart under cross-examination.";
        tone = "good";
      } else {
        delta = randInt(4, 8);
        text = "The witness held firm — and the jury liked them more for it.";
        tone = "bad";
      }
      break;
    }
    case "object":
      delta = -randInt(3, 5);
      text = "Half the testimony died in objections.";
      tone = "good";
      break;
    case "suppress": {
      if (skillRoll()) {
        delta = -randInt(16, 24);
        text = "GRANTED. The key evidence is out — the prosecution is gutted.";
        tone = "milestone";
      } else {
        delta = randInt(0, 3);
        text = "Motion denied. The judge was not amused.";
      }
      break;
    }
    case "pass":
      delta = randInt(3, 6);
      text = "The testimony sat with the jury, unanswered.";
      tone = "bad";
      break;
    case "testify": {
      if (randInt(1, 100) <= 35 + c.stats.smarts * 0.35 + c.stats.looks * 0.1) {
        delta = -randInt(12, 18);
        text = "You told your story and the jury believed you.";
        tone = "good";
      } else {
        delta = randInt(10, 16);
        text = "The prosecutor took you apart on the stand, sentence by sentence.";
        tone = "bad";
      }
      break;
    }
    case "alibi": {
      const loyalty = cr.crew.length
        ? cr.crew.reduce((s2, m) => s2 + m.loyalty, 0) / cr.crew.length
        : 25;
      if (randInt(1, 100) <= 25 + loyalty * 0.6) {
        delta = -randInt(8, 13);
        text = "The alibi held together under pressure.";
        tone = "good";
      } else {
        delta = randInt(5, 10);
        text = "An alibi witness cracked. It looked worse than no alibi at all.";
        tone = "bad";
      }
      break;
    }
    case "rest":
      delta = -randInt(2, 4);
      text = "You rested. Let them carry the burden of proof.";
      break;
    case "emotion": {
      if (randInt(1, 100) <= 35 + c.stats.looks * 0.3 + power) {
        delta = -randInt(6, 10);
        text = "Two jurors were visibly moved.";
        tone = "good";
      } else {
        delta = randInt(1, 4);
        text = "The appeal read as theater.";
      }
      break;
    }
    case "doubt":
      delta = -Math.round(3 + power / 4);
      text = "A cold, clean dissection of every gap in their case.";
      tone = "good";
      break;
  }

  t.evidence = clamp(t.evidence + delta, 5, 98);
  t.offeredPleaYears = currentPleaOffer(c);
  t.courtLog.push(`${STAGE_TITLES[t.stage]}: ${text} (evidence ${delta >= 0 ? "+" : ""}${delta})`);
  c.log.push({ age: c.age, text: `${STAGE_TITLES[t.stage]} — ${text}`, tone });

  const order: TrialStage[] = ["interrogation", "jury", "witness", "defense", "closing"];
  const idx = order.indexOf(t.stage);
  if (idx < order.length - 1) {
    t.stage = order[idx + 1];
    return { character: c, message: text, tone, ok: true };
  }
  return verdict(c, cr);
}

function verdict(c: Character, cr: CrimeState): CrimeResult {
  const t = cr.trial!;
  const convicted = randInt(1, 100) <= trialConvictionChance(c);
  const charge = t.charge;
  const severity = t.severity;
  cr.trial = undefined;
  if (!convicted) {
    cr.heat = clamp(cr.heat - 5);
    const msg = `NOT GUILTY on all counts of ${charge.toLowerCase()}. You walked out the front door into the cameras.`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  c.criminalRecord += 1;
  const years = Math.max(1, Math.round(severity * (0.8 + randInt(0, 60) / 100)));
  sendToPrison(c, cr, years, severity);
  const msg = `GUILTY. ${years} year${years > 1 ? "s" : ""} for ${charge.toLowerCase()}. The gavel sounds different when it's for you.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function takePlea(input: Character): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const t = cr.trial;
  if (!t) return fail(input, "No case to plead out.");
  const years = currentPleaOffer(c);
  cr.trial = undefined;
  c.criminalRecord += 1;
  sendToPrison(c, cr, years, t.severity);
  const msg = `You took the plea: ${years} year${years > 1 ? "s" : ""}. Predictable beats catastrophic.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function turnInformant(input: Character): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const t = cr.trial;
  if (!t) return fail(input, "No charges to trade against.");
  if (t.stage !== "interrogation") return fail(input, "That window closed when the trial began.");
  if (!cr.syndicate) return fail(input, "You have nobody to inform on.");
  cr.trial = undefined;
  cr.informant = true;
  const family = cr.syndicate;
  cr.syndicate = undefined;
  cr.rank = undefined;
  cr.rackets = 0;
  cr.crew = [];
  c.criminalRecord += 1;
  const msg = `You flipped on the ${family}. Charges reduced to time served — and a target painted on your back.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Heists (severity 7+ jobs play out in steps) ----------

export type HeistApproach = "stealth" | "loud" | "inside";

export const APPROACHES: Record<
  HeistApproach,
  { label: string; odds: number; heat: number; payout: number }
> = {
  stealth: { label: "Ghost it — in and out unseen", odds: 0, heat: -4, payout: 0.85 },
  loud: { label: "Go in loud and fast", odds: -8, heat: 8, payout: 1.25 },
  inside: { label: "Work an inside contact", odds: 10, heat: 0, payout: 0.75 },
};

interface ComplicationOption {
  label: string;
  text: string;
  tone: LogTone;
  oddsDelta?: number;
  payoutMult?: number;
  heatUp?: number;
  severityUp?: number;
  risky?: boolean;
  abort?: boolean;
}

const COMPLICATIONS: { title: string; description: string; options: ComplicationOption[] }[] = [
  {
    title: "Silent Alarm",
    description:
      "Halfway in, a panel light blinks. Someone tripped a silent alarm — you have minutes, not hours.",
    options: [
      {
        label: "Grab what's in reach and go",
        text: "Half the score, all of your freedom.",
        tone: "neutral",
        oddsDelta: 12,
        payoutMult: 0.5,
      },
      {
        label: "Finish the job on the clock",
        text: "You worked the vault while the sirens grew.",
        tone: "neutral",
        oddsDelta: -12,
        payoutMult: 1.0,
        risky: true,
      },
      {
        label: "Abort completely",
        text: "Empty hands, clean record. The crew grumbled all the way home.",
        tone: "neutral",
        abort: true,
      },
    ],
  },
  {
    title: "The Guard Who Wasn't on the Schedule",
    description:
      "A guard rounds the corner — nobody's intel had him there. He hasn't seen your face. Yet.",
    options: [
      {
        label: "Slip past and keep working",
        text: "You became furniture until he passed.",
        tone: "neutral",
        oddsDelta: -5,
        payoutMult: 1.0,
      },
      {
        label: "Have the crew restrain him quietly",
        text: "Zip ties and apologies. He'll be fine and furious.",
        tone: "neutral",
        oddsDelta: 5,
        payoutMult: 1.0,
        severityUp: 1,
      },
      {
        label: "Abort completely",
        text: "Not worth a witness. You melted away.",
        tone: "neutral",
        abort: true,
      },
    ],
  },
  {
    title: "The Safe Is Newer Than the Blueprints",
    description:
      "The model was upgraded last month. Your safecracker exhales slowly and asks how much time you can buy.",
    options: [
      {
        label: "Buy the time — trust the cracker",
        text: "Twenty extra minutes of pure sweat, and then the click.",
        tone: "neutral",
        oddsDelta: -8,
        payoutMult: 1.1,
        risky: true,
      },
      {
        label: "Drill it fast and dirty",
        text: "Loud, crude, effective — and everyone within a block heard it.",
        tone: "neutral",
        oddsDelta: 0,
        payoutMult: 0.9,
        heatUp: 6,
      },
      {
        label: "Abort completely",
        text: "The safe wins this round.",
        tone: "neutral",
        abort: true,
      },
    ],
  },
];

/** Big jobs create a heist-in-progress; resolveHeist finishes it. */
export function startHeist(
  input: Character,
  jobId: string,
  approach: HeistApproach,
  spend: Spend,
): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const job = CRIME_JOBS.find((j) => j.id === jobId);
  if (!job || job.severity < 7) return fail(input, "That's not a heist-scale job.");
  if (cr.heist) return fail(input, "You're already mid-job.");
  if (cr.prison || cr.trial) return fail(input, "Handle your legal situation first.");
  if (c.age < job.minAge) return fail(input, `Too young for that (${job.minAge}+).`);
  if (cr.notoriety < job.minNotoriety)
    return fail(input, `Nobody trusts you with that yet (needs ${job.minNotoriety} notoriety).`);
  if (job.needsSyndicate && !cr.syndicate)
    return fail(input, "That's syndicate work. Get connected first.");
  if (cr.crew.length < job.needsCrew)
    return fail(input, `You need a crew of ${job.needsCrew} for that.`);
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  cr.active = true;
  cr.leftTheLife = false;
  if (!cr.rank) cr.rank = "petty";
  const comp = randItem(COMPLICATIONS);
  cr.heist = {
    jobId,
    approach,
    title: comp.title,
    description: comp.description,
    options: comp.options.map((o) => ({
      label: o.label,
      text: o.text,
      tone: o.tone,
      risky: o.risky,
    })),
  };
  const msg = `The ${job.label.toLowerCase()} is ON. Then: ${comp.title}. Decision needed in the Crime hub.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function resolveHeist(input: Character, optionIndex: number): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const h = cr.heist;
  if (!h) return fail(input, "No heist in progress.");
  const job = CRIME_JOBS.find((j) => j.id === h.jobId)!;
  const comp = COMPLICATIONS.find((x) => x.title === h.title)!;
  const opt = comp.options[optionIndex];
  if (!opt) return fail(input, "Not an option.");
  cr.heist = undefined;

  if (opt.abort) {
    cr.heat = clamp(cr.heat + 2);
    for (const m of cr.crew) m.loyalty = clamp(m.loyalty - randInt(2, 5));
    const msg = `${opt.text} (Crew loyalty dipped — they wanted the payday.)`;
    c.log.push({ age: c.age, text: msg, tone: "neutral" });
    return { character: c, message: msg, tone: "neutral", ok: true };
  }

  const ap = APPROACHES[h.approach];
  cr.crimesCommitted += 1;
  const chance = clamp(jobSuccessChance(c, job) + ap.odds + (opt.oddsDelta ?? 0), 5, 95);
  const roll = randInt(1, 100);
  const severity = job.severity + (opt.severityUp ?? 0);

  if (roll <= chance) {
    const take = randInt(job.payout[0], job.payout[1]) * ap.payout * (opt.payoutMult ?? 1);
    const cut = cr.syndicate && job.needsSyndicate ? 0.7 : 1;
    const yours = Math.round(take * cut);
    cr.dirtyMoney += yours;
    cr.heat = clamp(cr.heat + randInt(job.heat[0], job.heat[1]) + ap.heat + (opt.heatUp ?? 0));
    cr.notoriety = clamp(cr.notoriety + randInt(job.notoriety[0], job.notoriety[1]) + 2);
    for (const m of cr.crew) m.loyalty = clamp(m.loyalty + randInt(2, 6));
    const msg = `${opt.text} THE SCORE LANDED: $${yours.toLocaleString()} in dirty money.${cut < 1 ? " The family took its cut." : ""}`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }

  const caught = randInt(1, 100) <= job.catchBase + cr.heat * 0.3 + (opt.risky ? 12 : 0);
  cr.heat = clamp(cr.heat + randInt(job.heat[0], job.heat[1]) + 6);
  if (!caught) {
    const msg = `${opt.text} But the job collapsed — you scattered empty-handed, hearts pounding.`;
    c.log.push({ age: c.age, text: msg, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  cr.timesCaught += 1;
  cr.trial = makeTrial(job.label, severity, clamp(45 + randInt(0, 30) + cr.heat * 0.2, 20, 95));
  const msg = `${opt.text} Then the lights: BUSTED at the scene. You're in the interrogation room.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

// ---------- Prison ----------

const FACILITIES = ["Blackgate", "Iron Ridge", "Meadowbrook", "Fort Sanders", "Cold Harbor"];

function sendToPrison(c: Character, cr: CrimeState, years: number, severity: number) {
  const security: PrisonState["security"] =
    c.age < 18 ? "juvenile" : severity >= 8 ? "maximum" : severity >= 5 ? "medium" : "minimum";
  const sentence = c.age < 18 ? Math.min(years, 2) : years;
  cr.prison = {
    facility: `${randItem(FACILITIES)} ${security === "juvenile" ? "Juvenile Center" : "Correctional"}`,
    security,
    sentence,
    yearsServed: 0,
    respect: clamp(10 + cr.notoriety / 3),
    behavior: 60,
    gangAffiliated: false,
    paroleHearingsFailed: 0,
  };
  // The outside world doesn't wait.
  if (c.job) {
    c.log.push({
      age: c.age,
      text: `You were fired from ${c.job.company} the day of your conviction.`,
      tone: "bad",
    });
    c.job = undefined;
  }
  if (c.politics?.office) {
    c.log.push({
      age: c.age,
      text: `You were removed from office as ${c.politics.office.name} in disgrace.`,
      tone: "bad",
    });
    c.politics.office = undefined;
    c.politics.cabinet = [];
    c.politics.approval = clamp(c.politics.approval - 25);
    c.politics.publicTrust = clamp(c.politics.publicTrust - 30);
  }
  if (c.politics?.campaign) {
    c.politics.campaign = undefined;
    c.log.push({ age: c.age, text: "Your campaign collapsed with the conviction.", tone: "bad" });
  }
}

export type PrisonAction = "behave" | "workout" | "study" | "joinGang" | "respect" | "escape";

export function prisonAction(input: Character, action: PrisonAction, spend: Spend): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const p = cr.prison;
  if (!p) return fail(input, "You're not in prison.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  switch (action) {
    case "behave": {
      const gain = randInt(8, 15);
      p.behavior = clamp(p.behavior + gain);
      p.respect = clamp(p.respect - randInt(0, 3));
      const msg = `A quiet year: work detail, no trouble. Behavior +${gain}.`;
      c.log.push({ age: c.age, text: msg, tone: "good" });
      return { character: c, message: msg, tone: "good", ok: true };
    }
    case "workout": {
      c.stats.health = clamp(c.stats.health + randInt(3, 6));
      p.respect = clamp(p.respect + randInt(4, 8));
      const msg = "The yard weights became your religion. Health and respect up.";
      c.log.push({ age: c.age, text: msg, tone: "good" });
      return { character: c, message: msg, tone: "good", ok: true };
    }
    case "study": {
      c.stats.smarts = clamp(c.stats.smarts + randInt(2, 5));
      p.behavior = clamp(p.behavior + randInt(4, 8));
      const msg = "You spent the year in the prison library and classes. Smarts and behavior up.";
      c.log.push({ age: c.age, text: msg, tone: "good" });
      return { character: c, message: msg, tone: "good", ok: true };
    }
    case "joinGang": {
      if (p.gangAffiliated) return fail(input, "You're already affiliated.");
      p.gangAffiliated = true;
      p.respect = clamp(p.respect + randInt(15, 25));
      p.behavior = clamp(p.behavior - randInt(10, 18));
      cr.notoriety = clamp(cr.notoriety + randInt(3, 6));
      const msg = "You took the patch. Protected now — and marked forever in the system.";
      c.log.push({ age: c.age, text: msg, tone: "neutral" });
      return { character: c, message: msg, tone: "neutral", ok: true };
    }
    case "respect": {
      const won = randInt(1, 100) <= 40 + c.stats.health * 0.3 + p.respect * 0.2;
      if (won) {
        p.respect = clamp(p.respect + randInt(10, 18));
        const msg = "You stood your ground in the yard. Nobody tests you now.";
        c.log.push({ age: c.age, text: msg, tone: "good" });
        return { character: c, message: msg, tone: "good", ok: true };
      }
      c.stats.health = clamp(c.stats.health - randInt(5, 12));
      p.behavior = clamp(p.behavior - randInt(5, 10));
      const msg = "The fight went badly. Infirmary, then solitary.";
      c.log.push({ age: c.age, text: msg, tone: "bad" });
      return { character: c, message: msg, tone: "bad", ok: true };
    }
    case "escape": {
      const chance = clamp(
        18 +
          c.stats.smarts * 0.15 +
          (p.security === "minimum" ? 15 : p.security === "medium" ? 0 : -10),
        3,
        45,
      );
      if (randInt(1, 100) <= chance) {
        cr.prison = undefined;
        cr.heat = 100;
        cr.notoriety = clamp(cr.notoriety + 15);
        const msg =
          "YOU'RE OUT. Over the wire, into legend — every cop in the state has your face.";
        c.log.push({ age: c.age, text: msg, tone: "milestone" });
        return { character: c, message: msg, tone: "milestone", ok: true };
      }
      p.behavior = clamp(p.behavior - 30);
      p.sentence += 2;
      const msg = "Caught at the fence. Two years added, privileges gone.";
      c.log.push({ age: c.age, text: msg, tone: "bad" });
      return { character: c, message: msg, tone: "bad", ok: true };
    }
  }
}

export function requestParole(input: Character): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const p = cr.prison;
  if (!p) return fail(input, "You're not in prison.");
  if (p.yearsServed < Math.ceil(p.sentence / 2))
    return fail(
      input,
      `Parole eligibility starts at half your sentence (${Math.ceil(p.sentence / 2)} yr).`,
    );
  const chance = clamp(
    20 + p.behavior * 0.5 - p.paroleHearingsFailed * 8 - (p.gangAffiliated ? 15 : 0),
    5,
    85,
  );
  if (randInt(1, 100) <= chance) {
    release(c, cr, "paroled");
    const msg = "The board granted parole. You walked out early — stay clean, they said.";
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  p.paroleHearingsFailed += 1;
  const msg = "Parole denied. The board wasn't convinced.";
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

function release(c: Character, cr: CrimeState, how: string) {
  cr.totalYearsServed += cr.prison?.yearsServed ?? 0;
  cr.prison = undefined;
  cr.heat = clamp(cr.heat - 25);
}

// ---------- Dramatic events ----------

function crimeEvent(cr: CrimeState, c: Character): BizEvent | null {
  const pool: BizEvent[] = [];
  if (cr.syndicate) {
    pool.push({
      id: `betrayal-${uid()}`,
      title: "An Associate Is Talking",
      description: `Word inside the ${cr.syndicate}: someone close to you has been meeting with detectives.`,
      options: [
        {
          label: "Feed them false information and expose them",
          text: "The rat surfaced chasing your bait. The family handled it; you kept your hands clean.",
          tone: "good",
        },
        {
          label: "Confront them directly",
          text: "They panicked and skipped town. The leak is plugged, messily.",
          tone: "neutral",
        },
        {
          label: "Go to the boss and let him decide",
          text: "You kicked it upstairs. The boss noted your loyalty — and your lack of initiative.",
          tone: "neutral",
        },
      ],
    });
    pool.push({
      id: `rival-${uid()}`,
      title: "Rivals Threaten Your Family",
      description:
        "A rival organization sent a message through your family: photos of your relatives, taken from close range.",
      options: [
        {
          label: "Go to the police",
          text: "Protection was arranged quietly. The syndicate saw it as weakness; your family slept safely.",
          tone: "neutral",
        },
        {
          label: "Pay for their silence",
          text: "Money bought peace, this time. Extortion never retires.",
          tone: "bad",
        },
        {
          label: "Hire private security",
          text: "Professionals now shadow your family. Expensive, effective.",
          tone: "neutral",
        },
        {
          label: "Use your connections to negotiate a truce",
          text: "Cooler heads met in a diner at 2am. The truce held.",
          tone: "good",
        },
      ],
    });
  }
  pool.push({
    id: `investigation-${uid()}`,
    title: "Detectives Are Circling",
    description:
      "An unmarked car has been outside your place for a week. A task force is building a file on you.",
    options: [
      {
        label: "Shred everything and go quiet",
        text: "By the time they came with warrants, there was nothing to find.",
        tone: "good",
      },
      { label: "Carry on as normal", text: "Bold. The file got thicker.", tone: "bad" },
      {
        label: "Have a lawyer send them a message",
        text: "The harassment complaints slowed them down — and confirmed you're worth watching.",
        tone: "neutral",
      },
    ],
  });
  return pool.length ? randItem(pool) : null;
}

export function resolveCrimeEvent(input: Character, optionIndex: number): CrimeResult {
  const c = structuredClone(input);
  const cr = ensureCrime(c);
  const ev = cr.pendingEvent;
  const opt = ev?.options[optionIndex];
  if (!ev || !opt) return fail(input, "No event pending.");
  cr.pendingEvent = undefined;

  // Effects are keyed off the event id + option semantics.
  if (ev.id.startsWith("betrayal")) {
    if (optionIndex === 0) cr.heat = clamp(cr.heat - 8);
    if (optionIndex === 1) cr.notoriety = clamp(cr.notoriety + 3);
    if (optionIndex === 2) cr.heat = clamp(cr.heat - 4);
  } else if (ev.id.startsWith("rival")) {
    if (optionIndex === 0) {
      cr.heat = clamp(cr.heat + 5);
      cr.notoriety = clamp(cr.notoriety - 5);
    }
    if (optionIndex === 1) {
      const cost = Math.min(c.money + cr.dirtyMoney, 50000);
      const fromDirty = Math.min(cr.dirtyMoney, cost);
      cr.dirtyMoney -= fromDirty;
      c.money -= cost - fromDirty;
    }
    if (optionIndex === 2) c.money -= Math.min(c.money, 25000);
    if (optionIndex === 3) cr.notoriety = clamp(cr.notoriety + 4);
  } else if (ev.id.startsWith("investigation")) {
    if (optionIndex === 0) cr.heat = clamp(cr.heat - 15);
    if (optionIndex === 1) cr.heat = clamp(cr.heat + 10);
    if (optionIndex === 2) cr.heat = clamp(cr.heat - 6);
  }
  c.log.push({ age: c.age, text: `${ev.title} — ${opt.text}`, tone: opt.tone });
  return { character: c, message: opt.text, tone: opt.tone, ok: true };
}

// ---------- Yearly ----------

export function advanceCrime(c: Character, log: LogEntry[]) {
  const cr = c.crime;
  if (!cr) return;

  // Prison years tick first.
  if (cr.prison) {
    const p = cr.prison;
    p.yearsServed += 1;
    c.stats.happiness = clamp(c.stats.happiness - randInt(3, 8));
    // Yard incidents.
    if (Math.random() < 0.3) {
      if (p.respect < 40 && Math.random() < 0.5) {
        c.stats.health = clamp(c.stats.health - randInt(4, 10));
        log.push({
          age: c.age,
          text: "You were jumped in the yard. Low respect makes you a target.",
          tone: "bad",
        });
      } else if (p.gangAffiliated && Math.random() < 0.4) {
        p.behavior = clamp(p.behavior - randInt(5, 12));
        log.push({
          age: c.age,
          text: "A gang war swept the block. You were confined with the rest of your patch.",
          tone: "bad",
        });
      } else {
        p.respect = clamp(p.respect + randInt(2, 5));
        log.push({
          age: c.age,
          text: "Another year inside. You know the rhythms of this place now.",
          tone: "neutral",
        });
      }
    }
    // Informants get found, even inside.
    if (cr.informant && Math.random() < 0.15) {
      c.stats.health = clamp(c.stats.health - randInt(10, 25));
      log.push({
        age: c.age,
        text: "Someone recognized you from the trial. The attack came fast; the guards came slow.",
        tone: "bad",
      });
    }
    if (p.yearsServed >= p.sentence) {
      release(c, cr, "served");
      log.push({
        age: c.age,
        text: `Released from ${p.facility} — sentence served. The gate closed behind you.`,
        tone: "milestone",
      });
    }
    return; // nothing else advances while inside
  }

  // Rackets pay, and burn.
  if (cr.rackets > 0) {
    const income = cr.rackets * randInt(15000, 40000);
    cr.dirtyMoney += income;
    cr.heat = clamp(cr.heat + cr.rackets * randInt(1, 3));
    log.push({
      age: c.age,
      text: `Your rackets kicked up $${income.toLocaleString()} in dirty money.`,
      tone: "neutral",
    });
  }

  // Heat cools if you're quiet; too hot triggers an investigation.
  cr.heat = clamp(cr.heat - randInt(3, 6));
  if (cr.heat >= 70 && Math.random() < 0.4 && !cr.trial) {
    const evidence = clamp(30 + cr.heat * 0.4 + randInt(-10, 10), 20, 90);
    cr.trial = makeTrial(
      "Racketeering",
      Math.min(9, 3 + Math.floor(cr.rackets / 2) + Math.floor(cr.notoriety / 25)),
      evidence,
    );
    log.push({
      age: c.age,
      text: "Dawn raid. A task force finally moved — you're charged and heading to trial.",
      tone: "bad",
    });
  }

  // Crew loyalty drifts; disloyal crew leak.
  for (const m of [...cr.crew]) {
    m.loyalty = clamp(m.loyalty + randInt(-4, 2));
    if (m.loyalty < 20) {
      cr.crew = cr.crew.filter((x) => x.id !== m.id);
      cr.heat = clamp(cr.heat + 8);
      log.push({
        age: c.age,
        text: `${m.name} vanished — and your heat jumped. Draw your own conclusions.`,
        tone: "bad",
      });
    }
  }

  // Informants live dangerous lives outside too.
  if (cr.informant && Math.random() < 0.1) {
    c.stats.health = clamp(c.stats.health - randInt(8, 20));
    log.push({
      age: c.age,
      text: "They found you. You survived the message; you won't forget it.",
      tone: "bad",
    });
  }

  // Dramatic events for active criminals.
  if (cr.active && !cr.pendingEvent && !cr.trial && Math.random() < 0.25) {
    const ev = crimeEvent(cr, c);
    if (ev) {
      cr.pendingEvent = ev;
      log.push({
        age: c.age,
        text: `${ev.title} — a decision is waiting in the Crime hub.`,
        tone: "neutral",
      });
    }
  }

  // Time heals reputations for those who left the life clean.
  if (cr.leftTheLife) {
    cr.notoriety = clamp(cr.notoriety - 3);
    cr.heat = clamp(cr.heat - 4);
  }
}

export function isInPrison(c: Character): boolean {
  return !!c.crime?.prison;
}
