import { UNIVERSITIES } from "./data";
import type { UniversityDef } from "./data";
import type { AidLetter, Character, LivingArrangement, Scholarship, StudentLoan } from "./types";
import { randInt } from "./util";

// ---------- Living arrangements ----------

export interface LivingDef {
  id: LivingArrangement;
  label: string;
  housing: number; // annual cost
  happiness: number;
  study: number; // effect on study effectiveness / smarts
  networking: number;
  desc: string;
}

export const LIVING_OPTIONS: LivingDef[] = [
  {
    id: "dorm",
    label: "Dormitory",
    housing: 12000,
    happiness: 3,
    study: 1,
    networking: 5,
    desc: "Classic campus life. Balanced cost and networking.",
  },
  {
    id: "apartment",
    label: "Off-Campus Apartment",
    housing: 16500,
    happiness: 5,
    study: 3,
    networking: 1,
    desc: "More freedom and quiet study, higher rent.",
  },
  {
    id: "parents",
    label: "Live With Parents",
    housing: 2500,
    happiness: -3,
    study: 1,
    networking: -3,
    desc: "Cheapest option, but limited independence and networking.",
  },
  {
    id: "greek",
    label: "Greek Housing",
    housing: 14000,
    happiness: 7,
    study: -3,
    networking: 9,
    desc: "Fraternity/sorority life. Great networking, more distractions.",
  },
];

export function livingDef(id: LivingArrangement): LivingDef {
  return LIVING_OPTIONS.find((l) => l.id === id) ?? LIVING_OPTIONS[0];
}

/** Greek housing only realistically available at higher-prestige schools. */
export function greekAvailable(prestige: number): boolean {
  return prestige >= 55;
}

// ---------- Fixed college cost components ----------

const BOOKS_COST = 1400;

function feesFor(prestige: number): number {
  return Math.round(1600 + prestige * 22); // 1.6k–3.7k
}

/** Private (expensive) schools inflate tuition faster than public ones. */
export function tuitionInflationRate(uni: UniversityDef): number {
  return uni.cost >= 40000 ? 0.05 : 0.03;
}

// ---------- Scholarships ----------

function leadershipScore(c: Character): number {
  const leadershipClubs = ["Student Council", "Model UN"];
  const hasLeadership = c.edu.clubs.some((x) => leadershipClubs.includes(x));
  return (hasLeadership ? 1 : 0) + Math.min(2, Math.floor(c.edu.clubs.length / 2));
}

/**
 * Build the full scholarship set a student qualifies for on admission.
 * Considers GPA, SAT/ACT, awards, leadership, sports, debate and school
 * prestige. Amounts are annual (per year of college).
 */
export function buildScholarships(c: Character): Scholarship[] {
  const out: Scholarship[] = [];
  const sat = c.scores.sat ?? 0;
  const act = c.scores.act ?? 0;
  const testStrong = sat >= 1400 || act >= 31;
  const testGood = sat >= 1200 || act >= 26;
  const prestige = c.edu.schoolPrestige ?? 55;

  // Merit — GPA + test scores
  if (c.gpa >= 3.85 && testStrong) {
    out.push({
      name: "Presidential Merit Scholarship",
      amount: 24000,
      kind: "merit",
      reason: "Top GPA and standardized test scores",
      renewable: true,
      minGpa: 3.5,
      status: "active",
    });
  } else if (c.gpa >= 3.5 && testGood) {
    out.push({
      name: "Dean's Merit Scholarship",
      amount: 14000,
      kind: "merit",
      reason: "Strong GPA and test scores",
      renewable: true,
      minGpa: 3.3,
      status: "active",
    });
  } else if (c.gpa >= 3.0) {
    out.push({
      name: "Academic Merit Grant",
      amount: 6000,
      kind: "merit",
      reason: "Solid academic record",
      renewable: true,
      minGpa: 3.0,
      status: "active",
    });
  }

  // Athletic — sports participation + fitness
  if (c.edu.sports.length >= 1 && c.fitness >= 60) {
    const amount = c.fitness >= 80 ? 18000 : 9000;
    out.push({
      name: "Athletic Scholarship",
      amount,
      kind: "athletic",
      reason: `Recruited athlete (${c.edu.sports[0]})`,
      renewable: true,
      minGpa: 2.5,
      status: "active",
    });
  }

  // Leadership — student council / model UN / many clubs
  if (leadershipScore(c) >= 2) {
    out.push({
      name: "Leadership Scholarship",
      amount: 8000,
      kind: "leadership",
      reason: "Demonstrated student leadership",
      renewable: true,
      minGpa: 3.0,
      status: "active",
    });
  }

  // Debate — debate team + smarts
  if (c.edu.clubs.includes("Debate Team") && c.stats.smarts >= 65) {
    out.push({
      name: "Debate & Forensics Scholarship",
      amount: 7000,
      kind: "debate",
      reason: "Competitive debate achievement",
      renewable: true,
      minGpa: 3.0,
      status: "active",
    });
  }

  // Course rigor — IB Diploma / Honors pathway graduates with strong GPAs
  if (c.edu.pathway === "ib" && c.gpa >= 3.5) {
    out.push({
      name: "IB Diploma Scholarship",
      amount: 10000,
      kind: "merit",
      reason: "IB Diploma Programme graduate with rigorous HL course load",
      renewable: true,
      minGpa: 3.3,
      status: "active",
    });
  } else if (c.edu.pathway === "honors" && c.gpa >= 3.6) {
    out.push({
      name: "Honors Pathway Scholarship",
      amount: 5000,
      kind: "merit",
      reason: "Honors program graduate",
      renewable: true,
      minGpa: 3.3,
      status: "active",
    });
  }

  // Prestige bonus — elite students at elite feeder schools
  if (prestige >= 85 && c.gpa >= 3.7 && out.length > 0) {
    out.push({
      name: "Preparatory Excellence Award",
      amount: 6000,
      kind: "merit",
      reason: "Graduate of a high-prestige school",
      renewable: true,
      minGpa: 3.4,
      status: "active",
    });
  }

  return out;
}

