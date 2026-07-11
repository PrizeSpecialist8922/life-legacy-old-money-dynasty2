import {
  CITIES,
  CLUBS,
  COUNTRIES,
  FEMALE_NAMES,
  JOBS,
  LAST_NAMES,
  MALE_NAMES,
  MONTHS,
  OCCUPATIONS,
  SPORTS,
  UNIVERSITIES,
} from "./data";
import type { JobDef } from "./data";
import { EVENTS } from "./events";
import { chargeExpense, isDependent, parentsAlive } from "./economy";
import {
  buildLoan,
  computeParentContribution,
  computeFafsa,
  livingDef,
  loanRate,
  universityByName,
  WORK_STUDY_JOBS,
} from "./college";
import { computeYearGPA, generateScore, gradeLevelLabel, inSchool, letterGrade } from "./education";
import {
  PATHWAY_EVENT,
  YEAR9_COURSES,
  YEAR10_COURSES,
  hlCount,
  resolveIBSelection,
  rigorAdmissionsBonus,
  validateIBSelection,
} from "./courses";
import type { IBPick } from "./courses";
import { ibSubjectScore } from "./courses";
import { citiesFor } from "./data";
import {
  admissionEstimate,
  buildK12Package,
  k12ScholarshipRecord,
  publicSchoolFor,
  resolveSchool,
} from "./schools";
import type { SchoolStage } from "./types";
import { GRAD_PROGRAMS, buildGradState, gradAdmission } from "./gradschool";
import type { GradProgramKind } from "./types";
import { INTERNSHIPS, internshipChance, internshipEligibility } from "./internships";
import { resumeScore } from "./resume";
import {
  MAX_EXTRACURRICULARS,
  generateECChallenges,
  resolveECChallenge as resolveECOutcome,
} from "./extracurriculars";
import { pickWorkEvent } from "./workEvents";
import { advancePolitics, isPoliticalOffice } from "./politics";
import { advanceBusinesses } from "./business";
import { advanceInvesting } from "./investing";
import { advanceContacts } from "./contacts";
import { advanceAthlete } from "./athlete";
import { advanceCrime, isInPrison } from "./crime";
import { advanceEntertainment } from "./entertainment";
import { advanceSociety } from "./society";
import { advanceUpbringing } from "./upbringing";
import { advanceOldMoney } from "./oldmoney";
import { advanceLifestyle } from "./lifestyle";
import { advanceClubs } from "./clubs";
import { advanceCollections } from "./collections";
import { advancePhilanthropy } from "./philanthropy";
import { advanceRecords } from "./records";
import { advanceFamilyTree } from "./familytree";
import { advanceGenerational } from "./generational";
import { advanceCouncil } from "./council";
import { advanceRivals } from "./rivals";
import { advanceBankOfficePress } from "./familybank";
import { advanceMatchmaking } from "./matchmaking";
import { advanceGoals } from "./prestige";
import type {
  Character,
  AidLetter,
  ECChallenge,
  Family,
  Gender,
  GameEvent,
  LivingArrangement,
  LogEntry,
  LogTone,
  Relationship,
  WealthTier,
} from "./types";
import { clamp, randInt, randItem, uid } from "./util";

export function netWorth(c: Character): number {
  return c.money + c.assets.reduce((sum, a) => sum + a.value, 0);
}

// ---------- Family wealth generation ----------

function pickTier(): WealthTier {
  const table: [WealthTier, number][] = [
    ["poor", 20],
    ["working", 30],
    ["middle", 30],
    ["affluent", 14],
    ["wealthy", 6],
  ];
  const total = table.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [tier, w] of table) {
    roll -= w;
    if (roll <= 0) return tier;
  }
  return "middle";
}

function makeFamily(): Family {
  const tier = pickTier();
  const cfg: Record<
    WealthTier,
    {
      income: [number, number];
      savings: [number, number];
      debt: [number, number];
      investments: [number, number];
      credit: [number, number];
      ownsHome: number;
    }
  > = {
    poor: {
      income: [16000, 32000],
      savings: [0, 2000],
      debt: [4000, 40000],
      investments: [0, 1000],
      credit: [480, 610],
      ownsHome: 0.1,
    },
    working: {
      income: [34000, 62000],
      savings: [2000, 14000],
      debt: [6000, 45000],
      investments: [0, 9000],
      credit: [560, 690],
      ownsHome: 0.4,
    },
    middle: {
      income: [66000, 125000],
      savings: [12000, 65000],
      debt: [10000, 180000],
      investments: [20000, 130000],
      credit: [660, 750],
      ownsHome: 0.75,
    },
    affluent: {
      income: [130000, 280000],
      savings: [60000, 320000],
      debt: [0, 260000],
      investments: [150000, 850000],
      credit: [720, 805],
      ownsHome: 0.9,
    },
    wealthy: {
      income: [320000, 2200000],
      savings: [300000, 3200000],
      debt: [0, 500000],
      investments: [1200000, 16000000],
      credit: [760, 835],
      ownsHome: 0.97,
    },
  };
  const t = cfg[tier];
  const income = randInt(t.income[0], t.income[1]);
  const savings = randInt(t.savings[0], t.savings[1]);
  const debt = randInt(t.debt[0], t.debt[1]);
  const investments = randInt(t.investments[0], t.investments[1]);
  const ownsHome = Math.random() < t.ownsHome;
  const homeEquity = ownsHome ? randInt(30000, 900000) : 0;
  // Financial planning habits scale with wealth but vary per family.
  const planningBase: Record<WealthTier, number> = {
    poor: 15,
    working: 30,
    middle: 50,
    affluent: 70,
    wealthy: 82,
  };
  const financialPlanning = clamp(planningBase[tier] + randInt(-15, 15));
  const householdSize = randInt(3, 6);
  const numChildren = householdSize - 2;
  // Decide whether parents saved for college and how much.
  let savingsPlanType: Family["savingsPlanType"] = "none";
  let collegeSavings = 0;
  const planRoll = Math.random() * 100;
  if (planRoll < financialPlanning) {
    savingsPlanType = financialPlanning >= 60 ? "529" : "savings";
    const perChild = Math.round(
      (income * (0.05 + financialPlanning / 400) * randInt(10, 16)) / Math.max(1, numChildren),
    );
    collegeSavings = Math.max(0, Math.round(perChild * (0.7 + Math.random() * 0.6)));
  }
  return {
    tier,
    income,
    savings,
    debt,
    creditScore: randInt(t.credit[0], t.credit[1]),
    ownsHome,
    investments,
    netWorth: savings + investments + homeEquity - debt,
    motherOccupation: randItem(OCCUPATIONS[tier]),
    fatherOccupation: randItem(OCCUPATIONS[tier]),
    householdSize,
    financialPlanning,
    savingsPlanType,
    collegeSavings,
    collegeSavingsUsed: 0,
  };
}

function makeParent(type: "mother" | "father"): Relationship {
  const name = type === "mother" ? randItem(FEMALE_NAMES) : randItem(MALE_NAMES);
  return {
    id: uid(),
    name: `${name} ${""}`.trim(),
    type,
    relationship: randInt(60, 95),
    age: randInt(24, 40),
    alive: true,
  };
}

export function createCharacter(input?: {
  name?: string;
  gender?: Gender;
  country?: string;
}): Character {
  const gender: Gender = input?.gender ?? (Math.random() > 0.5 ? "male" : "female");
  const last = randItem(LAST_NAMES);
  const first = gender === "male" ? randItem(MALE_NAMES) : randItem(FEMALE_NAMES);
  const name = input?.name?.trim() || `${first} ${last}`;
  const country = input?.country ?? randItem(COUNTRIES);

  const mother = makeParent("mother");
  const father = makeParent("father");
  mother.name = `${randItem(FEMALE_NAMES)} ${last}`;
  father.name = `${randItem(MALE_NAMES)} ${last}`;

  const relationships: Relationship[] = [mother, father];
  if (Math.random() > 0.4) {
    const sibGender = Math.random() > 0.5 ? "male" : "female";
    relationships.push({
      id: uid(),
      name: `${sibGender === "male" ? randItem(MALE_NAMES) : randItem(FEMALE_NAMES)} ${last}`,
      type: "sibling",
      relationship: randInt(40, 90),
      age: randInt(0, 6),
      alive: true,
    });
  }

  const family = makeFamily();
  const startMoney = family.tier === "wealthy" ? randInt(200, 1500) : 0;

  const c: Character = {
    name,
    gender,
    country,
    city: randItem(citiesFor(country)),
    citizenship: country,
    birthday: `${randItem(MONTHS)} ${randInt(1, 28)}`,
    age: 0,
    alive: true,
    stats: {
      happiness: randInt(55, 90),
      health: randInt(60, 95),
      smarts: randInt(30, 80),
      looks: randInt(30, 85),
    },
    mentalHealth: randInt(60, 90),
    fitness: randInt(30, 60),
    illnesses: [],
    insurance: family.tier !== "poor",
    money: startMoney,
    education: "none",
    gpa: 0,
    relationships,
    assets: [],
    family,
    edu: {
      school: "Home",
      attendance: 95,
      homework: 80,
      disciplineIncidents: 0,
      studyHours: 0,
      skips: 0,
      classRank: 0,
      classSize: 0,
      clubs: [],
      sports: [],
      awards: [],
      scholarships: [],
      degrees: [],
      history: [],
    },
    scores: {},
    criminalRecord: 0,
    fame: 0,
    politicalInfluence: 0,
    businessReputation: 0,
    emancipated: false,
    independent: false,
    homeless: false,
    networking: 0,
    jobYearsAccrued: 0,
    jobOffers: [],
    studentLoans: [],
    netWorthHistory: [{ age: 0, value: 0 }],
    log: [],
    yearActionsUsed: 0,
    createdAt: Date.now(),
  };

  c.log.push({
    age: 0,
    text: `You were born ${gender === "male" ? "a boy" : "a girl"} in ${c.city}, ${country} to a ${family.tier} family. Your parents named you ${name}.`,
    tone: "milestone",
  });
  return c;
}

