import type { Character, K12Offer, Scholarship, SchoolStage } from "./types";
import { citiesFor } from "./data";
import { clamp, randInt } from "./util";

// ---------------------------------------------------------------------------
// Elite K-12 school system. Schools are data-driven so more can be added.
// Every school belongs to a real city in the correct country.
// ---------------------------------------------------------------------------

export type SchoolKind = "public" | "private" | "religious" | "boarding";

export interface SchoolDef {
  id: string;
  name: string;
  city: string;
  country: string;
  kind: SchoolKind;
  stages: SchoolStage[]; // which stage entries this school accepts
  prestige: number; // 1-100
  tuition: number; // annual, 0 for public
  academics: number; // 1-100
  athletics: number; // 1-100
  arts: number; // 1-100
  alumniNetwork: number; // 1-100
  acceptanceRate: number; // 0-1
  minGpa?: number; // for middle/high entries
  entranceExam: boolean;
  interview: boolean;
}

const ALL: SchoolStage[] = ["elementary", "middle", "high"];

export const SCHOOLS: SchoolDef[] = [
  // ---- Flagship elite schools (one+ per country) ----
  {
    id: "ucc",
    name: "Upper Canada College",
    city: "Toronto",
    country: "Canada",
    kind: "private",
    stages: ALL,
    prestige: 93,
    tuition: 42000,
    academics: 95,
    athletics: 85,
    arts: 82,
    alumniNetwork: 94,
    acceptanceRate: 0.18,
    minGpa: 3.5,
    entranceExam: true,
    interview: true,
  },
  {
    id: "exeter",
    name: "Phillips Exeter Academy",
    city: "Exeter, New Hampshire",
    country: "United States",
    kind: "boarding",
    stages: ["middle", "high"],
    prestige: 97,
    tuition: 62000,
    academics: 98,
    athletics: 88,
    arts: 90,
    alumniNetwork: 97,
    acceptanceRate: 0.1,
    minGpa: 3.7,
    entranceExam: true,
    interview: true,
  },
  {
    id: "hw",
    name: "Harvard-Westlake School",
    city: "Los Angeles",
    country: "United States",
    kind: "private",
    stages: ALL,
    prestige: 92,
    tuition: 47000,
    academics: 94,
    athletics: 90,
    arts: 92,
    alumniNetwork: 90,
    acceptanceRate: 0.16,
    minGpa: 3.5,
    entranceExam: true,
    interview: true,
  },
  {
    id: "eton",
    name: "Eton College",
    city: "Windsor",
    country: "United Kingdom",
    kind: "boarding",
    stages: ["middle", "high"],
    prestige: 98,
    tuition: 60000,
    academics: 97,
    athletics: 92,
    arts: 88,
    alumniNetwork: 99,
    acceptanceRate: 0.12,
    minGpa: 3.6,
    entranceExam: true,
    interview: true,
  },
  {
    id: "westminster",
    name: "Westminster School",
    city: "London",
    country: "United Kingdom",
    kind: "private",
    stages: ["middle", "high"],
    prestige: 94,
    tuition: 39000,
    academics: 97,
    athletics: 78,
    arts: 86,
    alumniNetwork: 92,
    acceptanceRate: 0.15,
    minGpa: 3.6,
    entranceExam: true,
    interview: true,
  },
  {
    id: "geelong",
    name: "Geelong Grammar School",
    city: "Geelong",
    country: "Australia",
    kind: "boarding",
    stages: ALL,
    prestige: 90,
    tuition: 45000,
    academics: 88,
    athletics: 90,
    arts: 85,
    alumniNetwork: 89,
    acceptanceRate: 0.25,
    minGpa: 3.2,
    entranceExam: true,
    interview: true,
  },
  {
    id: "salem",
    name: "Schule Schloss Salem",
    city: "Salem",
    country: "Germany",
    kind: "boarding",
    stages: ["middle", "high"],
    prestige: 89,
    tuition: 41000,
    academics: 90,
    athletics: 84,
    arts: 86,
    alumniNetwork: 87,
    acceptanceRate: 0.28,
    minGpa: 3.2,
    entranceExam: true,
    interview: true,
  },
  {
    id: "roches",
    name: "\u00c9cole des Roches",
    city: "Verneuil-sur-Avre",
    country: "France",
    kind: "boarding",
    stages: ALL,
    prestige: 86,
    tuition: 38000,
    academics: 86,
    athletics: 82,
    arts: 84,
    alumniNetwork: 84,
    acceptanceRate: 0.3,
    minGpa: 3.0,
    entranceExam: true,
    interview: true,
  },
  {
    id: "keio",
    name: "Keio Senior High School",
    city: "Yokohama",
    country: "Japan",
    kind: "private",
    stages: ["high"],
    prestige: 91,
    tuition: 12000,
    academics: 94,
    athletics: 82,
    arts: 76,
    alumniNetwork: 93,
    acceptanceRate: 0.2,
    minGpa: 3.5,
    entranceExam: true,
    interview: false,
  },
  {
    id: "stpauls-sp",
    name: "St. Paul's School",
    city: "S\u00e3o Paulo",
    country: "Brazil",
    kind: "private",
    stages: ALL,
    prestige: 87,
    tuition: 28000,
    academics: 89,
    athletics: 80,
    arts: 82,
    alumniNetwork: 85,
    acceptanceRate: 0.3,
    minGpa: 3.2,
    entranceExam: true,
    interview: true,
  },
  {
    id: "loyola-abj",
    name: "Loyola Jesuit College",
    city: "Abuja",
    country: "Nigeria",
    kind: "boarding",
    stages: ["middle", "high"],
    prestige: 84,
    tuition: 9000,
    academics: 90,
    athletics: 78,
    arts: 72,
    alumniNetwork: 80,
    acceptanceRate: 0.15,
    minGpa: 3.3,
    entranceExam: true,
    interview: true,
  },
  {
    id: "doon",
    name: "The Doon School",
    city: "Dehradun",
    country: "India",
    kind: "boarding",
    stages: ["middle", "high"],
    prestige: 88,
    tuition: 15000,
    academics: 91,
    athletics: 86,
    arts: 80,
    alumniNetwork: 91,
    acceptanceRate: 0.14,
    minGpa: 3.4,
    entranceExam: true,
    interview: true,
  },
];

