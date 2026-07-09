import type { Character, GradProgramKind, GradProgramState } from "./types";
import { clamp } from "./util";
import { resumeScore } from "./resume";

// ---------------------------------------------------------------------------
// Graduate education: MBA (2y), Law School JD (3y), Medical School MD (4y +
// 3-year residency once hired), and a JD/MBA dual degree (4y). Realistic
// pacing, real tuition, hard admissions.
// ---------------------------------------------------------------------------

export interface GradProgramDef {
  kind: GradProgramKind;
  name: string;
  school: string;
  prestige: number;
  years: number;
  tuition: number; // annual
  degrees: string[]; // degree markers granted on completion
  exam: "gmat" | "lsat" | "mcat" | "both"; // "both" = GMAT + LSAT (JD/MBA)
  minExamPct: number; // required percentile of the exam range (0-1)
  minGpa: number;
  minWorkYears?: number; // MBA-style work experience requirement
  blurb: string;
}

export const GRAD_PROGRAMS: GradProgramDef[] = [
  {
    kind: "mba",
    name: "MBA",
    school: "Wharton School of Business",
    prestige: 94,
    years: 2,
    tuition: 84000,
    degrees: ["MBA"],
    exam: "gmat",
    minExamPct: 0.62,
    minGpa: 3.3,
    minWorkYears: 2,
    blurb:
      "Two-year business degree. Requires 2+ years of work experience and a strong GMAT. Unlocks senior consulting and banking promotions.",
  },
  {
    kind: "jd",
    name: "Law School (JD)",
    school: "Harvard Law School",
    prestige: 96,
    years: 3,
    tuition: 75000,
    degrees: ["JD"],
    exam: "lsat",
    minExamPct: 0.65,
    minGpa: 3.4,
    blurb:
      "Three-year Juris Doctor. Requires a strong LSAT. Pass the bar afterward to practice at elite firms.",
  },
  {
    kind: "md",
    name: "Medical School (MD)",
    school: "Johns Hopkins School of Medicine",
    prestige: 97,
    years: 4,
    tuition: 68000,
    degrees: ["MD"],
    exam: "mcat",
    minExamPct: 0.65,
    minGpa: 3.5,
    blurb:
      "Four-year Doctor of Medicine, followed by a 3-year residency on the job. The longest and most demanding path.",
  },
  {
    kind: "jdmba",
    name: "JD/MBA Dual Degree",
    school: "Columbia Law & Business",
    prestige: 95,
    years: 4,
    tuition: 88000,
    degrees: ["JD", "MBA"],
    exam: "both",
    minExamPct: 0.6,
    minGpa: 3.5,
    minWorkYears: 1,
    blurb:
      "Four-year dual degree granting both the JD and MBA. Requires strong LSAT and GMAT scores.",
  },
];

export function gradProgramByKind(kind: GradProgramKind): GradProgramDef | undefined {
  return GRAD_PROGRAMS.find((p) => p.kind === kind);
}

// Exam percentile helpers ----------------------------------------------------

function examPct(kind: "gmat" | "lsat" | "mcat", c: Character): number | undefined {
  const s = c.scores;
  if (kind === "gmat") return s.gmat === undefined ? undefined : (s.gmat - 200) / 600;
  if (kind === "lsat") return s.lsat === undefined ? undefined : (s.lsat - 120) / 60;
  return s.mcat === undefined ? undefined : (s.mcat - 472) / 56;
}

export interface GradRequirement {
  label: string;
  met: boolean;
}

export interface GradAdmission {
  eligible: boolean; // hard requirements met, application possible
  probability: number; // 0-1 if eligible
  requirements: GradRequirement[];
}

/** Evaluate admissions for one grad program. */
export function gradAdmission(c: Character, def: GradProgramDef): GradAdmission {
  const requirements: GradRequirement[] = [];

  const hasBachelors = c.edu.degrees.some((d) => d.startsWith("B.A.") || d.startsWith("B.S."));
  requirements.push({ label: "Bachelor's degree", met: hasBachelors });

  const gpaOk = c.gpa >= def.minGpa;
  requirements.push({ label: `Undergraduate GPA \u2265 ${def.minGpa.toFixed(1)}`, met: gpaOk });

  const exams: ("gmat" | "lsat" | "mcat")[] = def.exam === "both" ? ["gmat", "lsat"] : [def.exam];
  let examOk = true;
  let examStrength = 0;
  for (const e of exams) {
    const pct = examPct(e, c);
    const ok = pct !== undefined && pct >= def.minExamPct;
    requirements.push({
      label: `${e.toUpperCase()} taken (${Math.round(def.minExamPct * 100)}th percentile+)`,
      met: ok,
    });
    if (!ok) examOk = false;
    else examStrength += (pct! - def.minExamPct) / exams.length;
  }

  let workOk = true;
  if (def.minWorkYears) {
    const yrs = c.jobYearsAccrued ?? 0;
    workOk = yrs >= def.minWorkYears;
    requirements.push({ label: `${def.minWorkYears}+ years work experience`, met: workOk });
  }

  const eligible = hasBachelors && gpaOk && examOk && workOk && !c.gradProgram;

  // Probability from GPA margin, exam strength, resume (leadership, research,
  // internships, rec letters), and undergrad prestige.
  const rs = resumeScore(c); // 0-100
  let p =
    0.25 +
    (c.gpa - def.minGpa) * 0.35 +
    examStrength * 0.8 +
    (rs - 40) / 200 +
    ((c.edu.schoolPrestige ?? 55) - 60) / 300 +
    (c.edu.recLetters ?? 0) * 0.04 +
    (c.edu.research ?? 0) * 0.03;
  p = Math.max(0.05, Math.min(0.92, p));

  return { eligible, probability: eligible ? p : 0, requirements };
}

export function buildGradState(def: GradProgramDef): GradProgramState {
  return {
    kind: def.kind,
    name: def.name,
    school: def.school,
    prestige: def.prestige,
    yearsTotal: def.years,
    yearsDone: 0,
    tuition: def.tuition,
  };
}

/** GPA smarts floor for grad students so the model stays sensible. */
export function gradStageLabel(state: GradProgramState): string {
  return `${state.name} \u2014 Year ${Math.min(state.yearsTotal, state.yearsDone + 1)}`;
}

export function clampPct(n: number): number {
  return clamp(n, 0, 100);
}
