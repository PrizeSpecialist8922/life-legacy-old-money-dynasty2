import { courseRigor } from "./courses";
import { schoolAcademicsBonus } from "./schools";
import type { Character, WealthTier } from "./types";
import { randInt } from "./util";

const TIER_GPA_BONUS: Record<WealthTier, number> = {
  poor: -0.15,
  working: -0.05,
  middle: 0,
  affluent: 0.12,
  wealthy: 0.2,
};

export function inSchool(c: Character): boolean {
  return (
    c.education === "elementary" ||
    c.education === "middle" ||
    c.education === "high" ||
    c.education === "college" ||
    c.education === "gradschool"
  );
}

export function gradeLevelLabel(c: Character): string {
  if (c.education === "gradschool") return "Graduate School";
  if (c.education === "graduated") return "Graduated";
  if (c.education === "college") {
    const yr = Math.min(4, Math.max(1, c.age - 17));
    return `College — Year ${yr}`;
  }
  if (c.age < 5) return "Not in school yet";
  const g = c.age - 5;
  if (g <= 0) return "Kindergarten";
  if (g > 12) return "Post-graduate";
  return `Grade ${g}`;
}

export function letterGrade(gpa: number): string {
  if (gpa >= 3.85) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3.15) return "B+";
  if (gpa >= 2.85) return "B";
  if (gpa >= 2.5) return "B-";
  if (gpa >= 2.15) return "C+";
  if (gpa >= 1.85) return "C";
  if (gpa >= 1.5) return "C-";
  if (gpa >= 1.0) return "D";
  return "F";
}

export function gpaToPercent(gpa: number): number {
  return Math.round(60 + (gpa / 4) * 40);
}

/** Descriptive class-rank percentile band, e.g. "Top 5%". */
export function classRankPercentile(c: Character): string {
  if (!c.edu.classSize || !c.edu.classRank) return "—";
  const pct = (c.edu.classRank / c.edu.classSize) * 100;
  if (pct <= 1) return "Top 1%";
  if (pct <= 5) return "Top 5%";
  if (pct <= 10) return "Top 10%";
  if (pct <= 25) return "Top 25%";
  if (pct <= 50) return "Top 50%";
  return "Bottom 50%";
}

/** Label for a 1-100 school prestige score. */
export function prestigeLabel(p: number | undefined): string {
  if (p === undefined) return "—";
  if (p >= 95) return "Elite";
  if (p >= 80) return "High Prestige";
  if (p >= 60) return "Well-Regarded";
  if (p >= 40) return "Standard";
  return "Modest";
}

/**
 * Compute the GPA earned for a single academic year, based on studying,
 * class attendance, intelligence, assignment performance, sleep (proxied
 * by health), stress (inverse happiness), extracurricular load, and family
 * environment. Rewritten to reward consistent students: a smart student who
 * studies and does assignments should reliably land between 3.7 and 4.0.
 */
export function computeYearGPA(c: Character): number {
  const smarts = c.stats.smarts;
  const study = Math.max(0, Math.min(50, c.edu.studyHours));
  const attendance = c.edu.attendance;
  const homework = c.edu.homework;
  const stress = 100 - c.stats.happiness;
  const sleep = c.stats.health;
  const ec = c.edu.clubs.length + c.edu.sports.length;
  const didAssignments = (c.edu.assignmentsThisYear ?? 0) > 0;
  const assignments = didAssignments ? (c.edu.assignmentAvg ?? 0) : homework;

  // Generous baseline so consistent effort maintains a strong GPA.
  let g = 1.7 + (smarts / 100) * 1.6; // 1.7 (low) .. 3.3 (genius)
  g += (study / 50) * 0.7;
  g += (attendance / 100) * 0.3;
  g += (assignments / 100) * 0.6;
  g += (sleep / 100) * 0.1;
  g -= (stress / 100) * 0.25; // stress hurts a little
  g += TIER_GPA_BONUS[c.family.tier];
  g += schoolAcademicsBonus(c); // strong schools push students

  // High-intelligence students who study get an extra edge.
  if (smarts > 80 && study >= 6) {
    g += 0.35 * ((smarts - 80) / 20);
  }

  // Course rigor: hard pathways (Honors/IB, especially HL-heavy loads) drag
  // grades down unless offset by studying and raw ability. A smart IB student
  // who studies breaks roughly even; a coasting one pays for the harder load.
  const rigor = courseRigor(c);
  if (rigor > 0) {
    g -= rigor * 0.3;
    g += (study / 50) * rigor * 0.22;
    g += (smarts / 100) * rigor * 0.14;
  }

  if (ec > 4) g -= (ec - 4) * 0.04; // only heavy over-commitment hurts
  g += randInt(-4, 4) / 100; // small variance

  return Math.max(0, Math.min(4, Math.round(g * 100) / 100));
}

/** Standardized test score generators keyed to smarts + cumulative GPA. */
export function generateScore(
  kind: "sat" | "act" | "lsat" | "gmat" | "mcat",
  c: Character,
  correctRatio?: number,
): number {
  const ability = c.stats.smarts / 100; // 0-1
  const gpaFactor = c.gpa / 4; // 0-1
  // When the player actually sits the interactive test, their answers drive
  // most of the score, tempered by ability and academic record.
  const perf =
    correctRatio !== undefined
      ? Math.max(0, Math.min(1, correctRatio * 0.6 + ability * 0.25 + gpaFactor * 0.15))
      : Math.max(0, Math.min(1, ability * 0.7 + gpaFactor * 0.3));
  const noise = randInt(-6, 6) / 100;
  const p = Math.max(0, Math.min(1, perf + noise));
  switch (kind) {
    case "sat":
      return Math.round(400 + p * 1200);
    case "act":
      return Math.round(1 + p * 35);
    case "lsat":
      return Math.round(120 + p * 60);
    case "gmat":
      return Math.round(200 + p * 600);
    case "mcat":
      return Math.round(472 + p * 56);
  }
}
