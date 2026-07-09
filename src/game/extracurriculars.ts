import type { Character, ECChallenge, LogEntry, LogTone, Scholarship } from "./types";
import type { QuizCategory } from "./quiz";
import { SCHOOLS } from "./schools";
import { clamp, randInt, randItem } from "./util";

// ---------------------------------------------------------------------------
// Interactive clubs & sports. Each active extracurricular generates one live
// competition per academic year, resolved through a 5-question quiz against a
// rival prestigious school. Wins earn awards, prestige, and — for standouts —
// scholarships and leadership titles.
// ---------------------------------------------------------------------------

export const MAX_EXTRACURRICULARS = 3;

interface ECDef {
  category: QuizCategory;
  events: string[];
  leadershipTitle?: string; // awarded to winners (student government etc.)
}

const CLUB_DEFS: Record<string, ECDef> = {
  "Debate Team": { category: "debate", events: ["Regional Debate Tournament", "National Debate Championship"] },
  "Chess Club": { category: "ib_math", events: ["Regional Chess Open", "State Chess Championship"] },
  Robotics: { category: "robotics", events: ["Regional Robotics Competition", "National Robotics Finals"] },
  "Drama Club": { category: "ib_arts", events: ["Regional Theatre Festival", "State One-Act Competition"] },
  "Student Council": {
    category: "leadership",
    events: ["Student Body Election", "Leadership Summit"],
    leadershipTitle: "Student Council Officer",
  },
  "Science Olympiad": { category: "ib_science", events: ["Regional Science Olympiad", "National Science Olympiad"] },
  Band: { category: "ib_arts", events: ["Regional Band Competition", "State Marching Finals"] },
  "Art Club": { category: "ib_arts", events: ["Regional Art Showcase", "Juried Exhibition"] },
  "Coding Club": { category: "robotics", events: ["Regional Hackathon", "National Coding Contest"] },
  "Model UN": {
    category: "ib_society",
    events: ["Regional Model UN Conference", "International Model UN"],
    leadershipTitle: "Model UN Head Delegate",
  },
  "Investment Club": { category: "finance", events: ["Stock Pitch Competition", "Portfolio Challenge"] },
};

function sportDef(name: string): ECDef {
  return { category: "athletics", events: [`${name} Regional Championship`, `${name} State Finals`] };
}

export function ecDef(kind: "club" | "sport", name: string): ECDef {
  if (kind === "club") return CLUB_DEFS[name] ?? { category: "leadership", events: [`${name} Competition`] };
  return sportDef(name);
}

function rivalSchool(c: Character): string {
  const rivals = SCHOOLS.filter((s) => s.name !== c.edu.school);
  const pool = rivals.length ? rivals : SCHOOLS;
  return randItem(pool).name;
}

/** Build this year's competitions for every active club and sport. */
export function generateECChallenges(c: Character): ECChallenge[] {
  const out: ECChallenge[] = [];
  const activities: { kind: "club" | "sport"; name: string }[] = [
    ...c.edu.clubs.map((name) => ({ kind: "club" as const, name })),
    ...c.edu.sports.map((name) => ({ kind: "sport" as const, name })),
  ];
  for (const a of activities.slice(0, MAX_EXTRACURRICULARS)) {
    const def = ecDef(a.kind, a.name);
    const event = randItem(def.events);
    out.push({
      activity: a.name,
      kind: a.kind,
      title: `${a.name}: ${event}`,
      subtitle: `Compete against ${rivalSchool(c)}. Answer 5 questions to decide the outcome.`,
      category: def.category,
      rival: rivalSchool(c),
      event,
    });
  }
  return out;
}

export interface ECResolution {
  message: string;
  tone: LogTone;
}

/** Apply the outcome of one extracurricular competition based on quiz ratio. */
export function resolveECChallenge(
  c: Character,
  challenge: ECChallenge,
  ratio: number,
  log: LogEntry[],
): ECResolution {
  const def = ecDef(challenge.kind, challenge.activity);
  const national = /National|State|International|Championship|Finals/i.test(challenge.event);
  const won = ratio >= (national ? 0.6 : 0.5);
  const dominant = ratio >= 0.8;
  const pct = Math.round(ratio * 100);

  if (challenge.kind === "sport") {
    // Small injury risk in physical competition, mitigated by fitness.
    if (Math.random() < Math.max(0.03, 0.14 - c.fitness / 800)) {
      c.stats.health = clamp(c.stats.health - randInt(4, 10));
      log.push({
        age: c.age,
        text: `You picked up a minor injury during ${challenge.event}.`,
        tone: "bad",
      });
    }
    c.fitness = clamp(c.fitness + randInt(1, 3));
  }

  if (won) {
    const place = dominant ? "1st place" : "a podium finish";
    const award = `${challenge.event} — ${place} (age ${c.age})`;
    c.edu.awards.push(award);
    c.stats.happiness = clamp(c.stats.happiness + randInt(3, 7));
    c.networking = clamp((c.networking ?? 0) + randInt(2, 5));

    // Leadership titles for student government / MUN wins.
    if (def.leadershipTitle) {
      c.edu.leadership = c.edu.leadership ?? [];
      if (!c.edu.leadership.includes(def.leadershipTitle)) c.edu.leadership.push(def.leadershipTitle);
    }

    // Standout national/state wins can earn a talent scholarship.
    if (dominant && national) {
      const existing = c.edu.scholarships.some((s) => s.name.startsWith(challenge.activity));
      if (!existing) {
        const sc: Scholarship = {
          name: `${challenge.activity} Talent Scholarship`,
          amount: challenge.kind === "sport" ? randInt(6000, 12000) : randInt(4000, 9000),
          kind: challenge.kind === "sport" ? "athletic" : "merit",
          reason: `Standout ${challenge.event} performance`,
          renewable: true,
          minGpa: 2.8,
          status: "active",
        };
        c.edu.scholarships.push(sc);
        log.push({
          age: c.age,
          text: `Your ${challenge.event} win earned a ${sc.name} ($${sc.amount.toLocaleString()}/yr).`,
          tone: "good",
        });
      }
    }
    const msg = `You scored ${pct}% and won ${challenge.event} for ${c.edu.school}! (${place})`;
    log.push({ age: c.age, text: msg, tone: "milestone" });
    return { message: msg, tone: "milestone" };
  }

  c.stats.happiness = clamp(c.stats.happiness - randInt(1, 3));
  const msg = `You scored ${pct}% at ${challenge.event}. ${challenge.rival} took the win this time — train harder for next year.`;
  log.push({ age: c.age, text: msg, tone: "neutral" });
  return { message: msg, tone: "neutral" };
}
