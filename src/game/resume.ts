import type { Character } from "./types";
import { honorsLabel } from "./honors";

// ---------------------------------------------------------------------------
// The resume is auto-generated from the character's history and is not
// cosmetic: resumeScore() feeds internship applications, elite recruiting,
// and graduate admissions.
// ---------------------------------------------------------------------------

export interface ResumeSection {
  title: string;
  items: string[];
}

export function buildResume(c: Character): ResumeSection[] {
  const sections: ResumeSection[] = [];

  // Education
  const edu: string[] = [];
  if (c.gradProgram) {
    edu.push(
      `${c.gradProgram.name} \u2014 ${c.gradProgram.school} (in progress, year ${c.gradProgram.yearsDone + 1}/${c.gradProgram.yearsTotal})`,
    );
  }
  for (const d of [...c.edu.degrees].reverse())
    edu.push(d + (c.university && d.startsWith("B.") ? ` \u2014 ${c.university}` : ""));
  if (c.education === "college" && c.university)
    edu.push(`${c.university} \u2014 ${c.major ?? "Undeclared"} (in progress)`);
  if (
    c.edu.school &&
    c.edu.school !== "Home" &&
    ["elementary", "middle", "high"].includes(c.education)
  ) {
    edu.push(
      `${c.edu.school}${c.edu.schoolKind && c.edu.schoolKind !== "public" ? ` (${c.edu.schoolKind})` : ""}`,
    );
  }
  if (c.gpa > 0)
    edu.push(
      `GPA ${c.gpa.toFixed(2)}${c.edu.schoolPrestige ? ` \u00b7 School prestige ${c.edu.schoolPrestige}` : ""}`,
    );
  if (c.edu.ibTotal) edu.push(`IB Diploma \u2014 ${c.edu.ibTotal}/45`);
  const gradHonors = honorsLabel(c.gpa);
  if (c.education === "graduated" && gradHonors) edu.push(gradHonors);
  if (edu.length) sections.push({ title: "Education", items: edu });

  // Experience
  const exp: string[] = [];
  if (c.job) exp.push(`${c.job.title} \u2014 ${c.job.company} (current)`);
  for (const i of [...(c.edu.internships ?? [])].reverse()) {
    exp.push(
      `${i.name} Intern \u2014 ${i.org} (age ${i.age})${i.outcome === "return" ? " \u00b7 return offer" : ""}${i.recLetter ? " \u00b7 recommendation letter" : ""}`,
    );
  }
  if (exp.length) sections.push({ title: "Experience", items: exp });

  // Leadership
  if (c.edu.leadership?.length)
    sections.push({ title: "Leadership", items: [...c.edu.leadership].reverse() });

  // Activities
  const act: string[] = [];
  for (const club of c.edu.clubs) act.push(club);
  for (const s of c.edu.sports) act.push(`${s} (athletics)`);
  if ((c.edu.volunteer ?? 0) > 0) act.push(`Volunteer work \u00d7${c.edu.volunteer}`);
  if ((c.edu.research ?? 0) > 0) act.push(`Research projects \u00d7${c.edu.research}`);
  if (act.length) sections.push({ title: "Activities", items: act });

  // Public service (Build 8): offices held and elections won belong on the
  // record — a political career is a career.
  const pol: string[] = [];
  if (c.politics?.office) {
    pol.push(
      `${c.politics.office.name} (current \u00b7 term ${c.politics.office.termsServed + 1})`,
    );
  }
  for (const e of [...(c.politics?.electionHistory ?? [])].reverse().slice(0, 8)) {
    if (e.result === "won" && e.stage === "general")
      pol.push(`Elected ${e.office} \u2014 ${e.share}% of the vote (age ${e.age})`);
  }
  if ((c.politics?.billsPassed ?? 0) > 0)
    pol.push(
      `Sponsored ${c.politics!.billsPassed} bill${c.politics!.billsPassed > 1 ? "s" : ""} into law`,
    );
  if (pol.length) sections.push({ title: "Public Service", items: pol });

  // Awards & scholarships
  const awards: string[] = [];
  for (const a of [...c.edu.awards].reverse().slice(0, 10)) awards.push(a);
  for (const s of c.edu.scholarships.filter((x) => x.status !== "revoked"))
    awards.push(`${s.name} ($${s.amount.toLocaleString()}/yr)`);
  if (awards.length) sections.push({ title: "Awards & Scholarships", items: awards });

  // Test scores
  const scores: string[] = [];
  if (c.scores.sat) scores.push(`SAT ${c.scores.sat}`);
  if (c.scores.act) scores.push(`ACT ${c.scores.act}`);
  if (c.scores.gmat) scores.push(`GMAT ${c.scores.gmat}`);
  if (c.scores.lsat) scores.push(`LSAT ${c.scores.lsat}`);
  if (c.scores.mcat) scores.push(`MCAT ${c.scores.mcat}`);
  if (c.scores.bar) scores.push(`Bar Exam: ${c.scores.bar}`);
  if (scores.length) sections.push({ title: "Test Scores", items: scores });

  return sections;
}

/**
 * 0-100 employability/admissions score. Employers, elite recruiters,
 * internships and graduate programs all evaluate this.
 */
export function resumeScore(c: Character): number {
  let s = 0;
  s += (c.gpa / 4) * 22;
  s += ((c.edu.schoolPrestige ?? 50) / 100) * 12;
  s += Math.min(3, c.edu.degrees.filter((d) => ["MBA", "JD", "MD"].includes(d)).length) * 6;
  if (c.edu.degrees.includes("IB Diploma")) s += 3;
  if (c.edu.ibTotal) s += Math.max(0, (c.edu.ibTotal - 30) * 0.4);
  s += Math.min(4, c.edu.leadership?.length ?? 0) * 3.5;
  s += Math.min(4, c.edu.internships?.length ?? 0) * 5;
  s += Math.min(3, c.edu.research ?? 0) * 2.5;
  s += Math.min(3, c.edu.recLetters ?? 0) * 2;
  s += Math.min(4, c.edu.clubs.length) * 1.2;
  s += Math.min(2, c.edu.sports.length) * 1.2;
  s += Math.min(3, c.edu.volunteer ?? 0) * 1;
  s += Math.min(6, c.edu.awards.length) * 0.8;
  s += ((c.networking ?? 0) / 100) * 8;
  return Math.round(Math.max(0, Math.min(100, s)));
}