/** Religious school for a city — data-driven fallback per country. */
const RELIGIOUS_NAMES: Record<string, string> = {
  "United States": "St. Ignatius Preparatory",
  "United Kingdom": "St. Bede's College",
  Canada: "St. Michael's College School",
  Australia: "St. Aloysius' College",
  Germany: "Canisius-Kolleg",
  France: "Coll\u00e8ge Stanislas",
  Japan: "St. Mary's International School",
  Brazil: "Col\u00e9gio S\u00e3o Bento",
  Nigeria: "St. Gregory's College",
  India: "St. Xavier's Collegiate School",
};

export function religiousSchoolFor(country: string, city: string): SchoolDef {
  return {
    id: `religious-${country.toLowerCase().replace(/\s+/g, "-")}`,
    name: RELIGIOUS_NAMES[country] ?? "St. Joseph's Academy",
    city,
    country,
    kind: "religious",
    stages: ALL,
    prestige: randInt(62, 74),
    tuition: 12000,
    academics: 76,
    athletics: 70,
    arts: 68,
    alumniNetwork: 66,
    acceptanceRate: 0.55,
    minGpa: 2.8,
    entranceExam: false,
    interview: true,
  };
}

export function publicSchoolFor(city: string, country: string, stage: SchoolStage): SchoolDef {
  const label =
    stage === "elementary"
      ? "Elementary School"
      : stage === "middle"
        ? "Middle School"
        : "High School";
  return {
    id: `public-${stage}`,
    name: `${city} Public ${label}`,
    city,
    country,
    kind: "public",
    stages: [stage],
    prestige: randInt(45, 62),
    tuition: 0,
    academics: 58,
    athletics: 60,
    arts: 55,
    alumniNetwork: 40,
    acceptanceRate: 1,
    entranceExam: false,
    interview: false,
  };
}

export function schoolById(id: string): SchoolDef | undefined {
  return SCHOOLS.find((s) => s.id === id);
}

/**
 * Schools a player can apply to at a stage entry: private/religious schools in
 * their own country, plus boarding schools worldwide (boarders relocate).
 */
export function schoolOptions(c: Character, stage: SchoolStage): SchoolDef[] {
  const domestic = SCHOOLS.filter((s) => s.country === c.country && s.stages.includes(stage));
  const boardingAbroad = SCHOOLS.filter(
    (s) => s.country !== c.country && s.kind === "boarding" && s.stages.includes(stage),
  );
  const religious = religiousSchoolFor(c.country, c.city);
  const list = [...domestic];
  if (religious.stages.includes(stage)) list.push(religious);
  list.push(...boardingAbroad);
  // De-dupe and sort by prestige descending.
  const seen = new Set<string>();
  return list
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .sort((a, b) => b.prestige - a.prestige);
}

