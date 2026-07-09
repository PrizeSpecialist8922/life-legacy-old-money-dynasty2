import type {
  AllowanceKind,
  BizEvent,
  Character,
  ChildRecord,
  ConsultantKind,
  LogEntry,
  LogTone,
  Relationship,
  SchoolingKind,
} from "./types";
import { clamp, randInt, randItem } from "./util";

// ---------------------------------------------------------------------------
// The Upbringing Machine (Build 16). You don't play the child — you shape
// them, with money (buys quality), your energy (buys connection), and choices
// you'll answer for at the reading of the will. Three hidden meters —
// affection, respect, resentment — decide everything that matters, and only
// the psychologist can read them.
// ---------------------------------------------------------------------------

export interface UpbringingResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): UpbringingResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

type Spend = (c: Character) => boolean;

export function ensureChildren(c: Character): ChildRecord[] {
  if (!c.children) c.children = [];
  // Backfill records for children born before Build 16.
  for (const r of c.relationships) {
    if (r.type === "child" && r.alive && !c.children.some((k) => k.relId === r.id)) {
      c.children.push({
        relId: r.id,
        affection: clamp(50 + Math.round(r.relationship / 4)),
        respect: 40,
        resentment: 10,
        academics: clamp(30 + randInt(0, 20)),
        discipline: clamp(30 + randInt(0, 20)),
        worldliness: clamp(20 + randInt(0, 20)),
        grit: clamp(30 + randInt(0, 20)),
        spoiled: 20,
        affinities: {},
        taughtSkills: [],
        consultants: [],
        responsibilityLevel: 0,
        responsibilitiesDone: [],
        rebellions: 0,
        rebellionsCrushed: 0,
        allowance: "none",
        coveredIncidents: 0,
        parentActionsThisYear: 0,
        yearsNeglected: 0,
      });
    }
  }
  return c.children;
}

export function childRel(c: Character, relId: string): Relationship | undefined {
  return c.relationships.find((r) => r.id === relId && r.type === "child");
}

export function childRecord(c: Character, relId: string): ChildRecord | undefined {
  return ensureChildren(c).find((k) => k.relId === relId);
}

// ---------- Schooling ----------

export const SCHOOLS: Record<SchoolingKind, { label: string; fee: number; blurb: string }> = {
  public: { label: "Public School", fee: 0, blurb: "Free, loud, real. They'll meet everyone." },
  private: { label: "Private Day School", fee: 30000, blurb: "Academics and the right playdates." },
  tutors: {
    label: "Governess & Tutors at Home",
    fee: 90000,
    blurb: "Total control, zero peers. Lonely excellence.",
  },
  boarding: {
    label: "Boarding School",
    fee: 70000,
    blurb: "The old-money forge. They come back a stranger.",
  },
  military: {
    label: "Military Academy",
    fee: 45000,
    blurb: "Discipline by force. Salvage, at a price.",
  },
  academy: {
    label: "Sports/Arts Academy",
    fee: 60000,
    blurb: "The pipeline. Champions are made at twelve.",
  },
};

