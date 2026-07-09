import type { Character } from "./types";
import { resumeScore } from "./resume";
import { randInt } from "./util";

// ---------------------------------------------------------------------------
// Internships — a dedicated system, separate from Jobs and Education.
// Available in high school and college/grad school; locked after age 30.
// ---------------------------------------------------------------------------

export interface InternshipDef {
  id: string;
  name: string;
  org: string;
  field: string;
  level: "high" | "college";
  prestige: number; // 1-100, drives difficulty & payoff
  minGpa: number;
  blurb: string;
}

export const INTERNSHIPS: InternshipDef[] = [
  // High school
  {
    id: "hs-law",
    name: "Local Law Office",
    org: "Hale & Whitmore LLP",
    field: "Law",
    level: "high",
    prestige: 55,
    minGpa: 3.0,
    blurb: "Shadow attorneys and organize case files.",
  },
  {
    id: "hs-hospital",
    name: "Hospital Volunteer Program",
    org: "St. Grace Hospital",
    field: "Healthcare",
    level: "high",
    prestige: 50,
    minGpa: 2.7,
    blurb: "Support hospital staff and patients.",
  },
  {
    id: "hs-business",
    name: "Local Business",
    org: "Main Street Ventures",
    field: "Business",
    level: "high",
    prestige: 40,
    minGpa: 2.5,
    blurb: "Learn how a small business runs day to day.",
  },
  {
    id: "hs-gov",
    name: "Government Office",
    org: "City Hall",
    field: "Government",
    level: "high",
    prestige: 52,
    minGpa: 3.0,
    blurb: "Assist with constituent services and civic projects.",
  },
  {
    id: "hs-startup",
    name: "Technology Startup",
    org: "LaunchPad Labs",
    field: "Technology",
    level: "high",
    prestige: 60,
    minGpa: 3.2,
    blurb: "Ship small features at a fast-moving startup.",
  },
  {
    id: "hs-research",
    name: "Research Assistant",
    org: "University Research Lab",
    field: "Research",
    level: "high",
    prestige: 65,
    minGpa: 3.5,
    blurb: "Assist graduate researchers with data collection.",
  },
  // College / graduate
  {
    id: "co-consulting",
    name: "Consulting Summer Analyst",
    org: "McKinley & Co.",
    field: "Consulting",
    level: "college",
    prestige: 92,
    minGpa: 3.6,
    blurb: "Elite strategy consulting. Extremely competitive.",
  },
  {
    id: "co-ib",
    name: "Investment Banking Summer Analyst",
    org: "Goldman Sterling",
    field: "Finance",
    level: "college",
    prestige: 93,
    minGpa: 3.6,
    blurb: "M&A and capital markets. Brutal hours, elite resume line.",
  },
  {
    id: "co-biglaw",
    name: "Big Law Summer Associate",
    org: "Cravath & Sterling LLP",
    field: "Law",
    level: "college",
    prestige: 90,
    minGpa: 3.5,
    blurb: "Prestigious law-firm summer program (law students favored).",
  },
  {
    id: "co-tech",
    name: "Software Engineering Intern",
    org: "Nexus Labs",
    field: "Technology",
    level: "college",
    prestige: 80,
    minGpa: 3.2,
    blurb: "Build production software with a mentor.",
  },
  {
    id: "co-health",
    name: "Clinical Research Intern",
    org: "Johns Hopkins Hospital",
    field: "Healthcare",
    level: "college",
    prestige: 78,
    minGpa: 3.4,
    blurb: "Patient-facing clinical research support.",
  },
  {
    id: "co-lab",
    name: "Research Lab Intern",
    org: "National Science Institute",
    field: "Research",
    level: "college",
    prestige: 75,
    minGpa: 3.4,
    blurb: "Academic research; strong for grad school.",
  },
  {
    id: "co-gov",
    name: "Government Intern",
    org: "Federal Affairs Bureau",
    field: "Government",
    level: "college",
    prestige: 65,
    minGpa: 3.0,
    blurb: "Public policy and administration.",
  },
  {
    id: "co-marketing",
    name: "Marketing Intern",
    org: "Bright Media",
    field: "Marketing",
    level: "college",
    prestige: 55,
    minGpa: 2.8,
    blurb: "Campaigns, analytics and content.",
  },
  {
    id: "co-finance",
    name: "Corporate Finance Intern",
    org: "Meridian Capital",
    field: "Finance",
    level: "college",
    prestige: 68,
    minGpa: 3.2,
    blurb: "FP&A and treasury rotations.",
  },
  {
    id: "co-nonprofit",
    name: "Nonprofit Intern",
    org: "Global Hope Foundation",
    field: "Nonprofit",
    level: "college",
    prestige: 48,
    minGpa: 2.5,
    blurb: "Mission-driven program work.",
  },
];

export const INTERNSHIP_MAX_AGE = 30;

export function internshipEligibility(c: Character): {
  eligible: boolean;
  reason?: string;
  level?: "high" | "college";
} {
  if (c.age > INTERNSHIP_MAX_AGE) {
    return {
      eligible: false,
      reason: "You are no longer eligible for traditional student internships.",
    };
  }
  if (c.education === "high" && c.age >= 15) return { eligible: true, level: "high" };
  if (c.education === "college" || c.education === "gradschool")
    return { eligible: true, level: "college" };
  if (c.education === "graduated" && c.age <= INTERNSHIP_MAX_AGE)
    return { eligible: true, level: "college" };
  return {
    eligible: false,
    reason: "Internships open in high school (age 15+) and during college or graduate school.",
  };
}

export interface InternshipChance {
  probability: number;
  factors: string[];
}

export function internshipChance(c: Character, def: InternshipDef): InternshipChance {
  const rs = resumeScore(c);
  const factors: string[] = [];
  let p = 0.9 - def.prestige / 130; // harder programs start lower

  if (c.gpa >= def.minGpa) {
    p += (c.gpa - def.minGpa) * 0.2;
  } else {
    p -= 0.35;
    factors.push(`GPA below the ${def.minGpa.toFixed(1)} bar`);
  }
  p += (rs - 40) / 160;
  p += ((c.edu.schoolPrestige ?? 55) - 55) / 250;
  p += Math.min(0.1, (c.edu.leadership?.length ?? 0) * 0.03);
  p += Math.min(0.08, (c.edu.recLetters ?? 0) * 0.03);
  p += ((c.networking ?? 0) / 100) * 0.12;
  if ((c.edu.internships?.length ?? 0) > 0) p += 0.06; // prior experience
  if (def.id === "co-biglaw" && c.gradProgram?.kind !== "jd" && c.gradProgram?.kind !== "jdmba")
    p -= 0.25;

  if (rs >= 70) factors.push("Outstanding resume");
  else if (rs >= 50) factors.push("Solid resume");
  if ((c.networking ?? 0) >= 50) factors.push("Strong network");

  return { probability: Math.max(0.03, Math.min(0.92, p)), factors };
}
