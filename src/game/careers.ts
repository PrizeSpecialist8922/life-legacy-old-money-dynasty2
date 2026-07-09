import { JOBS } from "./data";
import type { JobDef } from "./data";
import { eligibleJobDefs } from "./engine";
import type { Character } from "./types";

// ---------------------------------------------------------------------------
// Special Careers Hub — curated career groups with requirements, ladders and
// the live job listings a player can currently apply to.
// ---------------------------------------------------------------------------

export interface CareerGroup {
  id: string;
  name: string;
  jobIds: string[]; // JobDefs that belong to this group
  requiredEducation: string;
  requiredGpa: string;
  requiredExams: string;
  requiredLicenses: string;
  recommendedSchools: string;
  prestige: number; // 1-100
  avgSalary: string;
  ladder: string[];
  workLifeBalance: number; // 1-100 (higher = better balance)
  difficulty: number; // 1-100 (higher = harder to break in)
}

export const CAREER_GROUPS: CareerGroup[] = [
  {
    id: "law",
    name: "Law",
    jobIds: ["biglaw"],
    requiredEducation: "Bachelor's + JD (law school)",
    requiredGpa: "3.5+ recommended",
    requiredExams: "LSAT, then the Bar Exam",
    requiredLicenses: "State Bar admission required",
    recommendedSchools: "Harvard, Stanford, Yale, Columbia",
    prestige: 90,
    avgSalary: "$215,000",
    ladder: [
      "Legal Intern",
      "Summer Associate",
      "Associate",
      "Senior Associate",
      "Counsel",
      "Partner",
    ],
    workLifeBalance: 30,
    difficulty: 92,
  },
  {
    id: "consulting",
    name: "Consulting",
    jobIds: ["consultant"],
    requiredEducation: "Bachelor's (MBA for senior roles)",
    requiredGpa: "3.6+ for elite firms",
    requiredExams: "None (case interviews)",
    requiredLicenses: "None",
    recommendedSchools: "Harvard, Wharton, Booth, MIT",
    prestige: 86,
    avgSalary: "$100,000+",
    ladder: ["Business Analyst", "Consultant", "Engagement Manager", "Partner"],
    workLifeBalance: 35,
    difficulty: 85,
  },
  {
    id: "ibanking",
    name: "Investment Banking",
    jobIds: ["analyst"],
    requiredEducation: "Bachelor's (MBA for VP+)",
    requiredGpa: "3.6+ from a target school",
    requiredExams: "None (technicals)",
    requiredLicenses: "Series 79/63 (on the job)",
    recommendedSchools: "Wharton, Harvard, Columbia, NYU Stern",
    prestige: 88,
    avgSalary: "$110,000+ base + bonus",
    ladder: ["Analyst", "Associate", "Vice President", "Managing Director", "Partner"],
    workLifeBalance: 20,
    difficulty: 90,
  },
  {
    id: "medicine",
    name: "Medicine",
    jobIds: ["physician"],
    requiredEducation: "Bachelor's + MD + Residency",
    requiredGpa: "3.7+ (pre-med)",
    requiredExams: "MCAT, USMLE boards",
    requiredLicenses: "State medical license",
    recommendedSchools: "Johns Hopkins, Harvard, UCSF",
    prestige: 93,
    avgSalary: "$250,000+ (attending)",
    ladder: [
      "Medical Student",
      "Resident",
      "Attending Physician",
      "Senior Physician",
      "Chief of Medicine",
    ],
    workLifeBalance: 25,
    difficulty: 95,
  },
  {
    id: "technology",
    name: "Technology",
    jobIds: ["swe"],
    requiredEducation: "Bachelor's in CS or equivalent",
    requiredGpa: "3.0+ (skills matter more)",
    requiredExams: "None (coding interviews)",
    requiredLicenses: "None",
    recommendedSchools: "MIT, Stanford, Berkeley, CMU",
    prestige: 82,
    avgSalary: "$95,000–$300,000+",
    ladder: [
      "Software Engineer",
      "Senior Engineer",
      "Staff Engineer",
      "Engineering Manager",
      "VP of Engineering",
    ],
    workLifeBalance: 60,
    difficulty: 78,
  },
  {
    id: "accounting",
    name: "Accounting",
    jobIds: ["accountant"],
    requiredEducation: "Bachelor's in Accounting",
    requiredGpa: "3.0+",
    requiredExams: "CPA exam",
    requiredLicenses: "CPA license for senior roles",
    recommendedSchools: "UT Austin, BYU, Illinois",
    prestige: 68,
    avgSalary: "$62,000–$180,000",
    ladder: ["Staff Accountant", "Senior Accountant", "Manager", "Partner"],
    workLifeBalance: 55,
    difficulty: 60,
  },
  {
    id: "engineering",
    name: "Engineering",
    jobIds: ["engineer"],
    requiredEducation: "Bachelor's in Engineering",
    requiredGpa: "3.0+",
    requiredExams: "FE / PE for licensure",
    requiredLicenses: "PE license (senior roles)",
    recommendedSchools: "MIT, Georgia Tech, Michigan",
    prestige: 72,
    avgSalary: "$72,000–$160,000",
    ladder: ["Junior Engineer", "Engineer", "Senior Engineer", "Engineering Manager"],
    workLifeBalance: 65,
    difficulty: 66,
  },
  {
    id: "politics",
    name: "Politics",
    jobIds: ["politician"],
    requiredEducation: "Any (Political Science common)",
    requiredGpa: "Not required",
    requiredExams: "None",
    requiredLicenses: "Elected — build your career in the Politics tab",
    recommendedSchools: "Georgetown, Harvard Kennedy",
    prestige: 75,
    avgSalary: "$45,000–$200,000",
    ladder: ["Campaign Staffer", "City Council Member", "Mayor", "Governor", "Senator"],
    workLifeBalance: 40,
    difficulty: 80,
  },
  {
    id: "athlete",
    name: "Professional Athlete",
    jobIds: ["athlete"],
    requiredEducation: "None (talent-driven)",
    requiredGpa: "N/A",
    requiredExams: "None",
    requiredLicenses: "League contract",
    recommendedSchools: "Athletic scholarship programs",
    prestige: 80,
    avgSalary: "Highly variable",
    ladder: ["Semi-Pro Athlete", "Professional Athlete", "All-Star", "Hall of Famer"],
    workLifeBalance: 45,
    difficulty: 88,
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    jobIds: ["entrepreneur"],
    requiredEducation: "None (grit + skills)",
    requiredGpa: "N/A",
    requiredExams: "None",
    requiredLicenses: "Business registration",
    recommendedSchools: "Stanford, MIT (optional)",
    prestige: 70,
    avgSalary: "$0 to millions",
    ladder: ["Founder", "CEO (Seed)", "CEO (Series A)", "CEO (Scale-up)"],
    workLifeBalance: 25,
    difficulty: 85,
  },
  {
    id: "entertainment",
    name: "Entertainment",
    jobIds: ["entertainer"],
    requiredEducation: "None (talent-driven)",
    requiredGpa: "N/A",
    requiredExams: "None",
    requiredLicenses: "None",
    recommendedSchools: "Juilliard, NYU Tisch (optional)",
    prestige: 65,
    avgSalary: "Highly variable",
    ladder: ["Aspiring Entertainer", "Working Performer", "Featured Act", "Headliner", "Star"],
    workLifeBalance: 45,
    difficulty: 82,
  },
];