// ---------- FAFSA / need-based aid ----------

export interface FafsaComputed {
  efc: number;
  grantEligible: number;
  loanEligible: number;
  householdIncome: number;
  parentAssets: number;
  householdSize: number;
}

/** Simplified expected family contribution and need-based aid estimate. */
export function computeFafsa(c: Character): FafsaComputed {
  const f = c.family;
  const householdIncome = Math.max(0, f.income);
  const parentAssets = Math.max(0, f.savings + f.investments);
  const householdSize = f.householdSize;

  // Income protection allowance scales with household size.
  const allowance = 25000 + householdSize * 6000;
  const discretionaryIncome = Math.max(0, householdIncome - allowance);
  const efc = Math.round(discretionaryIncome * 0.22 + parentAssets * 0.05);

  // Need-based grant: lower income => larger grant. Max grant ~ $22k/yr.
  let grantEligible = 0;
  if (householdIncome < 130000) {
    const need = Math.max(0, 130000 - householdIncome);
    grantEligible = Math.min(22000, Math.round((need / 130000) * 22000));
    // Larger families qualify for a bit more.
    grantEligible = Math.round(grantEligible * (1 + Math.min(0.3, (householdSize - 3) * 0.06)));
  }

  // Federal loan eligibility cap (per year).
  const loanEligible = 12500;

  return { efc, grantEligible, loanEligible, householdIncome, parentAssets, householdSize };
}

// ---------- Parent contribution decision ----------

export interface ParentDecision {
  amount: number; // annual contribution from income/savings (excludes 529)
  decision: string;
}

function avgParentRelationship(c: Character): number {
  const parents = c.relationships.filter(
    (r) => (r.type === "mother" || r.type === "father") && r.alive,
  );
  if (parents.length === 0) return 0;
  return parents.reduce((s, r) => s + r.relationship, 0) / parents.length;
}

/**
 * Decide how much parents will contribute per year toward the net cost
 * (after scholarships/grants), based on income, net worth, savings, debt
 * and relationship with the player.
 */
export function computeParentContribution(
  c: Character,
  netCostBeforeParents: number,
): ParentDecision {
  const f = c.family;
  const rel = avgParentRelationship(c);
  const parentsAround = c.relationships.some(
    (r) => (r.type === "mother" || r.type === "father") && r.alive,
  );

  if (!parentsAround) {
    return { amount: 0, decision: "No parents able to help" };
  }

  // Annual capacity from income + a slice of liquid assets, minus debt drag.
  const debtDrag = Math.min(1, f.debt / 120000) * 0.4;
  const incomeCapacity = Math.max(0, f.income - 45000) * 0.18;
  const assetCapacity = Math.max(0, f.savings + f.investments * 0.15) * 0.05;
  let capacity = (incomeCapacity + assetCapacity) * (1 - debtDrag);

  // Willingness scales with relationship (0.3 at cold, 1.1 at warm).
  const willingness = 0.3 + (rel / 100) * 0.8;
  capacity *= willingness;

  if (capacity < 1500) {
    return { amount: 0, decision: "Parents cannot afford to help" };
  }

  const amount = Math.min(netCostBeforeParents, Math.round(capacity));
  const coverage = netCostBeforeParents > 0 ? amount / netCostBeforeParents : 0;

  let decision: string;
  if (coverage >= 0.98) decision = "Parents pay the full remaining cost";
  else if (coverage >= 0.45) decision = "Parents pay about half the cost";
  else if (rel < 45) decision = "Parents offer limited help (strained relationship)";
  else decision = "Parents contribute toward housing and fees";

  return { amount, decision };
}