function pickEvent(c: Character): GameEvent | null {
  const pool = EVENTS.filter(
    (e) => c.age >= e.minAge && c.age <= e.maxAge && (!e.condition || e.condition(c)),
  );
  if (pool.length === 0) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return pool[pool.length - 1];
}

/** Enroll in the default (free) public school for a stage; applications to
 * private/religious/boarding schools open via the school-selection popup. */
function enterStage(c: Character, stage: SchoolStage) {
  c.k12Applied = [];
  // Students at a school that spans this stage (e.g. UCC, K-12 privates)
  // continue there by default rather than being dumped back to public.
  const current = c.currentSchoolId ? resolveSchool(c, c.currentSchoolId, stage) : undefined;
  if (current && current.kind !== "public" && current.stages.includes(stage)) {
    c.pendingSchoolChoice = stage; // still free to switch schools
    return;
  }
  const pub = publicSchoolFor(c.city, c.country, stage);
  c.edu.school = pub.name;
  c.edu.schoolPrestige = pub.prestige;
  c.edu.schoolKind = "public";
  c.edu.k12Tuition = 0;
  c.currentSchoolId = pub.id;
  c.pendingSchoolChoice = stage; // opens the school-selection popup
}

function updateEducation(c: Character, log: LogEntry[]) {
  const prev = c.education;
  if (c.age === 5) {
    c.education = "elementary";
    enterStage(c, "elementary");
  } else if (c.age === 11) {
    c.education = "middle";
    enterStage(c, "middle");
  } else if (c.age === 14) {
    c.education = "high";
    enterStage(c, "high");
    c.edu.courses = YEAR9_COURSES.map((x) => ({ ...x }));
  } else if (c.age === 15 && c.education === "high") {
    c.edu.courses = YEAR10_COURSES.map((x) => ({ ...x }));
  }

  // Grade 12 (age 17): IB students sit examinations this year.
  if (
    c.age === 17 &&
    c.education === "high" &&
    c.edu.pathway === "ib" &&
    (c.edu.courses?.length ?? 0) === 6 &&
    !c.edu.ibResults
  ) {
    c.edu.needsIBExams = true;
    log.push({
      age: c.age,
      text: "Your IB examinations are this year. Sit them from the Education tab before graduation.",
      tone: "neutral",
    });
  }

  if (prev !== c.education) {
    if (c.education === "elementary")
      log.push({
        age: c.age,
        text: `You started elementary school at ${c.edu.school}.`,
        tone: "milestone",
      });
    if (c.education === "middle")
      log.push({
        age: c.age,
        text: `You started middle school at ${c.edu.school}.`,
        tone: "milestone",
      });
    if (c.education === "high")
      log.push({
        age: c.age,
        text: `You started high school at ${c.edu.school}.`,
        tone: "milestone",
      });
  }

  // Auto SAT/ACT during junior/senior year of high school.
  if (c.education === "high" && c.age === 17 && c.scores.sat === undefined) {
    c.scores.sat = generateScore("sat", c);
    c.scores.act = generateScore("act", c);
    log.push({
      age: c.age,
      text: `You took the SAT (${c.scores.sat}) and ACT (${c.scores.act}).`,
      tone: "milestone",
    });
  }

  if (c.age === 18 && c.education === "high") {
    c.education = "none";
    c.edu.degrees.push("High School Diploma");
    // Never sat the exams? They happen anyway.
    if (c.edu.pathway === "ib" && c.edu.needsIBExams && !c.edu.ibResults) {
      autoSitIBExams(c, log);
    }
    if (c.edu.pathway === "ib" && (c.edu.ibTotal ?? 0) >= 24) {
      c.edu.degrees.push("IB Diploma");
      log.push({
        age: c.age,
        text: `You earned the IB Diploma — ${c.edu.ibTotal}/45 (${hlCount(c)} HL courses).`,
        tone: "milestone",
      });
    }
    c.edu.courses = undefined;
    c.edu.needsCourseSelection = false;
    log.push({
      age: c.age,
      text: `You graduated ${c.edu.school} with a ${c.gpa.toFixed(2)} GPA.`,
      tone: "milestone",
    });
  }

  if (c.education === "college" && c.age >= 22) {
    c.education = "graduated";
    if (c.major) c.edu.degrees.push(`B.A. ${c.major}`);
    // Legacy admissions (Build 11B): the dynasty remembers where it studied.
    if (c.university && c.dynasty) {
      c.dynasty.almaMaters = c.dynasty.almaMaters ?? [];
      if (!c.dynasty.almaMaters.includes(c.university)) c.dynasty.almaMaters.push(c.university);
    }
    finalizeGraduation(c, log);
    log.push({
      age: c.age,
      text: `You graduated from ${c.university} with a degree in ${c.major}!`,
      tone: "milestone",
    });
  }
}

import { honorsLabel } from "./honors";
export { honorsLabel };

/**
 * On college graduation, consolidate all outstanding student loans into a
 * single repayment plan and begin repayment.
 */