export function jobDefsForGroup(group: CareerGroup): JobDef[] {
  return group.jobIds.map((id) => JOBS.find((j) => j.id === id)).filter((j): j is JobDef => !!j);
}

export interface CareerJobListing {
  def: JobDef;
  eligible: boolean;
  reasons: string[];
}

/**
 * Explain whether the player can apply to a given role, enforcing hard gates
 * (age, degree, licenses, smarts) so the UI can show eligibility clearly.
 */
export function jobListing(c: Character, def: JobDef): CareerJobListing {
  const eligibleIds = new Set(eligibleJobDefs(c).map((j) => j.id));
  const reasons: string[] = [];
  if (c.age < def.minAge) reasons.push(`Requires age ${def.minAge}+`);
  if (c.stats.smarts < def.minSmarts) reasons.push(`Requires ${def.minSmarts}+ smarts`);
  if (def.requiresDegree && c.education !== "graduated")
    reasons.push("Requires a bachelor's degree");
  if (def.degreeReq && !c.edu.degrees.includes(def.degreeReq))
    reasons.push(`Requires a ${def.degreeReq}`);
  if (def.requiresBar && c.scores.bar !== "passed") reasons.push("Requires passing the Bar Exam");
  const eligible = eligibleIds.has(def.id) && reasons.length === 0;
  return { def, eligible, reasons };
}

/** Big Law Summer Associate roles are reserved for JD / JD-MBA students. */
export function canApplyBigLawSummer(c: Character): boolean {
  return c.gradProgram?.kind === "jd" || c.gradProgram?.kind === "jdmba";
}

export function promotionReadiness(c: Character): number {
  if (!c.job) return 0;
  const perf = c.job.performance;
  const tenure = Math.min(30, (c.job.yearsAtLevel ?? 0) * 12);
  const burnoutDrag = (c.job.burnout ?? 0) * 0.15;
  return Math.max(0, Math.min(100, Math.round(perf * 0.7 + tenure * 0.6 - burnoutDrag)));
}