/** Resolve any school id (including generated public/religious). */
export function resolveSchool(c: Character, id: string, stage: SchoolStage): SchoolDef | undefined {
  if (id.startsWith("public-")) return publicSchoolFor(c.city, c.country, stage);
  if (id.startsWith("religious-")) return religiousSchoolFor(c.country, c.city);
  return schoolById(id);
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

export interface AdmissionEstimate {
  probability: number; // 0-1
  requirements: { label: string; met: boolean }[];
  entranceExamScore: number; // 0-100, simulated performance
}

function parentRelationshipAvg(c: Character): number {
  const parents = c.relationships.filter(
    (r) => (r.type === "mother" || r.type === "father") && r.alive,
  );
  if (!parents.length) return 50;
  return parents.reduce((s, r) => s + r.relationship, 0) / parents.length;
}

/** Estimate admission odds and show requirement status before applying. */
export function admissionEstimate(c: Character, school: SchoolDef): AdmissionEstimate {
  const hasGpa = c.gpa > 0;
  const gpaOk = school.minGpa === undefined || !hasGpa || c.gpa >= school.minGpa;
  const examScore = clamp(
    Math.round(c.stats.smarts * 0.7 + (hasGpa ? (c.gpa / 4) * 30 : 15) + randInt(-8, 8)),
  );
  const character = c.edu.disciplineIncidents <= 1;
  const interviewScore = parentRelationshipAvg(c) * 0.5 + c.stats.happiness * 0.3 + 20;

  let p = school.acceptanceRate;
  if (gpaOk && hasGpa && school.minGpa) p += Math.min(0.3, (c.gpa - school.minGpa) * 0.25);
  if (!gpaOk) p *= 0.15;
  p += ((examScore - 60) / 100) * 0.5;
  if (school.interview) p += ((interviewScore - 55) / 100) * 0.2;
  if (!character) p -= 0.25;
  // Leadership / extracurricular polish
  p += Math.min(0.12, ((c.edu.leadership?.length ?? 0) + c.edu.clubs.length * 0.5) * 0.03);
  // Wealthy families are, realistically, favored a little.
  if (c.family.tier === "wealthy") p += 0.08;
  if (c.family.tier === "affluent") p += 0.04;

  const requirements = [
    ...(school.minGpa !== undefined
      ? [{ label: `Minimum GPA ${school.minGpa.toFixed(1)}`, met: gpaOk }]
      : []),
    ...(school.entranceExam ? [{ label: "Entrance exam", met: examScore >= 55 }] : []),
    ...(school.interview ? [{ label: "Parent interview", met: interviewScore >= 50 }] : []),
    { label: "Character record", met: character },
    {
      label: `Tuition $${school.tuition.toLocaleString()}/yr (aid available)`,
      met: true,
    },
  ];

  return {
    probability: Math.max(0.02, Math.min(0.95, p)),
    requirements,
    entranceExamScore: examScore,
  };
}

// ---------------------------------------------------------------------------
// Financial aid & merit scholarships — deliberately more competitive than
// university aid. Most applicants get little; exceptional need + performance
// earns real grants.
// ---------------------------------------------------------------------------

export interface K12Package extends K12Offer {
  tuition: number;
}

export function buildK12Package(c: Character, school: SchoolDef, examScore: number): K12Package {
  const tuition = school.tuition;
  let scholarship = 0;
  let scholarshipName: string | undefined;

  // Merit scholarships (one, the best fit)
  const gpaStrong = c.gpa >= 3.8 || (c.gpa === 0 && c.stats.smarts >= 85);
  if (gpaStrong && examScore >= 85) {
    scholarship = Math.round(tuition * 0.35);
    scholarshipName = "Academic Excellence Scholarship";
  } else if ((c.edu.leadership?.length ?? 0) >= 1 && examScore >= 70) {
    scholarship = Math.round(tuition * 0.2);
    scholarshipName = "Leadership Scholarship";
  } else if (c.edu.sports.length >= 1 && c.fitness >= 75) {
    scholarship = Math.round(tuition * 0.25);
    scholarshipName = "Athletic Scholarship";
  } else if (c.edu.clubs.includes("Debate Team") && c.stats.smarts >= 70) {
    scholarship = Math.round(tuition * 0.18);
    scholarshipName = "Debate Scholarship";
  }

  // Need-based aid — stingy. Only low-income + strong performance gets much.
  let aid = 0;
  const income = c.family.income;
  const strong = examScore >= 75 || c.gpa >= 3.6;
  if (income < 50000 && strong) aid = Math.round(tuition * 0.55);
  else if (income < 90000 && strong) aid = Math.round(tuition * 0.3);
  else if (income < 90000) aid = Math.round(tuition * 0.1);

  const afterAwards = Math.max(0, tuition - scholarship - aid);
  // Parents contribute what they can from income & savings.
  const capacity = Math.round(c.family.income * 0.18 + c.family.savings * 0.06);
  const parentContribution = Math.min(afterAwards, capacity);
  const remaining = afterAwards - parentContribution;

  return {
    schoolId: school.id,
    tuition,
    scholarship,
    scholarshipName,
    aid,
    parentContribution,
    remaining,
  };
}

/** GPA bump/drag from a school's academic rating, applied in the GPA model. */
export function schoolAcademicsBonus(c: Character): number {
  // Prestigious academics push students; weak schools drag slightly.
  const p = c.edu.schoolPrestige ?? 55;
  return ((p - 55) / 100) * 0.2; // -0.03 .. +0.09 roughly
}

export function k12ScholarshipRecord(pkg: K12Package): Scholarship | null {
  if (!pkg.scholarship || !pkg.scholarshipName) return null;
  return {
    name: pkg.scholarshipName,
    amount: pkg.scholarship,
    kind: "merit",
    reason: "Private school merit award",
    renewable: true,
    minGpa: 3.0,
    status: "active",
  };
}
