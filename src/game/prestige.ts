import type { Character, LogEntry } from "./types";
import { collectionsValue } from "./collections";
import { estateValue, transportValue } from "./lifestyle";
import { ensureRecords } from "./records";
import { clamp } from "./util";

// ---------------------------------------------------------------------------
// Prestige & Dynasty Goals (Build 11B). Prestige is computed, never stored —
// it is what the world currently believes, recalculated every time the world
// looks. Goals are the long game: things no single lifetime can finish.
// ---------------------------------------------------------------------------

export interface PrestigeBreakdown {
  wealth: number;
  academic: number;
  political: number;
  athletic: number;
  business: number;
  philanthropic: number;
  social: number;
  overall: number;
}

export function familyNetWorth(c: Character): number {
  const investments =
    c.investing?.holdings.reduce((s, h) => s + h.value, 0) ?? 0;
  const realEstate = (c.investing?.properties ?? []).reduce(
    (s, p) => s + Math.max(0, p.value - p.mortgage),
    0,
  );
  const businesses = (c.businessHub?.businesses ?? []).reduce(
    (s, b) => s + Math.max(0, b.cash + b.profit * 3),
    0,
  );
  const trust = c.dynasty?.trust?.corpus ?? 0;
  return Math.round(
    Math.max(0, c.money) +
      investments +
      realEstate +
      businesses +
      estateValue(c) +
      collectionsValue(c) +
      transportValue(c) +
      trust,
  );
}

function logScale(value: number, cap: number): number {
  if (value <= 0) return 0;
  return clamp(Math.round((Math.log10(value) / Math.log10(cap)) * 100));
}

export function prestigeBreakdown(c: Character): PrestigeBreakdown {
  const d = c.dynasty;
  const lib = d?.library ?? [];
  const worth = familyNetWorth(c) + (d?.wealthCreated ?? 0);

  const wealth = logScale(worth, 10_000_000_000);
  const academic = clamp(
    lib.filter((l) => l.category === "Degree").length * 8 +
      lib.filter((l) => l.category === "Honor").length * 10 +
      ((d?.almaMaters?.length ?? 0) > 0 ? 10 : 0),
  );
  const political = clamp(
    (d?.officesWon ?? 0) * 12 +
      (d?.billsPassed ?? 0) * 4 +
      Math.round(c.politicalInfluence / 4),
  );
  const athletic = clamp(
    (d?.championships ?? 0) * 10 +
      (c.athlete?.hallOfFame ? 25 : 0) +
      (c.athlete?.majors ?? 0) * 8,
  );
  const business = clamp(
    (c.businessHub?.businesses.length ?? 0) * 12 +
      Math.round(c.businessReputation / 3) +
      logScale(d?.wealthCreated ?? 0, 1_000_000_000) / 2,
  );
  const philanthropic = clamp(
    Math.round((d?.foundation?.impact ?? 0) * 0.6) +
      (d?.namedBuildings?.length ?? 0) * 12 +
      (d?.foundation?.scholarships ?? 0) * 3 +
      Math.min(20, d?.boardYearsTotal ?? 0),
  );
  const social = clamp(
    (d?.pedigree ?? 0) / 2 +
      (c.clubs?.length ?? 0) * 8 +
      (d?.seat?.housePrestige ?? 0) / 3 +
      (d?.traditions?.filter((t) => t.yearsMaintained >= 5).length ?? 0) * 5 +
      ((d?.unity ?? 60) - 60) / 4,
  );

  const overall = clamp(
    Math.round(
      wealth * 0.2 +
        academic * 0.12 +
        political * 0.12 +
        athletic * 0.1 +
        business * 0.16 +
        philanthropic * 0.15 +
        social * 0.15,
    ),
  );
  return {
    wealth,
    academic,
    political,
    athletic,
    business,
    philanthropic,
    social,
    overall,
  };
}

/** Legacy Progress: goals completed over goals defined, 0–100. */
export function legacyProgress(c: Character): number {
  const done = c.dynasty?.goalsDone?.length ?? 0;
  return Math.round((done / DYNASTY_GOALS.length) * 100);
}

// ---------- Dynasty goals ----------

export interface DynastyGoal {
  id: string;
  title: string;
  hint: string;
  prestige: number; // reputation reward
  check: (c: Character) => boolean;
}

