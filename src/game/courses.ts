import type { AcademicPathway, Character, CourseLevel, GameEvent, SelectedCourse } from "./types";

// ---------------------------------------------------------------------------
// IB Diploma Programme course catalogue (UCC Upper School Course Offerings
// Guide 2026–27). Players entering the IB pathway pick exactly six courses:
// 3 Higher Level (HL) and 3 Standard Level (SL).
// ---------------------------------------------------------------------------

export interface CourseDef {
  id: string;
  name: string;
  group: number; // IB subject group 1-6
  groupLabel: string;
  /** Courses of the same subject can't be taken twice (e.g. both maths). */
  subject: string;
  levels: CourseLevel[];
}

const G1 = "Group 1 · Studies in Language and Literature";
const G2 = "Group 2 · Language Acquisition";
const G3 = "Group 3 · Individuals and Societies";
const G4 = "Group 4 · Sciences";
const G5 = "Group 5 · Mathematics";
const G6 = "Group 6 · The Arts";

export const IB_COURSES: CourseDef[] = [
  // Group 1 — Studies in Language and Literature
  {
    id: "eng-lit",
    name: "English A: Literature",
    group: 1,
    groupLabel: G1,
    subject: "english",
    levels: ["SL", "HL"],
  },
  {
    id: "eng-lang-lit",
    name: "English A: Language and Literature",
    group: 1,
    groupLabel: G1,
    subject: "english",
    levels: ["SL", "HL"],
  },
  {
    id: "fre-a",
    name: "French A: Language and Literature",
    group: 1,
    groupLabel: G1,
    subject: "french",
    levels: ["HL"],
  },
  {
    id: "chi-a",
    name: "Chinese A: Language and Literature",
    group: 1,
    groupLabel: G1,
    subject: "chinese",
    levels: ["SL"],
  },
  {
    id: "spa-a",
    name: "Spanish A: Language and Literature",
    group: 1,
    groupLabel: G1,
    subject: "spanish",
    levels: ["SL"],
  },

  // Group 2 — Language Acquisition
  {
    id: "fre-b",
    name: "French B",
    group: 2,
    groupLabel: G2,
    subject: "french",
    levels: ["SL", "HL"],
  },
  {
    id: "chi-b",
    name: "Chinese B",
    group: 2,
    groupLabel: G2,
    subject: "chinese",
    levels: ["SL", "HL"],
  },
  { id: "spa-b", name: "Spanish B", group: 2, groupLabel: G2, subject: "spanish", levels: ["SL"] },
  {
    id: "spa-ab",
    name: "Spanish ab initio",
    group: 2,
    groupLabel: G2,
    subject: "spanish",
    levels: ["SL"],
  },
  { id: "latin", name: "Latin", group: 2, groupLabel: G2, subject: "latin", levels: ["SL"] },

  // Group 3 — Individuals and Societies
  {
    id: "geo",
    name: "Geography",
    group: 3,
    groupLabel: G3,
    subject: "geography",
    levels: ["SL", "HL"],
  },
  {
    id: "hist",
    name: "History",
    group: 3,
    groupLabel: G3,
    subject: "history",
    levels: ["SL", "HL"],
  },
  {
    id: "bm",
    name: "Business Management",
    group: 3,
    groupLabel: G3,
    subject: "business",
    levels: ["SL", "HL"],
  },
  {
    id: "econ",
    name: "Economics",
    group: 3,
    groupLabel: G3,
    subject: "economics",
    levels: ["SL", "HL"],
  },
  {
    id: "gp",
    name: "Global Politics",
    group: 3,
    groupLabel: G3,
    subject: "politics",
    levels: ["SL", "HL"],
  },
  {
    id: "psych",
    name: "Psychology",
    group: 3,
    groupLabel: G3,
    subject: "psychology",
    levels: ["SL", "HL"],
  },
  {
    id: "phil",
    name: "Philosophy",
    group: 3,
    groupLabel: G3,
    subject: "philosophy",
    levels: ["SL", "HL"],
  },
  {
    id: "st",
    name: "Systems Transformation",
    group: 3,
    groupLabel: G3,
    subject: "systems",
    levels: ["SL"],
  },

  // Group 4 — Sciences
  {
    id: "bio",
    name: "Biology",
    group: 4,
    groupLabel: G4,
    subject: "biology",
    levels: ["SL", "HL"],
  },
  {
    id: "chem",
    name: "Chemistry",
    group: 4,
    groupLabel: G4,
    subject: "chemistry",
    levels: ["SL", "HL"],
  },
  {
    id: "phys",
    name: "Physics",
    group: 4,
    groupLabel: G4,
    subject: "physics",
    levels: ["SL", "HL"],
  },
  {
    id: "ess",
    name: "Environmental Systems and Societies",
    group: 4,
    groupLabel: G4,
    subject: "environment",
    levels: ["SL", "HL"],
  },
  {
    id: "cs",
    name: "Computer Science",
    group: 4,
    groupLabel: G4,
    subject: "computer-science",
    levels: ["SL", "HL"],
  },
  {
    id: "sehs",
    name: "Sports, Exercise and Health Science",
    group: 4,
    groupLabel: G4,
    subject: "sports-science",
    levels: ["SL", "HL"],
  },

  // Group 5 — Mathematics
  {
    id: "math-ai",
    name: "Mathematics: Applications and Interpretation",
    group: 5,
    groupLabel: G5,
    subject: "math",
    levels: ["SL", "HL"],
  },
  {
    id: "math-aa",
    name: "Mathematics: Analysis and Approaches",
    group: 5,
    groupLabel: G5,
    subject: "math",
    levels: ["SL", "HL"],
  },

  // Group 6 — The Arts
  {
    id: "va",
    name: "Visual Arts",
    group: 6,
    groupLabel: G6,
    subject: "visual-arts",
    levels: ["SL", "HL"],
  },
  { id: "music", name: "Music", group: 6, groupLabel: G6, subject: "music", levels: ["SL", "HL"] },
  { id: "drama", name: "Drama", group: 6, groupLabel: G6, subject: "drama", levels: ["SL", "HL"] },
  { id: "film", name: "Film", group: 6, groupLabel: G6, subject: "film", levels: ["SL", "HL"] },
];