function finalizeGraduation(c: Character, log: LogEntry[]) {
  const totalBalance = c.studentLoans.reduce((s, l) => s + l.balance, 0);
  if (totalBalance > 0) {
    const rate = c.studentLoans[0]?.rate ?? loanRate(c);
    const consolidated = buildLoan(totalBalance, rate, 10);
    consolidated.repaying = true;
    c.studentLoans = [consolidated];
    log.push({
      age: c.age,
      text: `Student loan repayment begins: ${money(consolidated.balance)} balance at ${(rate * 100).toFixed(1)}% — ${money(consolidated.monthlyPayment)}/mo.`,
      tone: "neutral",
    });
  }
  const honors = honorsLabel(c.gpa);
  if (honors) {
    c.edu.awards.push(`${honors} (graduation)`);
  }
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * Re-evaluate renewable scholarships against the current GPA. Below the
 * threshold they are halved; well below, revoked.
 */
function renewScholarships(c: Character, log: LogEntry[]) {
  for (const s of c.edu.scholarships) {
    if (!s.renewable || s.status === "revoked") continue;
    const min = s.minGpa ?? 3.0;
    if (c.gpa < min - 0.5) {
      s.status = "revoked";
      log.push({
        age: c.age,
        text: `Your ${s.name} was revoked — GPA fell too far below ${min.toFixed(1)}.`,
        tone: "bad",
      });
    } else if (c.gpa < min && s.status !== "reduced") {
      s.amount = Math.round(s.amount * 0.5);
      s.status = "reduced";
      log.push({
        age: c.age,
        text: `Your ${s.name} was reduced — GPA dipped below the ${min.toFixed(1)} requirement.`,
        tone: "bad",
      });
    }
  }
}

/**
 * Fund one academic year of college: compute costs (with tuition inflation),
 * apply scholarships, grants, work-study, job income, 529 savings and parent
 * contribution, and borrow the remainder as student loans.
 */
function fundCollegeYear(c: Character, log: LogEntry[]) {
  const cf = c.collegeFinance;
  if (!cf) return;
  const yearNum = cf.yearsFunded + 1;

  // Renewal check for years after the first (uses cumulative GPA so far).
  if (yearNum > 1) renewScholarships(c, log);

  const inflRate = cf.tuition >= 40000 ? 0.05 : 0.03;
  const tuition = Math.round(cf.tuition * Math.pow(1 + inflRate, yearNum - 1));
  const housing = livingDef(cf.living).housing;
  const books = cf.books;
  const fees = cf.fees;
  const totalCost = tuition + housing + books + fees;

  const scholarships = c.edu.scholarships
    .filter((s) => s.status !== "revoked")
    .reduce((s, sc) => s + sc.amount, 0);
  const grants = c.fafsa?.filed ? c.fafsa.grantEligible : 0;
  const workStudy = cf.workStudyIncome;
  const jobIncome = c.job ? Math.round(c.job.salary * 0.35) : 0;

  let remaining = Math.max(0, totalCost - scholarships - grants - workStudy - jobIncome);

  // 529 / college savings applied before loans.
  const savingsAvail = Math.max(0, c.family.collegeSavings - c.family.collegeSavingsUsed);
  const savingsUsed = Math.min(remaining, savingsAvail);
  c.family.collegeSavingsUsed += savingsUsed;
  remaining -= savingsUsed;

  // Parents contribute (recomputed each year against remaining need).
  const parent = computeParentContribution(c, remaining);
  const parentPaid = Math.min(remaining, parent.amount);
  c.family.savings = Math.max(0, c.family.savings - Math.round(parentPaid * 0.5));
  c.family.netWorth -= parentPaid;
  remaining -= parentPaid;

  // Remainder becomes a student loan for the year.
  const loanAmt = Math.max(0, Math.round(remaining));
  if (loanAmt > 0) {
    c.studentLoans.push(buildLoan(loanAmt, loanRate(c), 10));
  }

  cf.yearsFunded = yearNum;
  cf.parentContribution = parentPaid;
  cf.parentDecision = parent.decision;
  cf.totalScholarships += scholarships;
  cf.totalGrants += grants;
  cf.totalParent += parentPaid;
  cf.totalSavings += savingsUsed;
  cf.totalWorkStudy += workStudy;
  cf.totalLoans += loanAmt;
  cf.budget.push({
    age: c.age,
    year: yearNum,
    tuition,
    housing,
    books,
    fees,
    totalCost,
    parents: parentPaid,
    savings: savingsUsed,
    scholarships,
    grants,
    workStudy,
    jobIncome,
    loans: loanAmt,
    remaining: 0,
  });
}

function chargeK12Tuition(c: Character) {
  if (!["elementary", "middle", "high"].includes(c.education)) return;
  const net = c.edu.k12Tuition ?? 0;
  if (net <= 0) return;
  const fromSavings = Math.min(c.family.savings, net);
  c.family.savings -= fromSavings;
  const overflow = net - fromSavings;
  if (overflow > 0) c.family.debt += overflow;
  c.family.netWorth -= net;
}

const GRAD_DEGREE_MARKERS: Record<GradProgramKind, string[]> = {
  mba: ["MBA"],
  jd: ["JD"],
  md: ["MD"],
  jdmba: ["JD", "MBA"],
};

function advanceGradYear(c: Character, log: LogEntry[]) {
  const g = c.gradProgram;
  if (!g) return;
  // Fellowship for top students; the rest is borrowed.
  const fellowship = c.gpa >= 3.7 ? Math.round(g.tuition * 0.25) : 0;
  const borrowed = Math.max(0, g.tuition - fellowship);
  if (borrowed > 0) c.studentLoans.push(buildLoan(borrowed, loanRate(c), 10));
  if (fellowship > 0) {
    log.push({
      age: c.age,
      text: `Your merit fellowship covered ${money(fellowship)} of ${g.name} tuition.`,
      tone: "good",
    });
  }
  g.yearsDone += 1;
  if (g.yearsDone >= g.yearsTotal) {
    for (const d of GRAD_DEGREE_MARKERS[g.kind]) {
      if (!c.edu.degrees.includes(d)) c.edu.degrees.push(d);
    }
    c.education = "graduated";
    if (c.dynasty) {
      c.dynasty.almaMaters = c.dynasty.almaMaters ?? [];
      if (!c.dynasty.almaMaters.includes(g.school)) c.dynasty.almaMaters.push(g.school);
    }
    const label = GRAD_DEGREE_MARKERS[g.kind].join(" and ");
    log.push({
      age: c.age,
      text: `You graduated from ${g.school} with your ${label}!${g.kind === "md" ? " Next: a 3-year medical residency." : ""}`,
      tone: "milestone",
    });
    finalizeGraduation(c, log);
    c.gradProgram = undefined;
  }
}

const ELITE_RECRUIT_POOL = ["consultant", "analyst", "swe", "biglaw"];

/** Prestigious employers send unsolicited interview invitations to stars. */
function maybeEliteRecruiting(c: Character, log: LogEntry[]) {
  const inWindow =
    (c.education === "college" && c.age >= 20) ||
    (c.education === "graduated" && c.age <= 27 && !c.job);
  if (!inWindow) return;
  if ((c.jobOffers?.length ?? 0) >= 2) return;
  const rs = resumeScore(c);
  if (rs < 62 || c.gpa < 3.6) return;
  if (Math.random() > 0.3) return;

  const eligible = JOBS.filter(
    (j) =>
      ELITE_RECRUIT_POOL.includes(j.id) &&
      (!j.degreeReq || c.edu.degrees.includes(j.degreeReq)) &&
      (!j.requiresBar || c.scores.bar === "passed"),
  );
  if (!eligible.length) return;
  const def = randItem(eligible);
  const salary = Math.round(def.baseSalary * 1.15);
  c.jobOffers = c.jobOffers ?? [];
  c.jobOffers.push({
    jobId: def.id,
    title: def.ladder[0],
    company: def.company,
    salary,
    source: "Campus recruiting — they found you",
    expiresAge: c.age + 2,
  });
  log.push({
    age: c.age,
    text: `${def.company} reached out with an unsolicited offer: ${def.ladder[0]} at ${money(salary)}/yr. Check the Career tab.`,
    tone: "milestone",
  });
}

/** Apply annual student-loan repayment after graduation. */
function repayStudentLoans(c: Character, log: LogEntry[]) {
  for (const l of c.studentLoans) {
    if (!l.repaying || l.balance <= 0) continue;
    const annual = l.monthlyPayment * 12;
    const interest = l.balance * l.rate;
    const principalPaid = Math.max(0, annual - interest);
    c.money -= annual;
    l.balance = Math.max(0, Math.round(l.balance - principalPaid));
    if (l.balance <= 0) {
      l.repaying = false;
      log.push({ age: c.age, text: "You paid off your student loan! 🎉", tone: "good" });
    }
  }
}

/**
 * Run one academic year: derive attendance/homework, compute the year's GPA,
 * update the cumulative GPA, class rank, awards, and reset per-year counters.
 */
function advanceSchoolYear(c: Character, log: LogEntry[]) {
  if (!inSchool(c)) {
    c.edu.studyHours = 0;
    c.edu.skips = 0;
    return;
  }

  c.edu.attendance = clamp(96 - c.edu.skips * 9 + randInt(-3, 2));
  c.edu.homework = clamp(35 + c.stats.smarts * 0.4 + c.edu.studyHours * 1.4 + randInt(-5, 5));

  // Heavy extracurricular commitment eats into available study time (it does
  // not directly subtract GPA — less study naturally lowers the year's GPA).
  const ecLoad = c.edu.clubs.length + c.edu.sports.length;
  if (ecLoad > 0) c.edu.studyHours = Math.max(0, c.edu.studyHours - ecLoad * 2);

  const yearGpa = computeYearGPA(c);
  const stageLabel = c.education === "college" ? "College" : gradeLevelLabel(c);
  const prevCum = c.gpa;
  const historyEntry = {
    age: c.age,
    stage: stageLabel,
    grade: letterGrade(yearGpa),
    yearGpa,
    cumGpa: 0,
    cumDelta: 0,
  };
  c.edu.history.push(historyEntry);

  const years = c.edu.history.map((h) => h.yearGpa);
  c.gpa = Number((years.reduce((s, g) => s + g, 0) / years.length).toFixed(2));
  historyEntry.cumGpa = c.gpa;
  historyEntry.cumDelta = Number((c.gpa - prevCum).toFixed(2));

  // Class rank (1 = top). Better GPA => lower rank number.
  c.edu.classSize = c.edu.classSize || randInt(80, 420);
  c.edu.classRank = Math.max(1, Math.round(((4 - c.gpa) / 4) * c.edu.classSize) + randInt(0, 3));

  if (yearGpa >= 3.85) {
    const award = `Honor Roll (age ${c.age})`;
    c.edu.awards.push(award);
  } else if (yearGpa >= 3.5 && Math.random() < 0.4) {
    c.edu.awards.push(`Merit List (age ${c.age})`);
  }

  c.edu.studyHours = 0;
  c.edu.skips = 0;
  c.edu.assignmentAvg = 0;
  c.edu.assignmentsThisYear = 0;

  // Generate this year's interactive extracurricular competitions.
  if (
    ecLoad > 0 &&
    (c.education === "middle" || c.education === "high" || c.education === "college")
  ) {
    c.pendingChallenges = generateECChallenges(c);
  }
}

function applyFamilyPerks(c: Character) {
  if (c.age >= 18 || !parentsAlive(c)) return;
  switch (c.family.tier) {
    case "wealthy":
      c.stats.smarts = clamp(c.stats.smarts + 2); // private tutors
      c.stats.health = clamp(c.stats.health + 1); // elite healthcare
      if (Math.random() < 0.4) c.stats.happiness = clamp(c.stats.happiness + 3); // vacations
      break;
    case "affluent":
      c.stats.smarts = clamp(c.stats.smarts + 1);
      if (Math.random() < 0.3) c.stats.happiness = clamp(c.stats.happiness + 2);
      break;
    case "working":
      if (Math.random() < 0.25) c.stats.happiness = clamp(c.stats.happiness - 2); // money stress
      break;
    case "poor":
      c.stats.happiness = clamp(c.stats.happiness - 2); // financial stress
      if (Math.random() < 0.2) c.stats.health = clamp(c.stats.health - 2);
      break;
  }
}

function updateFamilyFinances(c: Character) {
  // Parents' household finances drift while the player is a dependent.
  if (c.age >= 30) return; // parents effectively retired / out of picture
  const f = c.family;
  const net = Math.round(f.income * 0.08); // annual net savings rate
  f.savings = Math.max(0, f.savings + net);
  f.investments = Math.round(f.investments * (1 + (Math.random() * 0.1 - 0.02)));
  if (f.debt > 0) {
    const payment = Math.min(f.debt, Math.round(f.income * 0.05));
    f.debt -= payment;
    f.creditScore = Math.min(850, f.creditScore + 1);
  }
  f.netWorth = f.savings + f.investments + (f.ownsHome ? Math.round(f.income * 2.5) : 0) - f.debt;
}

function applyJobIncome(c: Character, log: LogEntry[]) {
  if (!c.job) return;
  // Political offices are governed by elections and terms (politics.ts), not
  // corporate performance reviews: pay the salary and count the tenure only.
  if (c.job.careerGroup === "political-office") {
    c.money += Math.round(c.job.salary * 0.72);
    c.job.yearsAtLevel = (c.job.yearsAtLevel ?? 0) + 1;
    c.job.yearsAtCompany = (c.job.yearsAtCompany ?? 0) + 1;
    c.jobYearsAccrued = (c.jobYearsAccrued ?? 0) + 1;
    return;
  }
  c.money += Math.round(c.job.salary * 0.72); // after taxes/expenses
  c.job.yearsAtLevel = (c.job.yearsAtLevel ?? 0) + 1;
  c.job.yearsAtCompany = (c.job.yearsAtCompany ?? 0) + 1;
  c.jobYearsAccrued = (c.jobYearsAccrued ?? 0) + 1;
  // Bonus payout based on performance and bonus potential.
  const bonus = Math.round(c.job.salary * (c.job.bonusPct ?? 0.1) * (c.job.performance / 100));
  if (bonus > 0) c.money += bonus;
  // Burnout accrues; time off (weekends) and good manager relations ease it.
  c.job.burnout = clamp(
    (c.job.burnout ?? 10) + randInt(1, 5) - Math.round((c.job.managerRel ?? 50) / 40),
  );
  if ((c.job.burnout ?? 0) >= 85 && Math.random() < 0.3) {
    c.job.performance = clamp(c.job.performance - randInt(4, 9));
    c.mentalHealth = clamp(c.mentalHealth - randInt(3, 7));
    log.push({ age: c.age, text: "Burnout is catching up with you at work.", tone: "bad" });
  }
  // performance drift
  const drift = Math.round((c.stats.smarts - 40) / 12 + (Math.random() * 6 - 2));
  c.job.performance = clamp(c.job.performance + drift);

  const def = JOBS.find((j) => j.id === c.job!.id);
  if (def && c.job.performance >= 78 && c.job.level < def.ladder.length - 1) {
    // Hard promotion gates: degrees and time-in-role are non-negotiable.
    const gate = def.promotionGates?.find((g) => g.level === c.job!.level + 1);
    if (gate?.degree && !c.edu.degrees.includes(gate.degree)) {
      log.push({
        age: c.age,
        text: `You were passed over for ${def.ladder[c.job.level + 1]} — ${gate.note}.`,
        tone: "bad",
      });
      return;
    }
    if (gate?.minYearsAtLevel && (c.job.yearsAtLevel ?? 0) < gate.minYearsAtLevel) {
      return; // still putting in the years; no drama needed
    }
    c.job.level += 1;
    c.job.title = def.ladder[c.job.level];
    c.job.salary = Math.round(c.job.salary * 1.35);
    c.job.performance = 45;
    c.job.yearsAtLevel = 0;
    log.push({
      age: c.age,
      text: `You were promoted to ${c.job.title}! New salary: $${c.job.salary.toLocaleString()}.`,
      tone: "good",
    });
  } else if (c.job.performance < 20) {
    log.push({
      age: c.age,
      text: `You were let go from your role as ${c.job.title}.`,
      tone: "bad",
    });
    c.job = undefined;
  }
}

function ageStats(c: Character) {
  // Natural aging of health
  if (c.age > 45) c.stats.health = clamp(c.stats.health - randInt(1, 3));
  if (c.age > 65) c.stats.health = clamp(c.stats.health - randInt(2, 4));
  if (c.age > 25) c.stats.looks = clamp(c.stats.looks - (Math.random() > 0.5 ? 1 : 0));
  // Relationship natural drift
  for (const r of c.relationships) {
    if (!r.alive) continue;
    r.age += 1;
    r.relationship = clamp(r.relationship - randInt(0, 2));
    if (r.age > 70 && Math.random() < (r.age - 70) / 60) {
      r.alive = false;
    }
  }
}

export interface AgeUpResult {
  character: Character;
  event: GameEvent | null;
  newLogs: LogEntry[];
}

export function ageUp(input: Character): AgeUpResult {
  const c: Character = structuredClone(input);
  const newLogs: LogEntry[] = [];
  const startLen = c.log.length;

  c.age += 1;
  c.yearActionsUsed = 0;
  c.edu.internAppliedThisYear = [];

  updateEducation(c, c.log);
  advanceSchoolYear(c, c.log);
  applyFamilyPerks(c);
  updateFamilyFinances(c);
  ageStats(c);
  applyJobIncome(c, c.log);
  advancePolitics(c, c.log);
  advanceBusinesses(c, c.log);
  advanceInvesting(c, c.log);
  advanceContacts(c);
  advanceAthlete(c, c.log);
  advanceCrime(c, c.log);
  advanceEntertainment(c, c.log);
  advanceSociety(c, c.log);
  advanceUpbringing(c, c.log);
  advanceOldMoney(c, c.log);
  // Build 11B — lifestyle, clubs/traditions, collections, philanthropy,
  // then the archivist writes it all down and the goals get checked.
  advanceLifestyle(c, c.log);
  advanceClubs(c, c.log);
  advanceCollections(c, c.log);
  advancePhilanthropy(c, c.log);
  advanceRecords(c, c.log);
  advanceFamilyTree(c, c.log);
  advanceGenerational(c, c.log);
  advanceMatchmaking(c, c.log);
  advanceCouncil(c, c.log);
  advanceRivals(c, c.log);
  advanceBankOfficePress(c, c.log);
  advanceGoals(c, c.log);
  // The Third-Generation Curse is beatable: earn something real and it cracks.
  if (c.gilded) {
    const earnedIt =
      (c.jobYearsAccrued ?? 0) >= 3 ||
      (c.businessHub?.lifetimeProfit ?? 0) > 100000 ||
      c.athlete?.stage === "pro" ||
      (c.crime?.notoriety ?? 0) > 40 ||
      (c.politics?.highestLevelWon ?? -1) >= 0;
    if (earnedIt) {
      c.gilded = false;
      c.stats.happiness = clamp(c.stats.happiness + 10);
      c.networking = clamp((c.networking ?? 0) + 10);
      c.log.push({
        age: c.age,
        text: "Something shifted: you built a thing nobody handed you, and the gilding cracked off. The Curse loses its grip on those who earn. You're the third generation that didn't lose it — you're the one that came back.",
        tone: "milestone",
      });
    } else if (Math.random() < 0.3) {
      c.stats.happiness = clamp(c.stats.happiness - 1);
    }
  }
  // The heirloom letter unseals at its appointed year.
  if (c.will?.letter && !c.will.letter.delivered && c.age >= c.will.letter.openAtAge) {
    const L = c.will.letter;
    L.delivered = true;
    c.money += L.attachedMoney;
    c.log.push({
      age: c.age,
      text: `AN ENVELOPE, SEALED YEARS AGO, UNSEALED TODAY${L.attachedMoney ? ` ($${L.attachedMoney.toLocaleString()} enclosed)` : ""}: "${L.text}"`,
      tone: "milestone",
    });
  }

  // Private-school tuition drains the family every enrolled year.
  chargeK12Tuition(c);

  // College is funded year-by-year (year 1 at enrollment).
  if (c.education === "college") {
    fundCollegeYear(c, c.log);
  }

  // Graduate school: fund the year and progress the program.
  if (c.education === "gradschool" && c.gradProgram) {
    advanceGradYear(c, c.log);
  }

  // Elite employers actively recruit exceptional students & fresh graduates.
  maybeEliteRecruiting(c, c.log);

  // Expire stale job offers.
  if (c.jobOffers?.length) {
    c.jobOffers = c.jobOffers.filter((o) => o.expiresAge >= c.age);
  }
  // Student-loan repayment kicks in after graduation.
  repayStudentLoans(c, c.log);

  // record net worth
  c.netWorthHistory.push({ age: c.age, value: netWorth(c) });
  if (c.netWorthHistory.length > 120) c.netWorthHistory.shift();

  // death checks
  const dead = checkDeath(c);
  if (dead) {
    c.alive = false;
    c.causeOfDeath = dead;
    c.log.push({
      age: c.age,
      text: `You died at age ${c.age}. Cause: ${dead}.`,
      tone: "milestone",
    });
    for (let i = startLen; i < c.log.length; i++) newLogs.push(c.log[i]);
    return { character: c, event: null, newLogs };
  }

  // Entering Grade 11 (or later, for older saves) the player must choose an
  // academic pathway before any random event can occur.
  if (c.education === "high" && c.age >= 16 && !c.edu.pathway) {
    for (let i = startLen; i < c.log.length; i++) newLogs.push(c.log[i]);
    return { character: c, event: PATHWAY_EVENT, newLogs };
  }

  // Employed adults get a meaningful work event most years. Elected officials
  // get their drama from the politics simulation instead.
  let event: GameEvent | null = null;
  if (c.job && !isPoliticalOffice(c) && Math.random() < 0.7) event = pickWorkEvent(c);
  if (!event) event = pickEvent(c);
  for (let i = startLen; i < c.log.length; i++) newLogs.push(c.log[i]);
  return { character: c, event, newLogs };
}

function checkDeath(c: Character): string | null {
  if (c.stats.health <= 0) return "poor health";
  if (c.age > 70) {
    const chance = (c.age - 70) / 45 + (60 - c.stats.health) / 400;
    if (Math.random() < chance) return randItem(["old age", "heart failure", "illness"]);
  }
  return null;
}

export function resolveEventChoice(
  input: Character,
  event: GameEvent,
  choiceIndex: number,
): Character {
  const c: Character = structuredClone(input);
  const choice = event.choices[choiceIndex];
  const result = choice.apply(c);
  if (result) {
    c.log.push({ age: c.age, text: result.text, tone: result.tone });
  }
  return c;
}

// ---------- Player actions ----------

export interface ActionResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const MAX_ACTIONS = 3;

function spendAction(c: Character): boolean {
  if (c.yearActionsUsed >= MAX_ACTIONS) return false;
  c.yearActionsUsed += 1;
  return true;
}

export function doActivity(input: Character, id: string): ActionResult {
  const c: Character = structuredClone(input);
  if (!spendAction(c)) {
    return {
      character: input,
      message: "No energy left this year. Age up first.",
      tone: "bad",
      ok: false,
    };
  }
  let message = "";
  let tone: LogTone = "neutral";

  switch (id) {
    case "study":
      c.stats.smarts = clamp(c.stats.smarts + randInt(3, 7));
      c.stats.happiness = clamp(c.stats.happiness - 2);
      c.edu.studyHours += randInt(6, 12);
      message = "You hit the books and got a little smarter.";
      tone = "good";
      break;
    case "sports":
      c.stats.health = clamp(c.stats.health + randInt(2, 5));
      c.fitness = clamp(c.fitness + randInt(4, 8));
      c.stats.happiness = clamp(c.stats.happiness + randInt(2, 5));
      message = "You played sports and burned off some energy.";
      tone = "good";
      break;
    case "friends":
      c.stats.happiness = clamp(c.stats.happiness + randInt(4, 8));
      message = "You made some new friends.";
      tone = "good";
      break;
    case "socialmedia":
      if (Math.random() < 0.35) {
        c.stats.happiness = clamp(c.stats.happiness - randInt(2, 6));
        c.mentalHealth = clamp(c.mentalHealth - randInt(2, 5));
        message = "You doom-scrolled and felt worse afterward.";
        tone = "bad";
      } else {
        c.stats.happiness = clamp(c.stats.happiness + randInt(2, 5));
        c.fame += randInt(0, 2);
        message = "You posted online and got some likes.";
        tone = "neutral";
      }
      break;
    case "skipclass":
      if (!inSchool(c)) {
        return {
          character: input,
          message: "You're not in school right now.",
          tone: "bad",
          ok: false,
        };
      }
      c.edu.skips += 1;
      c.edu.disciplineIncidents += Math.random() < 0.4 ? 1 : 0;
      c.stats.happiness = clamp(c.stats.happiness + randInt(3, 7));
      c.stats.smarts = clamp(c.stats.smarts - randInt(1, 3));
      message = "You skipped class. Fun now — grades later.";
      tone = "neutral";
      break;
    case "gym":
      c.stats.health = clamp(c.stats.health + randInt(3, 6));
      c.stats.looks = clamp(c.stats.looks + randInt(1, 4));
      c.fitness = clamp(c.fitness + randInt(3, 6));
      message = "You worked out. Feeling stronger.";
      tone = "good";
      break;
    case "meditate":
      c.stats.happiness = clamp(c.stats.happiness + randInt(4, 8));
      c.mentalHealth = clamp(c.mentalHealth + randInt(4, 8));
      message = "You meditated and found some peace.";
      tone = "good";
      break;
    case "social":
      c.stats.happiness = clamp(c.stats.happiness + randInt(5, 10));
      c.stats.health = clamp(c.stats.health - randInt(0, 3));
      message = "You went out with friends and had a blast.";
      tone = "good";
      break;
    case "doctor": {
      if (!isDependent(c) && c.money < 300) {
        return {
          character: input,
          message: "You can't afford a check-up ($300).",
          tone: "bad",
          ok: false,
        };
      }
      const res = chargeExpense(c, 300, { label: "check-up" });
      c.stats.health = clamp(c.stats.health + randInt(6, 12));
      message = `${res.message} Your health improved.`;
      tone = res.paidBy === "family-debt" ? "neutral" : "good";
      break;
    }
    case "network": {
      c.networking = clamp((c.networking ?? 0) + randInt(5, 10));
      c.stats.happiness = clamp(c.stats.happiness + randInt(1, 4));
      message = "You attended a networking event and grew your professional circle.";
      tone = "good";
      break;
    }
    case "read":
      c.stats.smarts = clamp(c.stats.smarts + randInt(1, 4));
      c.stats.happiness = clamp(c.stats.happiness + randInt(1, 3));
      message = "You read a great book.";
      tone = "good";
      break;
    default:
      return { character: input, message: "Unknown activity.", tone: "bad", ok: false };
  }

  c.log.push({ age: c.age, text: message, tone });
  return { character: c, message, tone, ok: true };
}

export function applyToJob(input: Character, def: JobDef): ActionResult {
  const c: Character = structuredClone(input);
  if (isInPrison(c))
    return {
      character: input,
      message: "Employers rarely hire from inside a cell. Serve your time.",
      tone: "bad",
      ok: false,
    };
  if (!spendAction(c)) {
    return {
      character: input,
      message: "No energy left this year. Age up first.",
      tone: "bad",
      ok: false,
    };
  }
  const chance =
    0.35 +
    (c.stats.smarts - def.minSmarts) / 120 +
    (c.education === "graduated" ? 0.2 : 0) -
    c.criminalRecord * 0.12; // background checks are real
  if (Math.random() > chance) {
    const msg =
      c.criminalRecord > 0
        ? `Your application to ${def.company} was rejected — the background check didn't help.`
        : `Your application to ${def.company} was rejected.`;
    c.log.push({ age: c.age, text: msg, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  c.job = {
    id: def.id,
    title: def.ladder[0],
    company: def.company,
    salary: def.baseSalary,
    performance: 50,
    level: 0,
    field: def.field,
    yearsAtLevel: 0,
    yearsAtCompany: 0,
    burnout: 10,
    managerRel: 55,
    coworkerRel: 55,
    bonusPct: 0.1,
    careerGroup: def.field,
  };
  const msg = `You got hired as ${def.ladder[0]} at ${def.company}!`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function quitJob(input: Character): ActionResult {
  const c: Character = structuredClone(input);
  if (!c.job)
    return { character: input, message: "You have no job to quit.", tone: "bad", ok: false };
  const title = c.job.title;
  c.job = undefined;
  const msg = `You quit your job as ${title}.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export interface CollegeOption {
  name: string;
  def: import("./data").UniversityDef;
  cost: number;
  prestige: number;
  admitted: boolean;
}

export function collegeOptions(c: Character): CollegeOption[] {
  // Rigorous pathways (Honors, and especially HL-heavy IB) boost admissions.
  const score = c.stats.smarts + c.gpa * 5 + rigorAdmissionsBonus(c);
  const almaMaters = c.dynasty?.almaMaters ?? [];
  return UNIVERSITIES.map((u) => {
    // Legacy admissions (Build 11B): a family name in the alumni register
    // improves the odds — it never guarantees them.
    const legacyBonus = almaMaters.includes(u.name) ? 8 : 0;
    return {
      name: u.name,
      def: u,
      cost: u.cost,
      prestige: u.prestige,
      admitted: score + legacyBonus >= u.prestige,
    };
  });
}

/** File the FAFSA — computes the family contribution and aid eligibility. */
export function fileFafsa(input: Character): ActionResult {
  const c: Character = structuredClone(input);
  const f = computeFafsa(c);
  c.fafsa = {
    filed: true,
    householdIncome: f.householdIncome,
    parentAssets: f.parentAssets,
    householdSize: f.householdSize,
    efc: f.efc,
    grantEligible: f.grantEligible,
    loanEligible: f.loanEligible,
  };
  const msg = `FAFSA submitted. Estimated family contribution ${money(f.efc)}/yr; you qualify for ${money(f.grantEligible)}/yr in need-based grants.`;
  c.log.push({ age: c.age, text: msg, tone: f.grantEligible > 0 ? "good" : "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

/** Appeal the financial aid offer for a chance at more grant money. */
export function appealAid(input: Character): ActionResult {
  const c: Character = structuredClone(input);
  if (!c.fafsa?.filed) {
    return {
      character: input,
      message: "File the FAFSA before appealing for aid.",
      tone: "bad",
      ok: false,
    };
  }
  const hardship =
    (c.family.income < 60000 ? 0.3 : c.family.income < 100000 ? 0.15 : 0) +
    Math.min(0.3, c.family.debt / 200000) +
    (c.gpa >= 3.7 ? 0.2 : 0);
  const chance = 0.2 + hardship;
  if (Math.random() < chance) {
    const bump = randInt(3000, 9000);
    c.fafsa.grantEligible += bump;
    const msg = `Aid appeal approved! Your grants increased by ${money(bump)}/yr.`;
    c.log.push({ age: c.age, text: msg, tone: "good" });
    return { character: c, message: msg, tone: "good", ok: true };
  }
  const msg = "Your aid appeal was denied. No change this time.";
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

/** Accept a campus work-study job during college. */
export function acceptWorkStudy(input: Character, role: string): ActionResult {
  const c: Character = structuredClone(input);
  if (c.education !== "college" || !c.collegeFinance) {
    return {
      character: input,
      message: "You need to be enrolled in college for work-study.",
      tone: "bad",
      ok: false,
    };
  }
  const def = WORK_STUDY_JOBS.find((w) => w.role === role);
  if (!def)
    return { character: input, message: "Unknown work-study role.", tone: "bad", ok: false };
  c.collegeFinance.workStudyRole = def.role;
  c.collegeFinance.workStudyIncome = def.income;
  c.stats.smarts = clamp(c.stats.smarts + def.study);
  c.mentalHealth = clamp(c.mentalHealth - def.stress);
  const msg = `You took a work-study job as ${def.role} (${money(def.income)}/yr toward costs).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function enrollCollege(input: Character, letter: AidLetter): ActionResult {
  const c: Character = structuredClone(input);
  const uni = universityByName(letter.university);
  if (!uni) return { character: input, message: "Unknown university.", tone: "bad", ok: false };
  c.education = "college";
  c.university = uni.name;
  c.major = letter.major;
  c.edu.school = uni.name;
  c.edu.schoolPrestige = uni.prestige;
  c.livingArrangement = letter.living;
  c.edu.scholarships = letter.scholarships.map((s) => ({ ...s }));
  // reset per-year academic counters for the new stage
  c.edu.classRank = 0;
  c.edu.classSize = 0;
  const l = livingDef(letter.living);
  c.stats.happiness = clamp(c.stats.happiness + l.happiness);
  c.collegeFinance = {
    university: uni.name,
    major: letter.major,
    living: letter.living,
    prestige: uni.prestige,
    yearsPlanned: 4,
    yearsFunded: 0,
    tuition: letter.tuition,
    housing: letter.housing,
    books: letter.books,
    fees: letter.fees,
    parentContribution: letter.parentContribution,
    parentDecision: letter.parentDecision,
    workStudyIncome: 0,
    workStudyRole: undefined,
    totalScholarships: 0,
    totalGrants: 0,
    totalParent: 0,
    totalSavings: 0,
    totalWorkStudy: 0,
    totalLoans: 0,
    budget: [],
    appealed: false,
  };
  fundCollegeYear(c, c.log);
  const msg = `You enrolled at ${uni.name} to study ${letter.major}.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function eligibleJobDefs(c: Character): JobDef[] {
  const hasDegree = c.education === "graduated";
  return JOBS.filter(
    (j) =>
      c.age >= j.minAge &&
      c.stats.smarts >= j.minSmarts &&
      (!j.requiresDegree || hasDegree) &&
      (!j.degreeReq || c.edu.degrees.includes(j.degreeReq)) &&
      (!j.requiresBar || c.scores.bar === "passed"),
  );
}

// ---------- Exams & extracurriculars ----------

export type ExamKind = "sat" | "act" | "lsat" | "gmat" | "mcat" | "bar";

export function takeExam(input: Character, kind: ExamKind, correctRatio?: number): ActionResult {
  const c: Character = structuredClone(input);
  if (kind === "bar") {
    if (c.education !== "graduated") {
      return {
        character: input,
        message: "You need a degree before sitting the Bar Exam.",
        tone: "bad",
        ok: false,
      };
    }
    const base = (c.stats.smarts / 100) * 0.5 + (c.gpa / 4) * 0.2;
    const perf = correctRatio !== undefined ? correctRatio * 0.6 + base : base + 0.15;
    const pass = perf >= 0.55;
    c.scores.bar = pass ? "passed" : "failed";
    const msg = pass
      ? "You passed the Bar Exam! You're licensed to practice law."
      : "You failed the Bar Exam. You can retake it.";
    c.log.push({ age: c.age, text: msg, tone: pass ? "milestone" : "bad" });
    return { character: c, message: msg, tone: pass ? "milestone" : "bad", ok: true };
  }
  const score = generateScore(kind, c, correctRatio);
  c.scores[kind] = score;
  const msg = `You took the ${kind.toUpperCase()} and scored ${score}.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

const MAX_ASSIGNMENTS_PER_YEAR = 3;

/**
 * Complete an interactive assignment set. Feeds the running assignment
 * average that drives this year's GPA, and can earn awards for strong work.
 */
export function doAssignments(input: Character, correctRatio: number): ActionResult {
  const c: Character = structuredClone(input);
  if (!inSchool(c)) {
    return { character: input, message: "You're not in school right now.", tone: "bad", ok: false };
  }
  const n = c.edu.assignmentsThisYear ?? 0;
  if (n >= MAX_ASSIGNMENTS_PER_YEAR) {
    return {
      character: input,
      message: "You've finished all your assignments this year. Age up for more.",
      tone: "bad",
      ok: false,
    };
  }
  const pct = Math.round(correctRatio * 100);
  const prevAvg = c.edu.assignmentAvg ?? 0;
  c.edu.assignmentAvg = Math.round((prevAvg * n + pct) / (n + 1));
  c.edu.assignmentsThisYear = n + 1;
  c.edu.homework = clamp(c.edu.homework + Math.round((pct - 50) / 8));
  c.edu.studyHours += 3;
  if (pct >= 70) c.stats.smarts = clamp(c.stats.smarts + randInt(1, 3));

  let tone: LogTone = "good";
  let message = `You completed an assignment set and scored ${pct}%.`;
  if (pct === 100 && !c.edu.awards.some((a) => a.startsWith("Perfect Assignment"))) {
    c.edu.awards.push(`Perfect Assignment (age ${c.age})`);
    message = `Perfect score! You aced the assignment (100%).`;
  } else if (pct < 40) {
    tone = "bad";
    message = `You struggled with the assignment (${pct}%). Study more first.`;
  }
  c.log.push({ age: c.age, text: message, tone });
  return { character: c, message, tone, ok: true };
}

/**
 * Lock in the IB Diploma course selection (3 HL + 3 SL). Does not consume an
 * action — it's required course registration, not a discretionary activity.
 */
export function chooseIBCourses(input: Character, picks: IBPick[]): ActionResult {
  const c: Character = structuredClone(input);
  if (c.edu.pathway !== "ib") {
    return {
      character: input,
      message: "You're not enrolled in the IB Diploma Programme.",
      tone: "bad",
      ok: false,
    };
  }
  const v = validateIBSelection(picks);
  if (!v.ok) {
    const missing = v.requirements
      .filter((r) => !r.met)
      .map((r) => r.label)
      .join("; ");
    return {
      character: input,
      message: `Invalid IB selection — ${missing}.`,
      tone: "bad",
      ok: false,
    };
  }
  c.edu.courses = resolveIBSelection(picks);
  c.edu.needsCourseSelection = false;
  const hl = c.edu.courses
    .filter((x) => x.level === "HL")
    .map((x) => x.name)
    .join(", ");
  const sl = c.edu.courses
    .filter((x) => x.level === "SL")
    .map((x) => x.name)
    .join(", ");
  const msg = `IB courses locked in — HL: ${hl}. SL: ${sl}.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- K-12 school applications ----------

/** Apply to a private/religious/boarding school during a stage-entry window. */
export function applyK12School(
  input: Character,
  schoolId: string,
  interviewRatio?: number,
): ActionResult {
  const c: Character = structuredClone(input);
  const stage = c.pendingSchoolChoice;
  if (!stage) {
    return {
      character: input,
      message: "School applications aren't open right now.",
      tone: "bad",
      ok: false,
    };
  }
  const school = resolveSchool(c, schoolId, stage);
  if (!school) return { character: input, message: "Unknown school.", tone: "bad", ok: false };

  if ((c.k12Applied ?? []).includes(schoolId)) {
    return {
      character: input,
      message: `You already applied to ${school.name} this cycle.`,
      tone: "bad",
      ok: false,
    };
  }
  c.k12Applied = [...(c.k12Applied ?? []), schoolId];

  const est = admissionEstimate(c, school);
  let probability = est.probability;
  if (school.interview && interviewRatio !== undefined) {
    probability = Math.max(0.02, Math.min(0.97, probability + (interviewRatio - 0.5) * 0.5));
  }
  if (Math.random() > probability) {
    const msg = `${school.name} declined your application (entrance exam ${est.entranceExamScore}/100, ~${Math.round(probability * 100)}% odds). You can apply elsewhere or stay at ${c.edu.school}.`;
    c.log.push({
      age: c.age,
      text: `Your application to ${school.name} was rejected.`,
      tone: "bad",
    });
    return { character: c, message: msg, tone: "bad", ok: true };
  }

  const pkg = buildK12Package(c, school, est.entranceExamScore);
  c.k12Offer = pkg;
  const msg = `${school.name} accepted you! Entrance exam: ${est.entranceExamScore}/100. Review the financial package to enroll.`;
  c.log.push({ age: c.age, text: `You were accepted to ${school.name}.`, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

/** Enroll using the accepted offer's financial package. */
export function enrollK12(input: Character): ActionResult {
  const c: Character = structuredClone(input);
  const stage = c.pendingSchoolChoice;
  const offer = c.k12Offer;
  if (!stage || !offer) {
    return {
      character: input,
      message: "No accepted school offer to enroll with.",
      tone: "bad",
      ok: false,
    };
  }
  const school = resolveSchool(c, offer.schoolId, stage);
  if (!school) return { character: input, message: "Unknown school.", tone: "bad", ok: false };

  // A family simply cannot enroll if the leftover bill dwarfs their means.
  const capacity = c.family.savings + c.family.income * 0.35;
  if (offer.remaining > capacity) {
    return {
      character: input,
      message: `Your family can't cover the remaining ${money(offer.remaining)}/yr after aid. You'll need to stay at ${c.edu.school}.`,
      tone: "bad",
      ok: false,
    };
  }

  c.edu.school = school.name;
  c.edu.schoolPrestige = school.prestige;
  c.edu.schoolKind = school.kind;
  c.edu.k12Tuition = Math.max(0, school.tuition - offer.scholarship - offer.aid);
  c.currentSchoolId = school.id;
  const sc = k12ScholarshipRecord({ ...offer, tuition: school.tuition });
  if (sc) c.edu.scholarships.push(sc);
  if (school.kind === "boarding" && school.city !== c.city) {
    c.city = school.city;
    c.log.push({
      age: c.age,
      text: `You moved to ${school.city} to board at ${school.name}.`,
      tone: "neutral",
    });
  }
  c.stats.happiness = clamp(c.stats.happiness + 4);
  c.pendingSchoolChoice = undefined;
  c.k12Offer = undefined;
  const msg = `You enrolled at ${school.name} (${school.kind}). Net family cost: ${money(c.edu.k12Tuition)}/yr.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function declineK12Offer(input: Character): ActionResult {
  const c: Character = structuredClone(input);
  if (!c.k12Offer)
    return { character: input, message: "No offer to decline.", tone: "bad", ok: false };
  c.k12Offer = undefined;
  return {
    character: c,
    message: "You declined the offer. You can apply elsewhere or stay put.",
    tone: "neutral",
    ok: true,
  };
}

/** Stay at the default public school and close the application window. */
export function stayPublicSchool(input: Character): ActionResult {
  const c: Character = structuredClone(input);
  if (!c.pendingSchoolChoice) {
    return {
      character: input,
      message: "School applications aren't open right now.",
      tone: "bad",
      ok: false,
    };
  }
  c.pendingSchoolChoice = undefined;
  c.k12Offer = undefined;
  const msg = `You're staying at ${c.edu.school}.`;
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- IB examinations ----------

function applyIBResults(c: Character, ratios: Record<string, number>, log: LogEntry[]) {
  const results = (c.edu.courses ?? []).map((course) => ({
    courseId: course.id,
    name: course.name,
    level: course.level ?? "SL",
    score: ibSubjectScore(c, course.level ?? "SL", ratios[course.id] ?? 0.5),
  }));
  const subjectTotal = results.reduce((s, r) => s + r.score, 0);
  c.edu.ibResults = results;
  c.edu.ibTotal = subjectTotal + 3; // assumed full core points
  c.edu.needsIBExams = false;
  if (c.edu.ibTotal >= 40) c.edu.awards.push(`IB Scholar — ${c.edu.ibTotal}/45 (age ${c.age})`);
  log.push({
    age: c.age,
    text: `IB results are in: ${c.edu.ibTotal}/45 across your six subjects.`,
    tone: c.edu.ibTotal >= 36 ? "milestone" : "neutral",
  });
}

function autoSitIBExams(c: Character, log: LogEntry[]) {
  const ratios: Record<string, number> = {};
  for (const course of c.edu.courses ?? []) {
    ratios[course.id] = Math.max(
      0,
      Math.min(1, c.stats.smarts / 100 + (Math.random() * 0.3 - 0.2)),
    );
  }
  applyIBResults(c, ratios, log);
}

/** Complete the interactive IB examinations (one quiz ratio per subject). */
export function completeIBExams(input: Character, ratios: Record<string, number>): ActionResult {
  const c: Character = structuredClone(input);
  if (!c.edu.needsIBExams || (c.edu.courses?.length ?? 0) !== 6) {
    return {
      character: input,
      message: "You have no IB examinations scheduled.",
      tone: "bad",
      ok: false,
    };
  }
  applyIBResults(c, ratios, c.log);
  const msg = `Final IB score: ${c.edu.ibTotal}/45. ${(c.edu.ibTotal ?? 0) >= 40 ? "Outstanding — top-university material." : (c.edu.ibTotal ?? 0) >= 30 ? "A strong diploma result." : "You passed, but universities will notice the score."}`;
  return {
    character: c,
    message: msg,
    tone: (c.edu.ibTotal ?? 0) >= 36 ? "milestone" : "neutral",
    ok: true,
  };
}

// ---------- Graduate school ----------

export function applyGradProgram(input: Character, kind: GradProgramKind): ActionResult {
  const c: Character = structuredClone(input);
  const def = GRAD_PROGRAMS.find((g) => g.kind === kind);
  if (!def) return { character: input, message: "Unknown program.", tone: "bad", ok: false };
  if (c.education !== "graduated") {
    return {
      character: input,
      message: "You need a bachelor's degree first.",
      tone: "bad",
      ok: false,
    };
  }
  if (!spendAction(c)) {
    return {
      character: input,
      message: "No energy left this year. Age up first.",
      tone: "bad",
      ok: false,
    };
  }
  const adm = gradAdmission(c, def);
  if (!adm.eligible) {
    const missing = adm.requirements
      .filter((r) => !r.met)
      .map((r) => r.label)
      .join("; ");
    return {
      character: input,
      message: `You don't meet the requirements yet — ${missing}.`,
      tone: "bad",
      ok: false,
    };
  }
  if (Math.random() > adm.probability) {
    const msg = `${def.school} rejected your ${def.name} application (~${Math.round(adm.probability * 100)}% odds). Strengthen your resume and reapply next year.`;
    c.log.push({ age: c.age, text: `Rejected from ${def.school} (${def.name}).`, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  if (c.job) {
    c.log.push({
      age: c.age,
      text: `You left your job as ${c.job.title} to attend ${def.school}.`,
      tone: "neutral",
    });
    c.job = undefined;
  }
  c.education = "gradschool";
  c.gradProgram = buildGradState(def);
  c.edu.school = def.school;
  c.edu.schoolPrestige = def.prestige;
  c.university = def.school;
  const msg = `Accepted! You enrolled in the ${def.name} at ${def.school} — ${def.years} years, ${money(def.tuition)}/yr tuition (loans and fellowships apply).`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Internships ----------

export function applyInternship(input: Character, defId: string): ActionResult {
  const c: Character = structuredClone(input);
  const elig = internshipEligibility(c);
  if (!elig.eligible) {
    return { character: input, message: elig.reason ?? "Not eligible.", tone: "bad", ok: false };
  }
  const def = INTERNSHIPS.find((d) => d.id === defId);
  if (!def) return { character: input, message: "Unknown internship.", tone: "bad", ok: false };
  if (def.level !== elig.level) {
    return {
      character: input,
      message: "That program isn't open to your level right now.",
      tone: "bad",
      ok: false,
    };
  }
  // Big Law Summer Associate roles are reserved for JD / JD-MBA students.
  if (def.id === "co-biglaw" && c.gradProgram?.kind !== "jd" && c.gradProgram?.kind !== "jdmba") {
    return {
      character: input,
      message: "Big Law Summer Associate roles are only open to JD or JD/MBA students.",
      tone: "bad",
      ok: false,
    };
  }
  // Only one application to a given program per year.
  if ((c.edu.internAppliedThisYear ?? []).includes(def.id)) {
    return {
      character: input,
      message: "You already applied to that internship this year. Try another or age up.",
      tone: "bad",
      ok: false,
    };
  }
  if ((c.edu.internships ?? []).some((i) => i.id === def.id && i.age === c.age)) {
    return {
      character: input,
      message: "You already interned there this year.",
      tone: "bad",
      ok: false,
    };
  }
  if (!spendAction(c)) {
    return {
      character: input,
      message: "No energy left this year. Age up first.",
      tone: "bad",
      ok: false,
    };
  }
  c.edu.internAppliedThisYear = [...(c.edu.internAppliedThisYear ?? []), def.id];

  const { probability } = internshipChance(c, def);
  const roll = Math.random();
  if (roll > probability) {
    const waitlisted = roll < probability + 0.12;
    const msg = waitlisted
      ? `${def.org} waitlisted you — close, but no spot this cycle. Your odds improve next year.`
      : `${def.org} rejected your application (~${Math.round(probability * 100)}% odds).`;
    if (waitlisted) c.networking = clamp((c.networking ?? 0) + 3);
    c.log.push({
      age: c.age,
      text: `${def.name} application: ${waitlisted ? "waitlisted" : "rejected"}.`,
      tone: "bad",
    });
    return { character: c, message: msg, tone: "bad", ok: true };
  }

  // Accepted — resolve the summer immediately.
  const performance = Math.min(
    1,
    (c.stats.smarts / 100) * 0.6 + (c.gpa / 4) * 0.3 + Math.random() * 0.25,
  );
  const recLetter = performance > 0.62 && Math.random() < 0.5;
  const returnOffer = def.level === "college" && performance > 0.7 && Math.random() < 0.45;
  const collegeYear = c.education === "college" ? Math.min(4, Math.max(1, c.age - 17)) : 0;
  const fullTime =
    def.level === "college" &&
    performance > 0.75 &&
    (collegeYear >= 3 || c.education === "graduated" || c.education === "gradschool") &&
    Math.random() < 0.5;

  const record = {
    id: def.id,
    name: def.name,
    org: def.org,
    field: def.field,
    age: c.age,
    level: def.level,
    outcome: (fullTime ? "fulltime" : returnOffer ? "return" : "accepted") as
      "accepted" | "return" | "fulltime",
    recLetter,
  };
  c.edu.internships = [...(c.edu.internships ?? []), record];
  if (recLetter) c.edu.recLetters = (c.edu.recLetters ?? 0) + 1;
  c.networking = clamp((c.networking ?? 0) + randInt(8, 15));
  c.stats.happiness = clamp(c.stats.happiness + 3);
  c.stats.smarts = clamp(c.stats.smarts + randInt(1, 3));

  const extras: string[] = [];
  if (recLetter) extras.push("a recommendation letter");
  if (returnOffer) extras.push("a return offer");

  if (fullTime) {
    const FIELD_TO_JOB: Record<string, string> = {
      Consulting: "consultant",
      Finance: "analyst",
      Technology: "swe",
      Law: "biglaw",
      Healthcare: "physician",
    };
    const jobId = FIELD_TO_JOB[def.field];
    const jobDef = JOBS.find((j) => j.id === jobId);
    if (jobDef) {
      c.jobOffers = c.jobOffers ?? [];
      c.jobOffers.push({
        jobId: jobDef.id,
        title: jobDef.ladder[0],
        company: jobDef.company,
        salary: Math.round(jobDef.baseSalary * 1.08),
        source: `Return offer from your ${def.name} internship`,
        expiresAge: c.age + 3,
      });
      extras.push(
        `a full-time offer (${jobDef.ladder[0]}, ${money(Math.round(jobDef.baseSalary * 1.08))})`,
      );
    }
  }

  const msg = `You completed the ${def.name} internship at ${def.org}!${extras.length ? ` You earned ${extras.join(", ")}.` : ""}`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Job offers ----------

export function acceptJobOffer(input: Character, index: number): ActionResult {
  const c: Character = structuredClone(input);
  const offer = c.jobOffers?.[index];
  if (!offer)
    return {
      character: input,
      message: "That offer is no longer available.",
      tone: "bad",
      ok: false,
    };
  const def = JOBS.find((j) => j.id === offer.jobId);
  if (!def)
    return {
      character: input,
      message: "That offer is no longer available.",
      tone: "bad",
      ok: false,
    };
  if (def.degreeReq && !c.edu.degrees.includes(def.degreeReq)) {
    return {
      character: input,
      message: `You need your ${def.degreeReq} before starting this role.`,
      tone: "bad",
      ok: false,
    };
  }
  if (def.requiresBar && c.scores.bar !== "passed") {
    return {
      character: input,
      message: "You must pass the bar exam before starting this role.",
      tone: "bad",
      ok: false,
    };
  }
  c.job = {
    id: def.id,
    title: offer.title,
    company: offer.company,
    salary: offer.salary,
    performance: 55,
    level: 0,
    field: def.field,
    yearsAtLevel: 0,
    yearsAtCompany: 0,
    burnout: 10,
    managerRel: 55,
    coworkerRel: 55,
    bonusPct: 0.12,
    careerGroup: def.field,
  };
  c.jobOffers = (c.jobOffers ?? []).filter((_, i) => i !== index);
  const msg = `You accepted the offer: ${offer.title} at ${offer.company}, ${money(offer.salary)}/yr.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function joinExtracurricular(
  input: Character,
  kind: "club" | "sport",
  name: string,
): ActionResult {
  const c: Character = structuredClone(input);
  const total = c.edu.clubs.length + c.edu.sports.length;
  if (
    total >= MAX_EXTRACURRICULARS &&
    !c.edu.clubs.includes(name) &&
    !c.edu.sports.includes(name)
  ) {
    return {
      character: input,
      message: `You can join at most ${MAX_EXTRACURRICULARS} activities. Drop one first.`,
      tone: "bad",
      ok: false,
    };
  }
  const list = kind === "club" ? c.edu.clubs : c.edu.sports;
  if (list.includes(name)) {
    return { character: input, message: `You're already in ${name}.`, tone: "bad", ok: false };
  }
  list.push(name);
  c.stats.happiness = clamp(c.stats.happiness + randInt(2, 5));
  if (kind === "sport") {
    c.fitness = clamp(c.fitness + randInt(3, 6));
    c.stats.health = clamp(c.stats.health + randInt(1, 3));
  } else {
    c.stats.smarts = clamp(c.stats.smarts + randInt(1, 2));
  }
  const msg = `You joined ${name}.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

/** Resolve one interactive extracurricular competition and remove it from the queue. */
export function resolveChallenge(
  input: Character,
  challenge: ECChallenge,
  ratio: number,
): ActionResult {
  const c: Character = structuredClone(input);
  const res = resolveECOutcome(c, challenge, ratio, c.log);
  c.pendingChallenges = (c.pendingChallenges ?? []).filter(
    (x) => !(x.activity === challenge.activity && x.event === challenge.event),
  );
  return { character: c, message: res.message, tone: res.tone, ok: true };
}

export const ACTIONS_PER_YEAR = MAX_ACTIONS;

/**
 * Politics actions share the yearly energy pool. politics.ts can't import
 * engine.ts (engine already imports politics), so the spender is passed in.
 */
export function trySpendEnergy(c: Character): boolean {
  return spendAction(c);
}