export function setSchooling(
  input: Character,
  relId: string,
  kind: SchoolingKind,
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (r.age < 4 || r.age >= 18) return fail(input, "Schooling decisions run ages 4–17.");
  if (k.schooling === kind) return fail(input, `Already enrolled: ${SCHOOLS[kind].label}.`);
  if ((kind === "boarding" || kind === "military" || kind === "academy") && r.age < 11)
    return fail(input, "That path starts at 11.");
  if (c.money < SCHOOLS[kind].fee)
    return fail(
      input,
      `First year's fees are $${SCHOOLS[kind].fee.toLocaleString()}. You don't have it.`,
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  c.money -= SCHOOLS[kind].fee;
  k.schooling = kind;
  k.parentActionsThisYear += 1;
  let msg = `${r.name} enrolled: ${SCHOOLS[kind].label}.`;
  if (kind === "boarding") {
    k.affection = clamp(k.affection - 8);
    k.resentment = clamp(k.resentment + 6);
    msg += " The car ride to the station was very quiet.";
  }
  if (kind === "military") {
    k.resentment = clamp(k.resentment + 12);
    msg +=
      " They didn't look back when they walked through the gates. That was the point, wasn't it?";
  }
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Consultants ----------

export const CONSULTANTS: Record<
  ConsultantKind,
  { label: string; fee: number; blurb: string; dark?: boolean }
> = {
  tutor1: { label: "College-Kid Tutor", fee: 2000, blurb: "+academics, slowly" },
  tutor2: { label: "Professional Tutor", fee: 12000, blurb: "+academics, properly" },
  tutor3: { label: "Test-Prep Machine", fee: 35000, blurb: "+academics, industrially" },
  tutor4: {
    label: "The Don in Residence",
    fee: 80000,
    blurb: "+academics and taste — a pedigree in tweed",
  },
  coach: { label: "Elite Coach", fee: 40000, blurb: "+athletic affinity; champions are staffed" },
  etiquette: { label: "Deportment Governess", fee: 25000, blurb: "Pedigree in human form" },
  admissions: {
    label: "Admissions Consultant",
    fee: 40000,
    blurb: "Essays, interviews, positioning — legal-ish",
  },
  admissionsDark: {
    label: "Full-Service Admissions",
    fee: 500000,
    blurb: "The photos of them 'rowing.' Extremely illegal.",
    dark: true,
  },
  fixerMinor: {
    label: "The Fixer (retainer)",
    fee: 100000,
    blurb: "Their mistakes stop existing. So do their consequences.",
    dark: true,
  },
  psychologist: {
    label: "Child Psychologist",
    fee: 15000,
    blurb: "The only hire who can read what they actually feel",
  },
};

export function hireConsultant(
  input: Character,
  relId: string,
  kind: ConsultantKind,
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (r.age >= 18) return fail(input, "They're an adult. The staffing window has closed.");
  const def = CONSULTANTS[kind];
  if (k.consultants.includes(kind)) return fail(input, `${def.label} is already on the payroll.`);
  if (kind.startsWith("tutor") && k.consultants.some((x) => x.startsWith("tutor")))
    return fail(input, "One tutor at a time — dismiss the current one by hiring better.");
  if (c.money < def.fee)
    return fail(input, `${def.label} wants $${def.fee.toLocaleString()} a year.`);
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  c.money -= def.fee;
  k.consultants = k.consultants.filter((x) => !(kind.startsWith("tutor") && x.startsWith("tutor")));
  k.consultants.push(kind);
  if (def.dark) k.spoiled = clamp(k.spoiled + 8);
  if (kind === "psychologist") k.psychReportAge = c.age;
  const msg = `${def.label} hired for ${r.name} ($${def.fee.toLocaleString()}/yr). ${def.dark ? "Some invoices don't itemize." : ""}`;
  c.log.push({ age: c.age, text: msg, tone: def.dark ? "neutral" : "good" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Teaching them yourself ----------

export interface Teachable {
  id: string;
  label: string;
  available: (c: Character) => boolean;
  affinity: keyof ChildRecord["affinities"] | null;
}

export const TEACHABLES: Teachable[] = [
  {
    id: "tennis",
    label: "Your tennis technique",
    available: (c) => (c.athlete?.skill ?? 0) >= 50,
    affinity: "athlete",
  },
  {
    id: "law",
    label: "Your courtroom instincts",
    available: (c) =>
      (c.crime?.timesCaught ?? 0) > 0 ||
      (c.edu.degrees?.some((d) => d.toLowerCase().includes("law")) ?? false),
    affinity: "law",
  },
  {
    id: "deal",
    label: "How a deal actually closes",
    available: (c) => c.businessReputation >= 30,
    affinity: "business",
  },
  {
    id: "stage",
    label: "How to hold a room",
    available: (c) => c.fame >= 25,
    affinity: "entertainment",
  },
  {
    id: "vote",
    label: "How votes are really counted",
    available: (c) => (c.politics?.highestLevelWon ?? -1) >= 1,
    affinity: "politics",
  },
  {
    id: "books",
    label: "How the books get cooked",
    available: (c) => (c.crime?.crimesCommitted ?? 0) >= 5,
    affinity: "crime",
  },
  { id: "grit", label: "How to lose and get up", available: () => true, affinity: null },
];

export function teachChild(
  input: Character,
  relId: string,
  teachId: string,
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (r.age < 6) return fail(input, "They're still learning to hold a fork.");
  const t = TEACHABLES.find((x) => x.id === teachId);
  if (!t || !t.available(c)) return fail(input, "You can't teach what you don't have.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  k.parentActionsThisYear += 1;
  const receptivity = (k.affection + k.respect) / 2;
  const took = randInt(1, 100) <= 40 + receptivity * 0.5;
  if (took && !k.taughtSkills.includes(t.id)) k.taughtSkills.push(t.id);
  if (t.affinity)
    k.affinities[t.affinity] = clamp((k.affinities[t.affinity] ?? 0) + randInt(8, 15));
  if (t.id === "grit") k.grit = clamp(k.grit + randInt(6, 12));
  if (t.id === "books") {
    k.affection = clamp(k.affection + 8); // dark intimacy
    c.log.push({
      age: c.age,
      text: `You taught ${r.name} how the books get cooked. A secret shared is a bond — and a liability.`,
      tone: "neutral",
    });
  }
  k.affection = clamp(k.affection + randInt(3, 7));
  k.respect = clamp(k.respect + (took ? randInt(4, 8) : randInt(0, 2)));
  const msg = took
    ? `You spent the year teaching ${r.name}: ${t.label.toLowerCase()}. It took — you can see it in how they move.`
    : `You taught ${r.name} ${t.label.toLowerCase()}. Some of it landed. The hours together landed more.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function bringAlong(input: Character, relId: string, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (r.age < 6 || r.age >= 18) return fail(input, "Take-your-heir-to-work runs ages 6–17.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  k.parentActionsThisYear += 1;
  k.worldliness = clamp(k.worldliness + randInt(4, 8));
  k.affection = clamp(k.affection + randInt(3, 6));
  let where = "your work";
  let aff: keyof ChildRecord["affinities"] | null = null;
  if (c.politics?.office || c.politics?.campaign) {
    where = "the campaign trail";
    aff = "politics";
  } else if (c.athlete?.stage === "pro") {
    where = "your training camp";
    aff = "athlete";
  } else if (c.entertainment) {
    where = "the studio";
    aff = "entertainment";
  } else if (c.businessHub?.businesses.length) {
    where = c.businessHub.businesses[0].name;
    aff = "business";
  } else if (c.crime?.active) {
    where = "'the office'";
    aff = "crime";
  }
  if (aff) k.affinities[aff] = clamp((k.affinities[aff] ?? 0) + randInt(5, 10));
  let msg = `You brought ${r.name} (${r.age}) along to ${where}. They watched everything.`;
  if (aff === "crime" && Math.random() < 0.3) {
    msg += " They asked no questions in the car home. Smart kid. Worrying, that.";
  }
  if (aff === "business" && r.age >= 11 && Math.random() < 0.2 && (c.crime?.dirtyMoney ?? 0) > 0) {
    msg = `You brought ${r.name} to ${where}. They found a discrepancy in the books your accountant missed. Congratulations — and, uh oh.`;
    k.affinities.business = clamp((k.affinities.business ?? 0) + 10);
  }
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Responsibilities: the trust ladder ----------

export interface ResponsibilityDef {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
  blurb: string;
  dark?: boolean;
}

export const RESPONSIBILITIES: ResponsibilityDef[] = [
  {
    id: "chores",
    label: "Chores & structure",
    minAge: 8,
    maxAge: 12,
    blurb: "The first ledger: work, then reward",
  },
  {
    id: "pet",
    label: "A pet of their own",
    minAge: 8,
    maxAge: 12,
    blurb: "Their first consequence with a heartbeat",
  },
  {
    id: "represent",
    label: "Represent the family",
    minAge: 10,
    maxAge: 14,
    blurb: "Small occasions, the family name on small shoulders",
  },
  {
    id: "jobFamily",
    label: "Summer job — inside the empire",
    minAge: 13,
    maxAge: 17,
    blurb: "The register at the family business. Humility, supervised.",
  },
  {
    id: "jobOutside",
    label: "Summer job — a stranger's payroll",
    minAge: 13,
    maxAge: 17,
    blurb: "Work where your name means nothing",
  },
  {
    id: "brokerage",
    label: "Their own brokerage account",
    minAge: 13,
    maxAge: 17,
    blurb: "$10,000 of real money. Watch what a downturn reveals.",
  },
  {
    id: "dowager",
    label: "Care duties for the Dowager",
    minAge: 13,
    maxAge: 17,
    blurb: "She talks while they help. Family lore has a price and a keeper.",
  },
  {
    id: "division",
    label: "Run a division",
    minAge: 16,
    maxAge: 17,
    blurb: "A real piece of the operation. It can really fail.",
  },
  {
    id: "errand",
    label: "The Errand",
    minAge: 16,
    maxAge: 17,
    blurb: "Something deniable. The first time you use them.",
    dark: true,
  },
];

export function giveResponsibility(
  input: Character,
  relId: string,
  respId: string,
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  const def = RESPONSIBILITIES.find((x) => x.id === respId);
  if (!def) return fail(input, "Unknown responsibility.");
  if (r.age < def.minAge || r.age > def.maxAge)
    return fail(input, `That's for ages ${def.minAge}–${def.maxAge}.`);
  if (k.responsibilitiesDone.includes(respId)) return fail(input, "Already survived that rung.");
  if (respId === "brokerage" && c.money < 10000)
    return fail(input, "Their account needs $10,000 seed money.");
  if (respId === "dowager" && !c.dowager?.alive)
    return fail(input, "There is no Dowager to care for.");
  if (
    respId === "division" &&
    !c.businessHub?.businesses.length &&
    !c.crime?.rackets &&
    !c.politics?.campaign
  )
    return fail(input, "You need an operation with a division to hand over.");
  if (respId === "errand" && !c.crime?.active)
    return fail(input, "You have nothing deniable to ask. Keep it that way?");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  k.parentActionsThisYear += 1;
  if (respId === "brokerage") {
    c.money -= 10000;
    k.brokerage = 10000;
  }

  const success = randInt(1, 100) <= 45 + k.discipline * 0.3 + k.grit * 0.2;
  k.responsibilitiesDone.push(respId);
  let msg: string;
  let tone: LogTone;
  if (respId === "errand") {
    k.taughtSkills.push("errand");
    k.affinities.crime = clamp((k.affinities.crime ?? 0) + 15);
    k.respect = clamp(k.respect + 10);
    k.spoiled = clamp(k.spoiled - 10);
    msg = `${r.name} ran the errand. Clean, quiet, no questions. You told yourself it was the last time even as you noted how good they were at it.`;
    tone = "neutral";
  } else if (success) {
    k.responsibilityLevel += 1;
    k.grit = clamp(k.grit + randInt(6, 12));
    k.discipline = clamp(k.discipline + randInt(5, 10));
    k.spoiled = clamp(k.spoiled - randInt(8, 15));
    k.respect = clamp(k.respect + randInt(4, 8));
    msg = `${r.name} handled it: ${def.label.toLowerCase()}. Something in their posture changed.`;
    tone = "good";
  } else {
    if (respId === "division") {
      const loss = randInt(15000, 60000);
      c.money -= Math.min(c.money, loss);
      k.pendingEvent = {
        id: `divfail-${r.id}`,
        title: `${r.name}'s Division Is Failing`,
        description: `The division you handed ${r.name} is $${loss.toLocaleString()} in the hole and they know it. They haven't slept. How do you respond?`,
        options: [
          {
            label: "Quietly rescue it and never mention it",
            text: "You fixed it in a weekend. They noticed. They learned that failure is free.",
            tone: "neutral",
          },
          {
            label: "Let them fix it themselves",
            text: "It took them a brutal year. They fixed it. They will never be the same, in the best way.",
            tone: "good",
          },
          {
            label: "Take it back and let them feel it",
            text: "You removed them without ceremony. The lesson landed; so did the resentment.",
            tone: "bad",
          },
        ],
      };
      msg = `${r.name} is failing at the division — a decision is waiting in the Family tab.`;
      tone = "neutral";
    } else {
      k.grit = clamp(k.grit + randInt(2, 6)); // failure still teaches
      k.resentment = clamp(k.resentment + 3);
      msg = `${r.name} fumbled ${def.label.toLowerCase()}. Cheaper to learn it now than at forty.`;
      tone = "neutral";
    }
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

export function setAllowance(
  input: Character,
  relId: string,
  kind: AllowanceKind,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  k.allowance = kind;
  const flavor: Record<AllowanceKind, string> = {
    none: "No allowance. They'll hustle or they'll ask.",
    unconditional: "Unconditional allowance. Generous. Dangerous.",
    earned: "Allowance earned against chores and grades. A wage before the wage.",
    invested:
      "Allowance paid into their account with interest for what they don't spend. You are breeding a financier.",
  };
  const msg = `${r.name}'s allowance policy: ${flavor[kind]}`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function requestPsychReport(c: Character, relId: string): string | null {
  const k = c.children?.find((x) => x.relId === relId);
  if (!k || !k.consultants.includes("psychologist")) return null;
  const r = childRel(c, relId);
  if (!r) return null;
  const aff =
    k.affection >= 65
      ? "deeply attached to you"
      : k.affection >= 35
        ? "fond of you, guardedly"
        : "distant from you";
  const resp =
    k.respect >= 65
      ? "speaks of you with real admiration"
      : k.respect >= 35
        ? "respects your results more than your methods"
        : "does not, at present, look up to you";
  const resent =
    k.resentment >= 60
      ? "carries significant unexpressed anger — the missed years have a ledger"
      : k.resentment >= 30
        ? "harbors some resentment; it is not yet load-bearing"
        : "shows no significant resentment";
  return `Dr.'s notes on ${r.name}: The child is ${aff}; ${resp}; ${resent}. Spoiling index: ${k.spoiled >= 60 ? "concerning" : k.spoiled >= 35 ? "moderate" : "low"}.`;
}

export function resolveChildEvent(
  input: Character,
  relId: string,
  optionIndex: number,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  const ev = k?.pendingEvent;
  const opt = ev?.options[optionIndex];
  if (!k || !r || !ev || !opt) return fail(input, "No decision pending.");
  k.pendingEvent = undefined;

  if (ev.id.startsWith("divfail")) {
    if (optionIndex === 0) {
      k.spoiled = clamp(k.spoiled + 15);
      k.affection = clamp(k.affection + 5);
    }
    if (optionIndex === 1) {
      k.grit = clamp(k.grit + 20);
      k.respect = clamp(k.respect + 12);
      k.responsibilityLevel += 2;
      k.spoiled = clamp(k.spoiled - 12);
    }
    if (optionIndex === 2) {
      k.resentment = clamp(k.resentment + 15);
      k.discipline = clamp(k.discipline + 8);
    }
  } else if (ev.id.startsWith("rebel")) {
    k.rebellions += 1;
    if (optionIndex === 0) {
      // crush
      k.rebellionsCrushed += 1;
      k.resentment = clamp(k.resentment + randInt(10, 18));
      k.discipline = clamp(k.discipline + 6);
    }
    if (optionIndex === 1) {
      // negotiate
      k.respect = clamp(k.respect + randInt(6, 12));
      k.resentment = clamp(k.resentment - 4);
    }
    if (optionIndex === 2) {
      // permit
      k.affection = clamp(k.affection + randInt(5, 10));
      k.worldliness = clamp(k.worldliness + 6);
      k.discipline = clamp(k.discipline - 4);
    }
    if (optionIndex === 3) {
      // secretly enable
      k.affection = clamp(k.affection + randInt(8, 14));
      k.taughtSkills.push("conspiracy-with-parent");
    }
  } else if (ev.id.startsWith("allowneg")) {
    if (optionIndex === 0) {
      k.respect = clamp(k.respect + 8);
      if (!k.taughtSkills.includes("negotiation")) k.taughtSkills.push("negotiation");
    }
    if (optionIndex === 1) {
      k.discipline = clamp(k.discipline + 5);
      k.resentment = clamp(k.resentment + 4);
    }
    if (optionIndex === 2) {
      k.spoiled = clamp(k.spoiled + 10);
      k.affection = clamp(k.affection + 4);
    }
  } else if (ev.id.startsWith("incident")) {
    if (optionIndex === 0) {
      // fixer cleans it
      k.coveredIncidents += 1;
      k.spoiled = clamp(k.spoiled + 15);
      c.money -= Math.min(c.money, 50000);
    }
    if (optionIndex === 1) {
      // let consequences land
      k.grit = clamp(k.grit + 12);
      k.resentment = clamp(k.resentment + 8);
      k.spoiled = clamp(k.spoiled - 15);
    }
    if (optionIndex === 2) {
      // lawyer, properly
      c.money -= Math.min(c.money, 25000);
      k.discipline = clamp(k.discipline + 4);
    }
  }
  c.log.push({ age: c.age, text: `${r.name}: ${opt.text}`, tone: opt.tone });
  return { character: c, message: opt.text, tone: opt.tone, ok: true };
}

// ---------- The admissions war (age 17) ----------

export function resolveAdmissions(
  input: Character,
  relId: string,
  route: "merit" | "legacy" | "donation" | "fraud",
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (r.age < 17 || k.admissionsResolved)
    return fail(input, "The admissions window is age 17, once.");
  if (
    route === "legacy" &&
    !(c.dynasty?.patronage?.length || (c.dynasty?.pedigree ?? 0) >= 50 || c.dynasty?.almaMaters?.length)
  )
    return fail(input, "Legacy admission needs an endowed institution, an alma mater, or real pedigree.");
  if (route === "donation" && c.money < 2000000)
    return fail(input, "The 'naming opportunity' starts at $2,000,000.");
  if (route === "fraud" && !k.consultants.includes("admissionsDark"))
    return fail(input, "The full-service consultant handles this — hire them first.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  k.admissionsResolved = true;
  let msg: string;
  let tone: LogTone = "good";
  if (route === "merit") {
    const got =
      randInt(1, 100) <= 20 + k.academics * 0.6 + (k.consultants.includes("admissions") ? 15 : 0);
    if (got) {
      k.academics = clamp(k.academics + 10);
      k.respect = clamp(k.respect + 10);
      msg = `${r.name} got in on merit — their own name, their own numbers. Frame the letter.`;
      tone = "milestone";
    } else {
      k.grit = clamp(k.grit + 8);
      msg = `${r.name} was rejected on merit. It stings honestly, which is the only way it should sting.`;
      tone = "neutral";
    }
  } else if (route === "legacy") {
    k.academics = clamp(k.academics + 5);
    k.spoiled = clamp(k.spoiled + 5);
    msg = `${r.name} was admitted — the dean personally mentioned the family's 'long relationship with the institution.'`;
  } else if (route === "donation") {
    c.money -= 2000000;
    k.spoiled = clamp(k.spoiled + 12);
    if (c.dynasty) c.dynasty.pedigree = clamp((c.dynasty.pedigree ?? 0) - 3); // crude money is noticed
    msg = `$2,000,000 later, ${r.name} is admitted and a lecture hall has your name on it. Everyone knows. Nobody says.`;
  } else {
    k.spoiled = clamp(k.spoiled + 15);
    if (Math.random() < 0.15) {
      c.criminalRecord += 0; // charges pending drama without conviction
      if (c.dynasty) c.dynasty.reputation = clamp(c.dynasty.reputation - 20);
      c.fame += 5;
      msg = `THE SCANDAL BROKE: the 'rowing photos' unraveled and the family name is in every paper. ${r.name} knows what you did now. So does everyone.`;
      tone = "bad";
      k.resentment = clamp(k.resentment + 25);
    } else {
      msg = `${r.name} was admitted as a 'recruited athlete' in a sport they've never played. The consultant's invoice read 'college counseling.'`;
      tone = "neutral";
    }
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Cut off (the black sheep) ----------

export function cutOffChild(input: Character, relId: string): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (r.age < 18) return fail(input, "You can't disown a minor. Even old money has lines.");
  if (k.cutOff) return fail(input, "Already done. The portrait already faces the wall.");
  k.cutOff = true;
  k.affection = clamp(k.affection - 40);
  k.resentment = 100;
  if (c.will?.heirId === relId) c.will.heirId = undefined;
  if (c.dynasty) c.dynasty.reputation = clamp(c.dynasty.reputation + 3); // the name, protected
  const msg = `${r.name} is cut off — struck from the will, unspoken at dinners, portrait turned to the wall. The name is protected. The cost is a living enemy with your face.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

// ---------- Yearly ----------

export function advanceUpbringing(c: Character, log: LogEntry[]) {
  const kids = ensureChildren(c);
  for (const k of kids) {
    const r = childRel(c, k.relId);
    if (!r || !r.alive) continue;

    // School fees & growth.
    if (k.schooling && r.age >= 4 && r.age < 18) {
      const school = SCHOOLS[k.schooling];
      if (school.fee > 0) {
        if (c.money >= school.fee) c.money -= school.fee;
        else {
          k.schooling = "public";
          log.push({
            age: c.age,
            text: `The fees for ${r.name}'s school went unpaid. Public school it is — the whispers were free.`,
            tone: "bad",
          });
        }
      }
      const growth: Record<
        string,
        Partial<Record<"academics" | "discipline" | "worldliness" | "grit" | "spoiled", number>>
      > = {
        public: { academics: 3, worldliness: 6, grit: 3, spoiled: -3 },
        private: { academics: 6, discipline: 3, spoiled: 2 },
        tutors: { academics: 9, discipline: 4, worldliness: -2, spoiled: 4 },
        boarding: { academics: 6, discipline: 7, grit: 5, spoiled: -2 },
        military: { discipline: 10, grit: 7, academics: 2, spoiled: -6 },
        academy: { grit: 6, discipline: 5, academics: 1 },
      };
      const g = growth[k.schooling] ?? {};
      k.academics = clamp(k.academics + (g.academics ?? 0) + randInt(-1, 2));
      k.discipline = clamp(k.discipline + (g.discipline ?? 0) + randInt(-1, 2));
      k.worldliness = clamp(k.worldliness + (g.worldliness ?? 0) + randInt(0, 2));
      k.grit = clamp(k.grit + (g.grit ?? 0) + randInt(-1, 1));
      k.spoiled = clamp(k.spoiled + (g.spoiled ?? 0));
      if (k.schooling === "boarding") k.affection = clamp(k.affection - 2);
      if (k.schooling === "academy") k.affinities.athlete = clamp((k.affinities.athlete ?? 0) + 8);
    }

    // Consultant fees & effects.
    for (const kind of [...k.consultants]) {
      const def = CONSULTANTS[kind];
      if (c.money >= def.fee) c.money -= def.fee;
      else {
        k.consultants = k.consultants.filter((x) => x !== kind);
        log.push({
          age: c.age,
          text: `${def.label} resigned over unpaid invoices. Staff talk, you know.`,
          tone: "bad",
        });
        continue;
      }
      if (kind.startsWith("tutor"))
        k.academics = clamp(
          k.academics + { tutor1: 2, tutor2: 4, tutor3: 6, tutor4: 7 }[kind as "tutor1"]!,
        );
      if (kind === "tutor4" && c.dynasty)
        c.dynasty.pedigree = clamp((c.dynasty.pedigree ?? 0) + 0.5);
      if (kind === "coach") k.affinities.athlete = clamp((k.affinities.athlete ?? 0) + 6);
      if (kind === "etiquette" && c.dynasty) {
        c.dynasty.pedigree = clamp((c.dynasty.pedigree ?? 0) + 0.5);
        k.discipline = clamp(k.discipline + 2);
      }
    }

    // Allowance policy effects.
    if (r.age >= 8 && r.age < 18) {
      if (k.allowance === "unconditional") k.spoiled = clamp(k.spoiled + 3);
      if (k.allowance === "earned") {
        k.discipline = clamp(k.discipline + 2);
        k.spoiled = clamp(k.spoiled - 1);
      }
      if (k.allowance === "invested") {
        k.affinities.business = clamp((k.affinities.business ?? 0) + 3);
        k.spoiled = clamp(k.spoiled - 1);
      }
    }

    // Brokerage account rides the market.
    if (k.brokerage !== undefined && k.brokerage > 0) {
      const swing = randInt(-20, 28) / 100;
      k.brokerage = Math.max(0, Math.round(k.brokerage * (1 + swing)));
      if (swing < -0.12) {
        const panicked = k.grit < 45;
        if (panicked) k.brokerage = Math.round(k.brokerage * 0.9);
        log.push({
          age: c.age,
          text: panicked
            ? `The market dropped and ${r.name} panic-sold the bottom. Now you know who they are in a storm. Account: $${k.brokerage.toLocaleString()}.`
            : `The market dropped and ${r.name} bought more. Where did they learn that? (You know exactly where.) Account: $${k.brokerage.toLocaleString()}.`,
          tone: "neutral",
        });
        if (!panicked) k.affinities.business = clamp((k.affinities.business ?? 0) + 8);
      }
    }

    // Connection vs. neglect — the meter that decides the will contest.
    if (r.age >= 4 && r.age < 18) {
      if (k.parentActionsThisYear === 0) {
        k.yearsNeglected += 1;
        k.resentment = clamp(k.resentment + (k.schooling === "boarding" ? 2 : 4));
        k.affection = clamp(k.affection - 2);
        if (k.yearsNeglected === 3)
          log.push({
            age: c.age,
            text: `${r.name} stopped asking when you'd be home. That's not acceptance.`,
            tone: "bad",
          });
      } else {
        k.yearsNeglected = 0;
      }
      k.parentActionsThisYear = 0;
    }

    // Rebellion, 13+.
    if (r.age >= 13 && r.age < 18 && !k.pendingEvent && Math.random() < 0.12 + k.resentment / 400) {
      const rebellions: BizEvent[] = [
        {
          id: `rebel-band-${k.relId}`,
          title: `${r.name} Has a Secret Band`,
          description:
            "You found out from someone else's parent. They're apparently quite good. They didn't tell you.",
          options: [
            {
              label: "Shut it down — school comes first",
              text: "The band ended. The silence at dinner is also a kind of music.",
              tone: "bad",
            },
            {
              label: "Negotiate: grades stay up, band stays",
              text: "A treaty was signed at the kitchen table. Both sides honored it.",
              tone: "good",
            },
            {
              label: "Let them have it",
              text: "You said nothing and went to the show. You stood at the back. They saw you.",
              tone: "good",
            },
            {
              label: "Secretly book them a real venue",
              text: "They never found out it was you. The show was great. Keeping this secret is the fondest thing you own.",
              tone: "good",
            },
          ],
        },
        {
          id: `rebel-ideology-${k.relId}`,
          title: `${r.name} Was at the Protest`,
          description: c.politics?.office
            ? "Against your own bill. There are photos. Your opponents are delighted."
            : "Front row, megaphone, absolutely certain about everything, the way only sixteen can be.",
          options: [
            {
              label: "Forbid it — the family has a position",
              text: "They complied outwardly. You've taught them to hide things from you; curriculum complete.",
              tone: "bad",
            },
            {
              label: "Debate them at dinner, properly",
              text: "Two hours, no quarter given either way. You've never respected each other more.",
              tone: "good",
            },
            {
              label: "Let them find their own politics",
              text: "They're wrong about half of it. So were you at their age. Half is a good ratio.",
              tone: "good",
            },
            {
              label: "Quietly bail out their friend who got arrested",
              text: "They know what you did. Nothing was said. Everything was understood.",
              tone: "good",
            },
          ],
        },
        {
          id: `rebel-romance-${k.relId}`,
          title: `${r.name}'s Unsuitable Romance`,
          description:
            "Wrong side of everything, according to everyone who has an opinion, which is everyone.",
          options: [
            {
              label: "End it with whatever it takes",
              text: "It ended. Something else did too, quietly, between you.",
              tone: "bad",
            },
            {
              label: "Invite them to dinner and actually look",
              text: "You watched them make your child laugh. You revised several opinions over the soup.",
              tone: "good",
            },
            {
              label: "Stay out of it entirely",
              text: "It burned out on its own by spring, as these things do. You aged years not saying anything.",
              tone: "neutral",
            },
            {
              label: "Enable it against the family's wishes",
              text: "You covered for them twice. You're seventeen again yourself and it's wonderful and stupid.",
              tone: "good",
            },
          ],
        },
      ];
      k.pendingEvent = randItem(rebellions);
      log.push({
        age: c.age,
        text: `${k.pendingEvent.title} — a decision waits in the Family tab.`,
        tone: "neutral",
      });
    }

    // The allowance negotiation, annually possible 13+.
    if (
      r.age >= 13 &&
      r.age < 18 &&
      !k.pendingEvent &&
      k.allowance !== "none" &&
      Math.random() < 0.15
    ) {
      k.pendingEvent = {
        id: `allowneg-${k.relId}`,
        title: `${r.name} Requests a Raise`,
        description: `They came prepared: grades printout, chore log, a comparison of 'market rates' among their friends. This is a negotiation and they know it.`,
        options: [
          {
            label: "Hear the case and concede on merits",
            text: "A well-argued case, honestly won. You're training your future adversary and you know it.",
            tone: "good",
          },
          {
            label: "Hold the line — budgets are budgets",
            text: "Denied with reasons. They took notes on your technique, which is somehow worse.",
            tone: "neutral",
          },
          {
            label: "Fold instantly because they're cute",
            text: "You caved in eleven seconds. Somewhere, your own negotiating professor felt a chill.",
            tone: "neutral",
          },
        ],
      };
      log.push({
        age: c.age,
        text: `${r.name} has scheduled a meeting with you. About their allowance. There's a printed agenda.`,
        tone: "neutral",
      });
    }

    // Trouble, 14+: scaled by spoil and low discipline.
    if (
      r.age >= 14 &&
      r.age < 18 &&
      !k.pendingEvent &&
      Math.random() < k.spoiled / 500 + (60 - k.discipline) / 600
    ) {
      k.pendingEvent = {
        id: `incident-${k.relId}`,
        title: `The Call at 2 AM About ${r.name}`,
        description:
          "Nothing unforgivable. Nothing free, either. A car, a party, a police officer with a notepad.",
        options: [
          {
            label: "The Fixer makes it never have happened ($50k)",
            text: "By morning there was no record. They learned consequences are for other people. That lesson compounds.",
            tone: "neutral",
          },
          {
            label: "Let the consequences land in full",
            text: "Community service, a court date, a spring of humility. It was the making of them, though nobody enjoyed it.",
            tone: "good",
          },
          {
            label: "A good lawyer, by the book ($25k)",
            text: "Handled properly, reduced fairly, paid for honestly. The system worked, for those who can afford the system.",
            tone: "neutral",
          },
        ],
      };
      log.push({
        age: c.age,
        text: `The phone rang at 2 AM. It's about ${r.name}. Decision in the Family tab.`,
        tone: "bad",
      });
    }
  }
}

// ---------- Redemption (dark, but repairable) ----------

/** The long work of repair. Damage done can be undone — slowly, in person. */
export function makeAmends(input: Character, relId: string, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (k.resentment < 15 && k.affection > 60)
    return fail(input, "There's nothing to repair. Enjoy that — it's rarer than money.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  k.parentActionsThisYear += 1;
  const sincere = randInt(1, 100) <= 45 + c.stats.smarts * 0.2 + k.affection * 0.3;
  if (sincere) {
    const healed = randInt(10, 18);
    k.resentment = clamp(k.resentment - healed);
    k.affection = clamp(k.affection + randInt(6, 12));
    const msg =
      r.age >= 18
        ? `You said the things out loud — the missed years, the choices, all of it, no lawyer's language. ${r.name} didn't answer right away. Then they stayed for dinner. (resentment −${healed})`
        : `You showed up. Not with a gift — with time, and an apology that named specifics. Children keep exact books; a real entry was made. (resentment −${healed})`;
    c.log.push({ age: c.age, text: msg, tone: "good" });
    return { character: c, message: msg, tone: "good", ok: true };
  }
  k.resentment = clamp(k.resentment - 2);
  const msg = `You tried to make amends with ${r.name}. It came out wrong — half justification, half performance. They noticed. Try again; the trying is also counted.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

/** Reversing a cut-off: the reconciliation. Costly, public, and worth it. */
export function reconcileChild(input: Character, relId: string, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  const k = childRecord(c, relId);
  const r = childRel(c, relId);
  if (!k || !r) return fail(input, "No such child.");
  if (!k.cutOff) return fail(input, "They were never cut off.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  k.cutOff = false;
  k.resentment = clamp(k.resentment - 25);
  k.affection = clamp(k.affection + 20);
  if (c.dynasty?.seat) c.dynasty.seat.housePrestige = clamp(c.dynasty.seat.housePrestige + 2);
  const msg = `The portrait was turned back to face the room, in front of everyone, at ${c.dynasty?.seat?.name ?? "the house"}. ${r.name} came home. The dinner afterward ran four hours and nobody checked a phone.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- The Family Meeting ----------

export type MeetingAgenda = "business" | "grievances" | "succession" | "theMatter";

export function holdFamilyMeeting(
  input: Character,
  agenda: MeetingAgenda,
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const kids = ensureChildren(c).filter((k) => {
    const r = childRel(c, k.relId);
    return r?.alive && r.age >= 13 && !k.cutOff;
  });
  if (kids.length < 2 && !c.dowager?.alive)
    return fail(
      input,
      "A family meeting needs a family — two children of age, or the Dowager presiding.",
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  let msg: string;
  let tone: LogTone = "neutral";
  const airGrievance = Math.random() < 0.3;
  switch (agenda) {
    case "business": {
      for (const k of kids) {
        k.affinities.business = clamp((k.affinities.business ?? 0) + 5);
        k.worldliness = clamp(k.worldliness + 3);
        k.parentActionsThisYear += 1;
      }
      msg =
        "The family council reviewed the year's affairs — numbers on the table, questions allowed, minutes kept. The children saw how the machine runs. That was the point.";
      tone = "good";
      break;
    }
    case "grievances": {
      for (const k of kids) {
        k.resentment = clamp(k.resentment - randInt(5, 10));
        k.affection = clamp(k.affection + randInt(2, 6));
        k.parentActionsThisYear += 1;
      }
      msg =
        "You opened the floor and did not defend yourself. Some of it was hard to hear, which is how you knew it was true. The books between you all got a little more balanced.";
      tone = "good";
      break;
    }
    case "succession": {
      for (const k of kids) k.parentActionsThisYear += 1;
      msg =
        "You spoke plainly about the future — who inherits what, and why, while everyone could still argue about it to your face. Old money calls this hygiene. New money calls it a fight. It was both.";
      const named = c.will?.heirId;
      for (const k of kids) {
        if (k.relId === named) k.respect = clamp(k.respect + 5);
        else k.resentment = clamp(k.resentment + 4);
      }
      break;
    }
    case "theMatter": {
      const sin = c.dynasty?.sin;
      if (!sin?.known)
        return fail(
          input,
          "You can't table what you haven't opened. The room stays locked until someone looks.",
        );
      for (const k of kids) {
        k.parentActionsThisYear += 1;
        k.worldliness = clamp(k.worldliness + 8);
        k.affection = clamp(k.affection + 5);
      }
      sin.exposure = clamp(sin.exposure - 15, 0, 100);
      msg =
        "You told them the family's first chapter — the real one. Silence, then questions, then a strange relief. Secrets held together are lighter, and harder to weaponize.";
      tone = "milestone";
      break;
    }
  }
  if (airGrievance && agenda !== "grievances") {
    const k = randItem(kids);
    const r = childRel(c, k.relId);
    k.resentment = clamp(k.resentment + 3);
    msg += ` (Old business surfaced: ${r?.name} raised something from years ago, unprompted. It's in the minutes now.)`;
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Heir vs. Heir: the Succession Trials ----------

export function stageSuccessionTrials(
  input: Character,
  covert: boolean,
  spend: Spend,
): UpbringingResult {
  const c = structuredClone(input);
  const entries = ensureChildren(c)
    .map((k) => ({ k, r: childRel(c, k.relId) }))
    .filter((x) => x.r?.alive && (x.r?.age ?? 0) >= 14 && !x.k.cutOff);
  if (entries.length < 2) return fail(input, "Trials need at least two contenders of age 14+.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  const scored = entries
    .map(({ k, r }) => ({
      k,
      r: r!,
      score: Math.round(
        k.grit * 0.35 +
          k.discipline * 0.25 +
          k.academics * 0.2 +
          k.worldliness * 0.1 +
          Math.max(0, ...Object.values(k.affinities)) * 0.1 +
          randInt(-8, 8),
      ),
    }))
    .sort((a, b) => b.score - a.score);
  const winner = scored[0];
  const rest = scored.slice(1);

  let msg: string;
  let tone: LogTone = "neutral";
  if (covert) {
    // Staged tests they don't know are tests: the wallet left out, the shortcut offered.
    for (const e of scored) e.k.parentActionsThisYear += 1;
    const discovered = Math.random() < 0.25;
    msg = `The quiet assessments ran all year — the wallet left out, the tempting shortcut, the crisis you could have solved but didn't. Results: ${scored.map((e, i) => `${i + 1}. ${e.r.name} (${e.score})`).join(" · ")}.`;
    if (discovered) {
      for (const e of scored) e.k.resentment = clamp(e.k.resentment + 12);
      msg += ` And then ${randItem(scored).r.name} figured it out, and told the others. Childhood was an assessment center; the conversation about that is now a permanent family fixture.`;
      tone = "bad";
    } else {
      msg +=
        " Nobody suspected. You know things about your children now that they don't know they showed you.";
    }
  } else {
    for (const e of scored) {
      e.k.parentActionsThisYear += 1;
      e.k.grit = clamp(e.k.grit + randInt(4, 9));
      e.k.discipline = clamp(e.k.discipline + randInt(3, 6));
    }
    winner.k.respect = clamp(winner.k.respect + 12);
    winner.k.spoiled = clamp(winner.k.spoiled - 8);
    for (const e of rest) e.k.resentment = clamp(e.k.resentment + randInt(5, 10));
    msg = `THE TRIALS, held openly: each contender given a real charge and a year to run it. Standings — ${scored.map((e, i) => `${i + 1}. ${e.r.name} (${e.score})`).join(" · ")}. ${winner.r.name} emerged different: taller, somehow. The others are keeping their own ledgers.`;
    tone = "good";
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- The Nursery (Build 16.1 — you need a way to HAVE heirs) ----------

/** Try for a baby. Needs a partner; fertility declines with age. */
export function tryForBaby(input: Character, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  const partner = c.relationships.find((x) => x.type === "partner" && x.alive);
  if (!partner)
    return fail(
      input,
      "Dynasties need two founders — find a partner in the Relationships tab first.",
    );
  if (c.age < 18) return fail(input, "Not yet.");
  if (c.age > 50 && partner.age > 50)
    return fail(
      input,
      "That season has passed. The dynasty continues through the children you have.",
    );
  if ((c.children?.filter((k) => childRel(c, k.relId)?.alive).length ?? 0) >= 6)
    return fail(
      input,
      "Six children. The Seat has many rooms, but the will only has so many pages.",
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  const youngest = Math.min(c.age, partner.age);
  const chance = clamp(85 - Math.max(0, youngest - 30) * 4, 10, 85);
  if (randInt(1, 100) > chance) {
    const msg = "No baby this year. These things keep their own calendar.";
    c.log.push({ age: c.age, text: msg, tone: "neutral" });
    return { character: c, message: msg, tone: "neutral", ok: true };
  }
  const surname = c.name.split(" ").slice(-1)[0] ?? "";
  const firstNames = [
    "Alexander",
    "Eleanor",
    "Theodore",
    "Margaret",
    "Henry",
    "Charlotte",
    "Arthur",
    "Beatrice",
    "Frederick",
    "Rosalind",
    "Edmund",
    "Vivienne",
    "James",
    "Cordelia",
    "Oliver",
    "Imogen",
  ];
  const babyName = `${randItem(firstNames)} ${surname}`.trim();
  const rel: Relationship = {
    id: `child-${Date.now()}-${randInt(100, 999)}`,
    name: babyName,
    type: "child",
    relationship: 95,
    age: 0,
    alive: true,
  };
  c.relationships.push(rel);
  ensureChildren(c); // creates the upbringing record
  const k = c.children!.find((x) => x.relId === rel.id)!;
  k.affection = 80;
  k.resentment = 0;
  const msg = `${babyName.toUpperCase()} IS BORN. Eight pounds of dynasty, asleep on your chest, entirely unimpressed by everything you've built. The upbringing starts now — the Family tab is where the next generation is made.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- The Courtship (Build 16.2 — partners must be findable) ----------

const PARTNER_FIRST = [
  "Sam",
  "Alex",
  "Jordan",
  "Morgan",
  "Riley",
  "Casey",
  "Quinn",
  "Avery",
  "Charlie",
  "Rowan",
  "Elliot",
  "Sasha",
  "Jamie",
  "Drew",
  "Blake",
  "Marion",
];
const PARTNER_LAST = [
  "Ashford",
  "Whitmore",
  "Calloway",
  "Vance",
  "Holloway",
  "Bennett",
  "Sinclair",
  "Marchetti",
  "Okafor",
  "Lindqvist",
  "Tanaka",
  "Beaumont",
];

/** Put yourself out there. Looks, networking, and fame all help. */
export function findPartner(input: Character, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  if (c.age < 18) return fail(input, "Focus on school.");
  if (c.relationships.some((x) => x.type === "partner" && x.alive))
    return fail(input, "You have a partner. This button is how scandals start.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const chance = clamp(
    40 + c.stats.looks * 0.25 + (c.networking ?? 0) * 0.15 + Math.min(15, c.fame * 0.3),
    20,
    90,
  );
  if (randInt(1, 100) > chance) {
    const msg =
      "A year of dates that went nowhere in particular. The apps, the setups, the friend-of-a-friend dinners — nothing stuck. Next year.";
    c.log.push({ age: c.age, text: msg, tone: "neutral" });
    return { character: c, message: msg, tone: "neutral", ok: true };
  }
  const name = `${randItem(PARTNER_FIRST)} ${randItem(PARTNER_LAST)}`;
  const rel: Relationship = {
    id: `partner-${Date.now()}`,
    name,
    type: "partner",
    relationship: clamp(50 + randInt(0, 15)),
    age: clamp(c.age + randInt(-4, 4), 18, 90),
    alive: true,
  };
  c.relationships.push(rel);
  const msg = `You met ${name} — and for once, the conversation didn't end when the check came. You're dating now. (Date nights build it; a proposal seals it.)`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

/** Keep the fire lit. Also the only known cure for 'we never talk anymore.' */
export function dateNight(input: Character, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  const p = c.relationships.find((x) => x.type === "partner" && x.alive);
  if (!p) return fail(input, "There's nobody to take to dinner. Find someone first.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const gain = randInt(8, 14);
  p.relationship = clamp(p.relationship + gain);
  c.stats.happiness = clamp(c.stats.happiness + randInt(2, 5));
  const msg = `A real night out with ${p.name} — phones face-down, closing the restaurant. (+${gain} relationship, now ${p.relationship})`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

/** The question. Needs a relationship worth asking about (65+). */
export function propose(input: Character, spend: Spend): UpbringingResult {
  const c = structuredClone(input);
  const p = c.relationships.find((x) => x.type === "partner" && x.alive);
  if (!p) return fail(input, "Propose to whom, exactly?");
  if (p.relationship < 65)
    return fail(
      input,
      `Not yet — ${p.name} would want to be surer (relationship 65+, currently ${p.relationship}).`,
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  if (randInt(1, 100) <= 85) {
    p.relationship = clamp(p.relationship + 15);
    c.stats.happiness = clamp(c.stats.happiness + 10);
    const msg = `${p.name.toUpperCase()} SAID YES. The wedding was ${c.dynasty?.seat ? `at ${c.dynasty.seat.name}, naturally` : "small and perfect"}. The dynasty has its second founder.`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  p.relationship = clamp(p.relationship - 12);
  const msg = `${p.name} said "not yet" — gently, but the ring went back in your pocket. More date nights; ask again when it's undeniable.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}