export function courseById(id: string): CourseDef | undefined {
  return IB_COURSES.find((c) => c.id === id);
}

export const IB_GROUPS: { group: number; label: string }[] = [
  { group: 1, label: G1 },
  { group: 2, label: G2 },
  { group: 3, label: G3 },
  { group: 4, label: G4 },
  { group: 5, label: G5 },
  { group: 6, label: G6 },
];

// ---------------------------------------------------------------------------
// Selection validation — exactly 6 courses, 3 HL + 3 SL, must include an
// English A and exactly one Mathematics, no duplicate subjects, and the
// selection must span at least 4 subject groups.
// ---------------------------------------------------------------------------

export interface IBPick {
  id: string;
  level: CourseLevel;
}

export interface IBRequirement {
  label: string;
  met: boolean;
}

export interface IBValidation {
  ok: boolean;
  requirements: IBRequirement[];
}

export function validateIBSelection(picks: IBPick[]): IBValidation {
  const defs = picks
    .map((p) => ({ def: courseById(p.id), level: p.level }))
    .filter((x): x is { def: CourseDef; level: CourseLevel } => !!x.def);

  const hl = defs.filter((d) => d.level === "HL").length;
  const sl = defs.filter((d) => d.level === "SL").length;
  const subjects = defs.map((d) => d.def.subject);
  const uniqueSubjects = new Set(subjects).size === subjects.length;
  const hasEnglishA = defs.some((d) => d.def.subject === "english" && d.def.group === 1);
  const hasSecondLang = defs.some(
    (d) => d.def.group === 2 || (d.def.group === 1 && d.def.subject !== "english"),
  );
  const hasSociety = defs.some((d) => d.def.group === 3);
  const hasScience = defs.some((d) => d.def.group === 4);
  const mathCount = defs.filter((d) => d.def.subject === "math").length;

  const requirements: IBRequirement[] = [
    { label: "3 Higher Level courses", met: hl === 3 },
    { label: "3 Standard Level courses", met: sl === 3 },
    { label: "English A (Language & Literature group)", met: hasEnglishA },
    { label: "Language Acquisition (or a second Language A)", met: hasSecondLang },
    { label: "Individuals & Societies course", met: hasSociety },
    { label: "Science course", met: hasScience },
    { label: "Exactly one Mathematics course", met: mathCount === 1 },
    { label: "No repeated subjects", met: defs.length > 0 && uniqueSubjects },
  ];

  const ok = defs.length === 6 && requirements.every((r) => r.met);
  return { ok, requirements };
}

export function resolveIBSelection(picks: IBPick[]): SelectedCourse[] {
  const out: SelectedCourse[] = [];
  for (const p of picks) {
    const def = courseById(p.id);
    if (def) out.push({ id: def.id, name: def.name, group: def.groupLabel, level: p.level });
  }
  out.sort((a, b) =>
    a.level === b.level ? a.name.localeCompare(b.name) : a.level === "HL" ? -1 : 1,
  );
  return out;
}

// ---------------------------------------------------------------------------
// Fixed course loads for the non-IB pathways and the pre-DP years.
// ---------------------------------------------------------------------------

function fixed(names: string[], group: string): SelectedCourse[] {
  return names.map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, group }));
}

export const YEAR9_COURSES: SelectedCourse[] = fixed(
  [
    "English (ENG2D)",
    "French (FSF2D)",
    "Principles of Mathematics (MPM2D)",
    "Science (SNC2D)",
    "Canadian History (CHC2D)",
    "Physical Education",
    "Visual Arts",
  ],
  "Grade 9 core program",
);

export const YEAR10_COURSES: SelectedCourse[] = fixed(
  [
    "English (NBE3U)",
    "French (FSF3U)",
    "Functions (MCR3U)",
    "Science (IDC3O)",
    "Civics and Citizenship (CHV2O)",
    "Physical Education",
    "Drama",
  ],
  "Grade 10 core program",
);