export const DYNASTY_GOALS: DynastyGoal[] = [
  {
    id: "billion",
    title: "The Billion",
    hint: "Reach $1B family wealth",
    prestige: 10,
    check: (c) =>
      familyNetWorth(c) + (c.dynasty?.wealthCreated ?? 0) >= 1_000_000_000,
  },
  {
    id: "fourgrads",
    title: "Four in a Row",
    hint: "Four university degrees in the family library",
    prestige: 6,
    check: (c) =>
      (c.dynasty?.library?.filter(
        (l) => l.category === "Degree" && l.title.includes("—"),
      ).length ?? 0) >= 4,
  },
  {
    id: "threepoliticians",
    title: "A Political House",
    hint: "Three elections won across the dynasty",
    prestige: 8,
    check: (c) =>
      (c.dynasty?.officesWon ?? 0) +
        (c.politics?.electionHistory?.filter((e) => e.result === "won")
          .length ?? 0) >=
      3,
  },
  {
    id: "fivegens",
    title: "Five Generations",
    hint: "The name survives five generations",
    prestige: 10,
    check: (c) => (c.dynasty?.generation ?? 1) >= 5,
  },
  {
    id: "twentydescendants",
    title: "A Full Table",
    hint: "Twenty descendants recorded across the dynasty",
    prestige: 5,
    check: (c) =>
      (c.dynasty?.archives?.filter((a) => a.kind === "birth").length ?? 0) +
        (c.children?.length ?? 0) >=
      20,
  },
  {
    id: "centurybusiness",
    title: "The Hundred-Year Firm",
    hint: "Family businesses across three generations",
    prestige: 8,
    check: (c) =>
      (
        c.dynasty?.archives
          ?.filter((a) => a.kind === "business")
          .map((a) => a.generation) ?? []
      ).filter((v, i, arr) => arr.indexOf(v) === i).length >= 3,
  },
  {
    id: "councilcentury",
    title: "The Standing Council",
    hint: "A tradition maintained 25 years",
    prestige: 6,
    check: (c) =>
      (c.dynasty?.traditions ?? []).some((t) => t.yearsMaintained >= 25),
  },
  {
    id: "fivescholarships",
    title: "The Scholars' Patron",
    hint: "Endow five scholarships",
    prestige: 6,
    check: (c) => (c.dynasty?.foundation?.scholarships ?? 0) >= 5,
  },
  {
    id: "namedskyline",
    title: "A Name in Stone",
    hint: "Three named buildings",
    prestige: 10,
    check: (c) => (c.dynasty?.namedBuildings?.length ?? 0) >= 3,
  },
  {
    id: "fullhouse",
    title: "The Complete Seat",
    hint: "Ten estate upgrades on the Family Seat",
    prestige: 7,
    check: (c) => (c.dynasty?.seat?.upgrades?.length ?? 0) >= 10,
  },
  {
    id: "greatcollection",
    title: "The Great Collection",
    hint: "A collection worth $25M",
    prestige: 7,
    check: (c) => collectionsValue(c) >= 25_000_000,
  },
  {
    id: "pillarofsociety",
    title: "Pillar of Society",
    hint: "Overall dynasty prestige 80+",
    prestige: 8,
    check: (c) => prestigeBreakdown(c).overall >= 80,
  },
];

export function advanceGoals(c: Character, log: LogEntry[]) {
  const d = ensureRecords(c);
  for (const g of DYNASTY_GOALS) {
    if (d.goalsDone!.includes(g.id)) continue;
    let done = false;
    try {
      done = g.check(c);
    } catch {
      done = false;
    }
    if (done) {
      d.goalsDone!.push(g.id);
      d.reputation = clamp(d.reputation + g.prestige);
      d.legacyScore += g.prestige * 2;
      log.push({
        age: c.age,
        text: `DYNASTY ACHIEVEMENT — ${g.title}: ${g.hint}. Some things take longer than a lifetime; this one just finished.`,
        tone: "milestone",
      });
      const arch = d.archives ?? (d.archives = []);
      const key = `goal:${g.id}`;
      if (!arch.some((a) => a.id === key))
        arch.push({
          id: key,
          generation: d.generation,
          age: c.age,
          person: c.name,
          kind: "milestone",
          text: `Dynasty achievement: ${g.title} — ${g.hint}.`,
        });
    }
  }
}