// ---------- Student loans ----------

export function loanRate(c: Character): number {
  // Better family credit => slightly lower rate.
  const base = 0.065;
  const creditAdj = ((c.family.creditScore - 650) / 200) * 0.02;
  return Math.max(0.035, Math.round((base - creditAdj) * 1000) / 1000);
}

export function buildLoan(principal: number, rate: number, termYears = 10): StudentLoan {
  const monthlyRate = rate / 12;
  const n = termYears * 12;
  const monthlyPayment =
    principal <= 0
      ? 0
      : Math.round((principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)));
  return {
    principal: Math.round(principal),
    balance: Math.round(principal),
    rate,
    monthlyPayment,
    totalRepayment: monthlyPayment * n,
    termYears,
    repaying: false,
  };
}

// ---------- Full aid letter (per academic year) ----------

export function universityByName(name: string): UniversityDef | undefined {
  return UNIVERSITIES.find((u) => u.name === name);
}

/**
 * Build a complete financial aid letter for one academic year at a given
 * university and living arrangement, using the student's scholarships and
 * FAFSA. This is the "acceptance package".
 */
export function buildAidLetter(
  c: Character,
  uni: UniversityDef,
  living: LivingArrangement,
  scholarships: Scholarship[],
  major: string,
): AidLetter {
  const tuition = uni.cost;
  const housing = livingDef(living).housing;
  const books = BOOKS_COST;
  const fees = feesFor(uni.prestige);
  const totalCost = tuition + housing + books + fees;

  const scholarshipsTotal = scholarships
    .filter((s) => s.status !== "revoked")
    .reduce((s, sc) => s + sc.amount, 0);

  const fafsa = c.fafsa;
  const grants = fafsa?.filed ? fafsa.grantEligible : 0;

  // Work-study reduces need but isn't guaranteed; default none until chosen.
  const workStudyIncome = 0;

  // 529 / college savings applied before loans (annual slice).
  const savingsAvailable = Math.max(0, c.family.collegeSavings - c.family.collegeSavingsUsed);
  const perYearSavings = Math.min(
    savingsAvailable,
    Math.round(savingsAvailable / 4) || savingsAvailable,
  );

  let remaining = Math.max(0, totalCost - scholarshipsTotal - grants - workStudyIncome);
  const collegeSavings = Math.min(remaining, perYearSavings);
  remaining -= collegeSavings;

  const parent = computeParentContribution(c, remaining);
  remaining -= parent.amount;

  const loans = Math.max(0, remaining);
  const netCost = Math.max(0, remaining - loans);

  return {
    university: uni.name,
    major,
    prestige: uni.prestige,
    living,
    tuition,
    housing,
    books,
    fees,
    totalCost,
    parentContribution: parent.amount,
    parentDecision: parent.decision,
    collegeSavings,
    scholarships,
    scholarshipsTotal,
    grants,
    workStudyIncome,
    loans: Math.round(loans),
    netCost: Math.round(netCost),
  };
}

// ---------- Work-study ----------

export interface WorkStudyDef {
  role: string;
  income: number;
  study: number; // negative = less study time
  stress: number;
}

export const WORK_STUDY_JOBS: WorkStudyDef[] = [
  { role: "Library Assistant", income: 5500, study: 1, stress: 3 },
  { role: "Campus IT Support", income: 8000, study: -1, stress: 5 },
  { role: "Dining Hall Staff", income: 6000, study: -2, stress: 6 },
  { role: "Administrative Office", income: 6500, study: 0, stress: 4 },
  { role: "Research Assistant", income: 9000, study: 2, stress: 5 },
];

/** Chance to admit a student to a university (used to attach scholarships). */
export function admissionScore(c: Character): number {
  return c.stats.smarts + c.gpa * 5;
}