export const REGULAR_COURSES: SelectedCourse[] = fixed(
  [
    "English (ENG3U)",
    "Functions and Applications (MCF3M)",
    "Biology (SBI3U)",
    "Canadian History (CHT3O)",
    "Psychology (HSP3U)",
    "Physical Education (PPL3O)",
  ],
  "Regular pathway",
);

export const HONORS_COURSES: SelectedCourse[] = fixed(
  [
    "English Enriched (ENG3U-E)",
    "Functions Higher Level (MCR3U-H)",
    "Chemistry (SCH3U)",
    "Physics (SPH3U)",
    "Economics (CIE3M)",
    "French (FSF3U)",
  ],
  "Honors pathway",
);

// ---------------------------------------------------------------------------
// Rigor — harder course loads demand more studying but boost admissions,
// scholarships and prestige.
// ---------------------------------------------------------------------------

export function hlCount(c: Character): number {
  return (c.edu.courses ?? []).filter((x) => x.level === "HL").length;
}

/** Course-load rigor 0..1 used by the GPA model. */
export function courseRigor(c: Character): number {
  switch (c.edu.pathway) {
    case "ib":
      return Math.min(1, 0.5 + hlCount(c) * 0.12);
    case "honors":
      return 0.35;
    case "regular":
      return 0.12;
    default:
      return 0;
  }
}

/** Flat bonus to the university admissions score for rigorous pathways. */
export function rigorAdmissionsBonus(c: Character): number {
  if (c.edu.pathway === "ib") return 6 + hlCount(c);
  if (c.edu.pathway === "honors") return 4;
  return 0;
}

export function pathwayLabel(p: AcademicPathway | undefined): string {
  if (p === "ib") return "IB Diploma Programme";
  if (p === "honors") return "Honors Program";
  if (p === "regular") return "Regular Program";
  return "—";
}

// ---------------------------------------------------------------------------
// Forced life event: choosing the Grade 11 academic pathway.
// ---------------------------------------------------------------------------

export const PATHWAY_EVENT: GameEvent = {
  id: "choose_pathway",
  title: "Choose Your Academic Pathway",
  description:
    "Grade 11 begins this year, and your school requires you to pick an academic pathway. Harder pathways demand more studying, but improve prestige, university admissions and scholarship odds.",
  minAge: 15,
  maxAge: 18,
  weight: 0,
  choices: [
    {
      label: "Regular Program — standard courses, balanced workload",
      apply: (c) => {
        c.edu.pathway = "regular";
        c.edu.courses = REGULAR_COURSES.map((x) => ({ ...x }));
        return { text: "You enrolled in the Regular Program for Grade 11.", tone: "neutral" };
      },
    },
    {
      label: "Honors Program — challenging courses, stronger admissions",
      apply: (c) => {
        c.edu.pathway = "honors";
        c.edu.courses = HONORS_COURSES.map((x) => ({ ...x }));
        return {
          text: "You enrolled in the Honors Program. The workload just went up a notch.",
          tone: "good",
        };
      },
    },
    {
      label: "IB Diploma Programme — choose 3 HL + 3 SL courses, maximum rigor",
      apply: (c) => {
        c.edu.pathway = "ib";
        c.edu.courses = [];
        c.edu.needsCourseSelection = true;
        return {
          text: "You enrolled in the IB Diploma Programme. Time to choose your six courses — 3 Higher Level and 3 Standard Level.",
          tone: "milestone",
        };
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// IB examinations (end of Grade 12): each subject is a short interactive exam
// scored 1-7. Six subjects (max 42) plus 3 assumed core points = /45.
// ---------------------------------------------------------------------------

export type IBExamCategory =
  | "ib_econ"
  | "ib_bio"
  | "ib_science"
  | "ib_math"
  | "ib_history"
  | "ib_cs"
  | "ib_lang"
  | "ib_society"
  | "ib_arts";

export function ibExamCategory(courseId: string): IBExamCategory {
  switch (courseId) {
    case "econ":
    case "bm":
      return "ib_econ";
    case "bio":
    case "sehs":
      return "ib_bio";
    case "chem":
    case "phys":
    case "ess":
      return "ib_science";
    case "math-ai":
    case "math-aa":
      return "ib_math";
    case "hist":
      return "ib_history";
    case "cs":
      return "ib_cs";
    case "va":
    case "music":
    case "drama":
    case "film":
      return "ib_arts";
    case "geo":
    case "gp":
    case "psych":
    case "phil":
    case "st":
      return "ib_society";
    default:
      return "ib_lang"; // languages & literature
  }
}

/**
 * Convert quiz performance into a 1-7 IB grade, tempered by ability, the
 * year's academic record, and level (HL is graded slightly harder).
 */
export function ibSubjectScore(c: Character, level: CourseLevel, correctRatio: number): number {
  const perf =
    correctRatio * 0.55 +
    (c.stats.smarts / 100) * 0.25 +
    (c.gpa / 4) * 0.2 -
    (level === "HL" ? 0.04 : 0);
  const jitter = (Math.random() * 6 - 3) / 100;
  const p = Math.max(0, Math.min(1, perf + jitter));
  return Math.max(1, Math.min(7, Math.round(1 + p * 6.4)));
}
