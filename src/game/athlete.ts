import type { AthleteState, Character, LogEntry, LogTone, Sport, SportMoment } from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Athlete path (Build 11). One engine, five sports. Tennis runs the deepest
// simulation: world ranking, tournament tiers, prize money, Slams. Team
// sports run drafts, contracts, playoffs and championships. Seasons simulate
// yearly with 1-3 playable "big moments"; injuries are realistic and careers
// can genuinely end early.
// ---------------------------------------------------------------------------

export interface AthleteResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): AthleteResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

// ---------- Sport definitions ----------

export interface SportDef {
  id: Sport;
  label: string;
  team: boolean;
  league: string;
  schoolSport: string; // matching entry in edu.sports
  rookieSalary: number;
  starSalary: number;
  injuryRate: number; // baseline yearly injury chance at full health
  declineAge: number; // decline accelerates past this
  retirementAge: number; // hard ceiling-ish
}

export const SPORT_DEFS: SportDef[] = [
  {
    id: "tennis",
    label: "Tennis",
    team: false,
    league: "Pro Tour",
    schoolSport: "Tennis",
    rookieSalary: 0,
    starSalary: 0,
    injuryRate: 0.16,
    declineAge: 29,
    retirementAge: 38,
  },
  {
    id: "basketball",
    label: "Basketball",
    team: true,
    league: "National Basketball League",
    schoolSport: "Basketball",
    rookieSalary: 900000,
    starSalary: 30000000,
    injuryRate: 0.18,
    declineAge: 30,
    retirementAge: 38,
  },
  {
    id: "soccer",
    label: "Soccer",
    team: true,
    league: "Premier Division",
    schoolSport: "Soccer",
    rookieSalary: 300000,
    starSalary: 20000000,
    injuryRate: 0.17,
    declineAge: 29,
    retirementAge: 37,
  },
  {
    id: "hockey",
    label: "Hockey",
    team: true,
    league: "National Hockey League",
    schoolSport: "Hockey",
    rookieSalary: 750000,
    starSalary: 12000000,
    injuryRate: 0.22,
    declineAge: 31,
    retirementAge: 40,
  },
  {
    id: "mma",
    label: "MMA / Combat Sports",
    team: false,
    league: "World Fighting Championship",
    schoolSport: "Wrestling",
    rookieSalary: 0,
    starSalary: 0,
    injuryRate: 0.3,
    declineAge: 32,
    retirementAge: 40,
  },
  {
    id: "football",
    label: "Football",
    team: true,
    league: "Pro Football League",
    schoolSport: "Football",
    rookieSalary: 800000,
    starSalary: 25000000,
    injuryRate: 0.28,
    declineAge: 28,
    retirementAge: 35,
  },
];

export function sportDef(id: Sport): SportDef {
  return SPORT_DEFS.find((s) => s.id === id)!;
}

const TEAM_CITIES = [
  "Toronto",
  "Chicago",
  "Madrid",
  "Manchester",
  "Boston",
  "Dallas",
  "Munich",
  "Vancouver",
  "Miami",
  "Osaka",
];
const TEAM_NAMES = [
  "Falcons",
  "United",
  "Storm",
  "Rangers",
  "Titans",
  "Rovers",
  "Sentinels",
  "Wolves",
  "Athletic",
  "Comets",
];

// ---------- State ----------

export function defaultAthlete(): AthleteState {
  return {
    stage: "none",
    talent: 0,
    skill: 0,
    fitness: 50,
    inAcademy: false,
    yearsTraining: 0,
    endorsements: 0,
    careerEarnings: 0,
    peakAge: randInt(25, 28),
    chronicWear: 0,
    injuriesCount: 0,
    titles: 0,
    majors: 0,
    mvps: 0,
    hallOfFame: false,
    fixOffered: false,
    bannedYears: 0,
    seasonLog: [],
  };
}

export function ensureAthlete(c: Character): AthleteState {
  if (!c.athlete) c.athlete = defaultAthlete();
  return c.athlete;
}

function record(a: AthleteState, age: number, summary: string, tone: LogTone) {
  a.seasonLog.push({ age, summary, tone });
  if (a.seasonLog.length > 60) a.seasonLog.shift();
}

/** Effective on-court ability right now. */
export function effectiveSkill(a: AthleteState): number {
  let s = a.skill * (0.6 + a.fitness / 250);
  if (a.injury) s *= a.injury.severity === "minor" ? 0.85 : 0.55;
  return s;
}

// ---------- Youth & pipeline ----------

export function chooseSport(input: Character, sport: Sport): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (a.stage === "pro" || a.stage === "retired")
    return fail(input, "Your athletic story is already written in another sport.");
  if (c.age < 8) return fail(input, "A little young — sports focus starts at 8.");
  if (c.age > 22 && a.stage === "none")
    return fail(input, "Realistically, an elite career needs to start before 23.");
  const def = sportDef(sport);
  const fresh = !a.sport;
  a.sport = sport;
  if (a.stage === "none") a.stage = "youth";
  if (fresh) {
    // Innate ceiling: genetics (health/looks proxy) + luck; school team helps discovery.
    a.talent = clamp(
      30 +
        randInt(0, 30) +
        Math.round(c.stats.health / 5) +
        (c.edu.sports?.includes(def.schoolSport) ? 8 : 0),
      10,
      99,
    );
    a.skill = clamp(10 + Math.round(a.talent / 5));
  }
  const msg = `You committed to ${def.label}. ${a.talent >= 75 ? "Coaches whisper that you might be special." : a.talent >= 55 ? "You've got real promise." : "You'll have to outwork your talent."}`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function trainSport(input: Character, spend: (c: Character) => boolean): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (!a.sport) return fail(input, "Pick a sport first.");
  if (a.stage === "retired") return fail(input, "Those days are behind you — gloriously.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const young = c.age <= 23;
  const headroom = Math.max(0, a.talent - a.skill);
  const gain = clamp(
    randInt(3, 7) + (a.inAcademy ? 3 : 0) + (young ? 2 : 0),
    1,
    Math.max(1, Math.ceil(headroom / 2) + 2),
  );
  a.skill = clamp(a.skill + gain, 0, Math.min(100, a.talent + 10));
  a.fitness = clamp(a.fitness + randInt(3, 6));
  a.yearsTraining += 1;
  c.stats.health = clamp(c.stats.health + 1);
  const msg = `Brutal training block: +${gain} skill (now ${a.skill}).${a.skill >= a.talent ? " You're bumping against your natural ceiling." : ""}`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function joinAcademy(input: Character): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (!a.sport) return fail(input, "Pick a sport first.");
  if (a.inAcademy) return fail(input, "You're already training at a private academy.");
  if (a.stage !== "youth" && a.stage !== "junior")
    return fail(input, "Academies develop young players — that window has passed.");
  const cost = 15000;
  if (c.money < cost)
    return fail(
      input,
      `Academy tuition is $${cost.toLocaleString()}/yr — you can't cover the first year.`,
    );
  c.money -= cost;
  a.inAcademy = true;
  a.talent = clamp(a.talent + randInt(2, 6)); // elite coaching raises the ceiling a little
  const msg = `You enrolled at a private ${sportDef(a.sport).label.toLowerCase()} academy — elite coaching outside school, $${cost.toLocaleString()}/yr.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

/** Tennis: turn pro as a junior. Team sports: enter the draft (college or 18+). */
export function turnPro(input: Character): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (!a.sport) return fail(input, "Pick a sport first.");
  const def = sportDef(a.sport);
  if (a.stage === "pro") return fail(input, "You're already a professional.");
  if (c.age < 16 && a.sport === "tennis")
    return fail(input, "Tennis pros can start at 16 — not before.");
  if (c.age < 18 && a.sport !== "tennis") return fail(input, `${def.league} drafts start at 18.`);
  const bar = a.sport === "tennis" ? 45 : a.sport === "mma" ? 50 : 55;
  if (a.skill < bar)
    return fail(
      input,
      `Scouts aren't convinced — you need ${bar}+ skill (now ${a.skill}). Keep training${a.stage === "youth" ? " or use college ball to develop" : ""}.`,
    );

  const wasCollege = a.stage === "college";
  a.stage = "pro";
  if (a.sport === "mma") {
    a.ranking = clamp(50 - Math.round(a.skill / 4) - randInt(0, 5), 15, 50);
    a.fightWins = 0;
    a.fightLosses = 0;
    a.fightKOs = 0;
    a.beltDefenses = 0;
    const msg = `You turned pro! Regional cards, small purses — ranked #${a.ranking} in the division. Every fight leaves a mark.`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    record(a, c.age, `Turned pro fighter, ranked #${a.ranking}`, "milestone");
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  if (a.sport === "tennis") {
    a.ranking = clamp(900 - a.skill * 6 - randInt(0, 100), 150, 900);
    a.rankingPoints = 10;
    const msg = `You turned pro! Welcome to the tour — world ranking #${a.ranking}. Futures events, cheap motels, big dreams.`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    record(a, c.age, `Turned pro, ranked #${a.ranking}`, "milestone");
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  const draftScore = a.skill + (wasCollege ? 10 : 0) + randInt(-10, 10);
  const round = draftScore >= 80 ? 1 : draftScore >= 65 ? 2 : 3;
  a.team = `${randItem(TEAM_CITIES)} ${randItem(TEAM_NAMES)}`;
  const salary = Math.round(def.rookieSalary * (round === 1 ? 2.2 : round === 2 ? 1.2 : 0.8));
  a.contract = { salary, yearsLeft: 3 };
  c.fame += round === 1 ? 8 : 3;
  const msg = `DRAFT NIGHT: The ${a.team} selected you in round ${round}! Rookie contract: $${salary.toLocaleString()}/yr for 3 years.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  record(a, c.age, `Drafted round ${round} by the ${a.team}`, "milestone");
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function playCollegeBall(input: Character): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (!a.sport || sportDef(a.sport).team === false)
    return fail(
      input,
      "College ball is the team-sport route — tennis players grind the junior circuit instead.",
    );
  if (a.stage !== "youth" && a.stage !== "junior") return fail(input, "That ship has sailed.");
  if (c.age < 18) return fail(input, "College sports start at 18.");
  if (a.skill < 40) return fail(input, `College programs want 40+ skill (now ${a.skill}).`);
  a.stage = "college";
  const msg = `You made the varsity ${sportDef(a.sport).label.toLowerCase()} squad on a sports scholarship. Develop, get scouted, get drafted.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Big moments ----------

interface MomentTemplate {
  id: string;
  stakes: SportMoment["stakes"];
  title: (a: AthleteState, def: SportDef) => string;
  description: (a: AthleteState, def: SportDef) => string;
  options: SportMoment["options"];
}

const MOMENTS: MomentTemplate[] = [
  {
    id: "clutch",
    stakes: "regular",
    title: (_a, def) => (def.team ? "Down to the Wire" : "Deciding-Set Tiebreak"),
    description: (_a, def) =>
      def.team
        ? "Season on the line, final possession, the play is yours to call."
        : "Third-set tiebreak against a higher-ranked opponent. The crowd has picked a side — not yours.",
    options: [
      {
        label: "Take the big shot yourself",
        text: "Hero or zero — you chose hero's odds.",
        tone: "neutral",
        performance: 4,
        injuryRisk: 0.05,
      },
      {
        label: "Play the percentages",
        text: "Composed, clinical, mature.",
        tone: "neutral",
        performance: 2,
      },
      {
        label: "Play it safe and protect your body",
        text: "Cautious — the tank stays full but the moment slips.",
        tone: "neutral",
        performance: -2,
      },
    ],
  },
  {
    id: "playoff",
    stakes: "playoff",
    title: (_a, def) => (def.team ? "Playoff Grind" : "Quarterfinal Under the Lights"),
    description: (a, def) =>
      def.team
        ? "Deep playoff run. Your body is screaming; the city is dreaming."
        : `A packed night session, quarterfinals. Win and the draw opens up.${a.injury ? " Your injury is barking with every step." : ""}`,
    options: [
      {
        label: "Empty the tank",
        text: "You gave everything, holding nothing back.",
        tone: "neutral",
        performance: 5,
        injuryRisk: 0.12,
      },
      {
        label: "Manage the effort intelligently",
        text: "Peaks and valleys, all calculated.",
        tone: "neutral",
        performance: 2,
      },
    ],
  },
  {
    id: "final",
    stakes: "final",
    title: (_a, def) => (def.team ? "Championship Game" : "Tournament Final"),
    description: (_a, def) =>
      def.team
        ? "The final. Everything you've ever trained for fits inside the next few hours."
        : "Championship Sunday. One more win.",
    options: [
      {
        label: "Attack from the first whistle",
        text: "Fearless, front-foot, relentless.",
        tone: "neutral",
        performance: 4,
        injuryRisk: 0.08,
      },
      {
        label: "Start solid, finish strong",
        text: "You saved your best for when it counted.",
        tone: "neutral",
        performance: 3,
      },
      {
        label: "Let the moment come to you",
        text: "Patient — maybe too patient.",
        tone: "neutral",
        performance: 0,
      },
    ],
  },
  {
    id: "slam",
    stakes: "slam",
    title: () => "Grand Slam Deep Run",
    description: () =>
      "Second week of a Slam. Every match from here is against a legend or a future one.",
    options: [
      {
        label: "Swing free — nothing to lose",
        text: "Highlight reels for days.",
        tone: "neutral",
        performance: 4,
        injuryRisk: 0.06,
      },
      {
        label: "Trust the game plan",
        text: "Point by point, hour by hour.",
        tone: "neutral",
        performance: 3,
      },
    ],
  },
];

const FIX_MOMENT: MomentTemplate = {
  id: "fix",
  stakes: "regular",
  title: () => "An Envelope in the Locker Room",
  description: () =>
    "A stranger who knows too much about your finances offers six figures to lose — 'just this one, nobody gets hurt.' He isn't asking twice.",
  options: [
    {
      label: "Refuse and report it to the integrity unit",
      text: "Investigators moved fast. You testified. The sport quietly thanked you.",
      tone: "good",
      performance: 0,
      reportFix: true,
    },
    {
      label: "Refuse quietly and walk away",
      text: "You said nothing. The offer evaporated — the memory didn't.",
      tone: "neutral",
      performance: -1,
    },
    {
      label: "Take the money and throw the match",
      text: "The money landed. So did the pattern in the betting data.",
      tone: "bad",
      performance: -8,
      corrupt: true,
      banRisk: true,
    },
    {
      label: "Pretend to accept, then expose the ring",
      text: "Wired up and terrified, you delivered them to investigators. Front-page hero.",
      tone: "good",
      performance: 0,
      reportFix: true,
    },
  ],
};

export function resolveMoment(input: Character, optionIndex: number): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  const m = a.pendingMoment;
  const opt = m?.options[optionIndex];
  if (!m || !opt) return fail(input, "No moment awaiting a decision.");
  a.pendingMoment = undefined;

  // Match-fixing branch.
  if (m.id.startsWith("fix")) {
    if (opt.reportFix) {
      c.fame += 5;
      a.endorsements += 20000;
      const isSting = optionIndex === 3;
      const msg = isSting
        ? "You wore a wire and brought down a fixing ring. Sponsors love integrity with a story."
        : "You reported the approach. The integrity unit made arrests weeks later.";
      c.log.push({ age: c.age, text: msg, tone: "good" });
      record(a, c.age, "Refused a match-fixing bribe", "good");
      return { character: c, message: msg, tone: "good", ok: true };
    }
    if (opt.corrupt) {
      const bribe = randInt(120000, 300000);
      c.money += bribe;
      a.careerEarnings += bribe;
      const caught = Math.random() < 0.45;
      if (caught) {
        a.bannedYears = randInt(2, 4);
        c.fame = Math.max(0, c.fame - 15);
        c.criminalRecord += 1;
        a.endorsements = 0;
        const msg = `You threw the match for $${bribe.toLocaleString()} — and the betting patterns gave you away. BANNED ${a.bannedYears} years. Sponsors fled overnight.`;
        c.log.push({ age: c.age, text: msg, tone: "bad" });
        record(a, c.age, `Banned ${a.bannedYears} years for match-fixing`, "bad");
        return { character: c, message: msg, tone: "bad", ok: true };
      }
      const msg = `You took $${bribe.toLocaleString()} and tanked it. Nobody noticed. This time.`;
      c.log.push({ age: c.age, text: msg, tone: "bad" });
      return { character: c, message: msg, tone: "bad", ok: true };
    }
    const msg = "You walked away from the envelope. Some money costs too much.";
    c.log.push({ age: c.age, text: msg, tone: "neutral" });
    return { character: c, message: msg, tone: "neutral", ok: true };
  }

  // Performance moments.
  const roll = effectiveSkill(a) + opt.performance * 3 + randInt(-12, 12);
  const bar =
    m.stakes === "slam" ? 68 : m.stakes === "final" ? 62 : m.stakes === "playoff" ? 55 : 48;
  const won = roll >= bar;
  const def = sportDef(a.sport!);

  if (opt.injuryRisk && Math.random() < opt.injuryRisk + a.chronicWear / 400) {
    inflictInjury(c, a, "pushing through the biggest match of the year");
  }

  let msg: string;
  let tone: LogTone;
  if (won) {
    if (m.stakes === "slam" || m.stakes === "final") {
      a.majors += m.stakes === "slam" ? 1 : 0;
      a.titles += 1;
      if (def.team && m.stakes === "final") a.majors += 1;
      c.fame += m.stakes === "slam" ? 12 : 8;
      const prize =
        a.sport === "tennis"
          ? m.stakes === "slam"
            ? randInt(2000000, 3000000)
            : randInt(300000, 800000)
          : 0;
      if (prize) {
        c.money += prize;
        a.careerEarnings += prize;
      }
      msg =
        m.stakes === "slam"
          ? `CHAMPION! You won the Grand Slam${prize ? ` and $${prize.toLocaleString()}` : ""}! ${opt.text}`
          : def.team
            ? `CHAMPIONS! The ${a.team} won it all — and you were at the heart of it!`
            : `You won the title! ${opt.text}`;
      tone = "milestone";
      record(
        a,
        c.age,
        m.stakes === "slam" ? "WON A GRAND SLAM" : "Won the championship",
        "milestone",
      );
    } else {
      c.fame += 3;
      a.skill = clamp(a.skill + 1, 0, 100);
      msg = `You delivered when it mattered. ${opt.text}`;
      tone = "good";
      record(a, c.age, "Clutch performance", "good");
    }
    if (a.sport === "tennis" && a.ranking)
      a.ranking = Math.max(1, a.ranking - (m.stakes === "slam" ? randInt(8, 20) : randInt(3, 10)));
  } else {
    msg = `Heartbreak — it slipped away at the end. ${opt.text}`;
    tone = "bad";
    c.stats.happiness = clamp(c.stats.happiness - 4);
    record(
      a,
      c.age,
      m.stakes === "slam" ? "Slam run ended in heartbreak" : "Fell short in the big one",
      "bad",
    );
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Injuries ----------

const INJURIES: Record<Sport, string[]> = {
  mma: ["broken orbital bone", "torn ACL", "detached retina", "broken hand", "herniated disc"],
  tennis: [
    "wrist tendon tear",
    "shoulder labrum tear",
    "chronic back injury",
    "torn abdominal muscle",
  ],
  basketball: ["torn ACL", "achilles rupture", "stress fracture", "torn meniscus"],
  soccer: ["torn ACL", "hamstring tear", "broken metatarsal", "ankle ligament rupture"],
  hockey: ["shoulder separation", "concussion", "torn labrum", "knee MCL tear"],
  football: ["torn ACL", "concussion", "achilles rupture", "spinal disc injury"],
};

function inflictInjury(c: Character, a: AthleteState, context: string) {
  const name = randItem(INJURIES[a.sport!]);
  const wearRoll = randInt(0, 100) + a.chronicWear / 2 + (c.age > a.peakAge ? 15 : 0);
  const severity = wearRoll > 110 ? "career-threatening" : wearRoll > 70 ? "major" : "minor";
  a.injury = { name, severity, yearsLeft: severity === "minor" ? 1 : severity === "major" ? 1 : 2 };
  a.injuriesCount += 1;
  a.chronicWear = clamp(
    a.chronicWear + (severity === "minor" ? 6 : severity === "major" ? 15 : 28),
  );
  a.fitness = clamp(a.fitness - (severity === "minor" ? 8 : 20));
  c.stats.health = clamp(c.stats.health - (severity === "minor" ? 2 : 6));
  c.log.push({
    age: c.age,
    text: `INJURY: You suffered a ${name} ${context}. ${severity === "career-threatening" ? "Doctors are using words like 'may never play again.'" : severity === "major" ? "You'll miss serious time." : "A few weeks out."}`,
    tone: "bad",
  });
  record(a, c.age, `Injured: ${name} (${severity})`, "bad");
}

// ---------- Contracts, agents, endorsements ----------

export function negotiateContract(input: Character): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (a.stage !== "pro" || !a.sport) return fail(input, "No pro career to negotiate.");
  const def = sportDef(a.sport);
  if (!def.team)
    return fail(
      input,
      "Tennis players earn prize money, not salaries — hire an agent for sponsors instead.",
    );
  if (a.contract && a.contract.yearsLeft > 1)
    return fail(input, `Your current deal runs ${a.contract.yearsLeft} more years.`);
  if (effectiveSkill(a) < 40)
    return fail(
      input,
      "Your agent's calls aren't being returned — no team wants to sign you at this level.",
    );
  const hasAgent = c.contacts?.some((x) => x.type === "agent" && x.relationship >= 50) ?? false;
  const leverage =
    effectiveSkill(a) +
    c.fame / 4 +
    a.mvps * 8 +
    (hasAgent ? 12 : 0) -
    (c.age > a.peakAge ? (c.age - a.peakAge) * 6 : 0);
  const salary = Math.round(
    Math.min(def.starSalary, Math.max(def.rookieSalary * 0.6, def.starSalary * (leverage / 120))),
  );
  const years = c.age > a.peakAge ? randInt(1, 2) : randInt(2, 4);
  a.contract = { salary, yearsLeft: years };
  const msg = `New deal with the ${a.team}: $${salary.toLocaleString()}/yr for ${years} years.${hasAgent ? " Your agent squeezed every dollar." : " (An agent contact would have squeezed out more.)"}`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  record(a, c.age, `Signed ${years}-yr, $${Math.round(salary / 1e6)}M/yr contract`, "milestone");
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Retirement & post-career ----------

export function retire(input: Character): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (a.stage !== "pro") return fail(input, "You're not an active pro.");
  a.stage = "retired";
  a.retiredAge = c.age;
  a.contract = undefined;
  a.pendingMoment = undefined;
  const legend = a.majors >= 3 || a.mvps >= 2 || (a.sport === "tennis" && a.titles >= 10);
  if (legend) {
    a.hallOfFame = true;
    c.fame += 15;
  }
  // Crossovers: a sports career is rocket fuel for public and business life.
  if (c.politics) {
    c.politics.reputation = clamp(c.politics.reputation + (legend ? 15 : 8));
  }
  c.businessReputation = clamp(c.businessReputation + (legend ? 10 : 5));
  const msg = legend
    ? `You retired at ${c.age} — and walked straight into the Hall of Fame. ${a.majors} major titles. A legend.`
    : `You announced your retirement at ${c.age}. ${a.titles} titles, ${a.injuriesCount} injuries, no regrets.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  record(a, c.age, legend ? "Retired — HALL OF FAME" : "Retired", "milestone");
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function startPostCareer(input: Character, role: "coach" | "commentator"): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (a.stage !== "retired") return fail(input, "Retire first — then the second act.");
  if (a.postCareer) return fail(input, "You already have a post-playing career.");
  if (c.job) return fail(input, "Quit your current job first.");
  a.postCareer = role;
  const salary = role === "coach" ? 120000 + a.majors * 60000 : 150000 + c.fame * 2000;
  c.job = {
    id: "athlete-post",
    title: role === "coach" ? `${sportDef(a.sport!).label} Coach` : "Sports Commentator",
    company: role === "coach" ? "Elite Academy" : "National Sports Network",
    salary,
    performance: 65,
    level: 2,
    field: "Sports",
    yearsAtLevel: 0,
    yearsAtCompany: 0,
    burnout: 10,
    managerRel: 60,
    coworkerRel: 65,
    bonusPct: 0.05,
    careerGroup: "sports-post",
  };
  const msg =
    role === "coach"
      ? `You became a coach — passing the obsession down ($${salary.toLocaleString()}/yr).`
      : `You joined the broadcast booth ($${salary.toLocaleString()}/yr). Takes required, hot ones preferred.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Yearly simulation ----------

function tennisSeason(c: Character, a: AthleteState, log: LogEntry[]) {
  const perf = effectiveSkill(a) + randInt(-10, 10);
  const r = a.ranking ?? 500;
  // Ranking moves toward what performance "deserves".
  const deservedRank = clamp(Math.round(1500 - perf * 18), 1, 1500);
  const drift = Math.round((deservedRank - r) * 0.45);
  a.ranking = clamp(r + drift + randInt(-15, 15), 1, 1500);

  // Prize money scales brutally nonlinearly with ranking.
  let prize = 0;
  if (a.ranking <= 10) prize = randInt(3000000, 8000000);
  else if (a.ranking <= 30) prize = randInt(1200000, 3000000);
  else if (a.ranking <= 80) prize = randInt(400000, 1200000);
  else if (a.ranking <= 200) prize = randInt(80000, 300000);
  else prize = randInt(15000, 60000);
  const expenses = a.ranking > 150 ? 45000 : 120000; // coach, travel, physio
  const net = prize - expenses;
  c.money += net;
  a.careerEarnings += Math.max(0, prize);

  // Titles at the top of the game.
  if (a.ranking <= 40 && Math.random() < 0.5) {
    const n = a.ranking <= 10 ? randInt(2, 5) : 1;
    a.titles += n;
    c.fame += n * 2;
    record(a, c.age, `Won ${n} tour title${n > 1 ? "s" : ""} (ranked #${a.ranking})`, "good");
  }
  const tone: LogTone = drift < -20 ? "good" : drift > 20 ? "bad" : "neutral";
  log.push({
    age: c.age,
    text: `Season on tour: ranking #${a.ranking} (${drift <= 0 ? "up" : "down"} ${Math.abs(drift)}), $${prize.toLocaleString()} prize money${net < 0 ? " — the tour cost more than it paid this year" : ""}.`,
    tone,
  });
}

function teamSeason(c: Character, a: AthleteState, log: LogEntry[]) {
  const def = sportDef(a.sport!);
  if (a.contract) {
    c.money += Math.round(a.contract.salary * 0.55); // taxes + agent + escrow
    a.careerEarnings += a.contract.salary;
    a.contract.yearsLeft -= 1;
    if (a.contract.yearsLeft <= 0) {
      log.push({
        age: c.age,
        text: `Your contract with the ${a.team} expired — negotiate a new deal or test free agency.`,
        tone: "neutral",
      });
      a.contract = undefined;
    }
  } else if (a.stage === "pro") {
    if (effectiveSkill(a) >= 40) {
      // Unsigned: prove-it year on a minimum deal.
      c.money += Math.round(def.rookieSalary * 0.4);
      log.push({
        age: c.age,
        text: "Playing on an unsigned tryout deal — get a contract done.",
        tone: "bad",
      });
    } else {
      log.push({
        age: c.age,
        text: "No team offered you so much as a tryout this year. The phone has gone quiet.",
        tone: "bad",
      });
    }
  }
  const perf = effectiveSkill(a) + randInt(-12, 12);
  if (perf > 80 && Math.random() < 0.35) {
    a.mvps += 1;
    c.fame += 10;
    log.push({
      age: c.age,
      text: `MVP SEASON! The league named you its most valuable player.`,
      tone: "milestone",
    });
    record(a, c.age, "League MVP", "milestone");
  } else if (perf > 65) {
    c.fame += 3;
    record(a, c.age, "All-star calibre season", "good");
  } else if (perf < 40) {
    record(a, c.age, "Struggled badly this season", "bad");
  }
  // Trades happen.
  if (!a.contract && Math.random() < 0.15) {
    const newTeam = `${randItem(TEAM_CITIES)} ${randItem(TEAM_NAMES)}`;
    if (newTeam !== a.team) {
      a.team = newTeam;
      log.push({
        age: c.age,
        text: `You were traded to the ${newTeam}. New city, same job: win.`,
        tone: "neutral",
      });
    }
  }
}

export function advanceAthlete(c: Character, log: LogEntry[]) {
  const a = c.athlete;
  if (!a?.sport || a.stage === "none") return;
  const def = sportDef(a.sport);

  // Serving a ban.
  if (a.bannedYears > 0) {
    a.bannedYears -= 1;
    a.skill = clamp(a.skill - 4);
    log.push({
      age: c.age,
      text:
        a.bannedYears > 0
          ? `Suspended: ${a.bannedYears} year(s) of your ban remain.`
          : "Your ban is over. The road back starts now.",
      tone: "bad",
    });
    return;
  }

  // Injury recovery.
  if (a.injury) {
    a.injury.yearsLeft -= 1;
    if (a.injury.yearsLeft <= 0) {
      const wasCareer = a.injury.severity === "career-threatening";
      log.push({
        age: c.age,
        text: `You're back from the ${a.injury.name}.${wasCareer ? " Doctors call it a miracle; you call it rehab." : ""}`,
        tone: "good",
      });
      if (wasCareer) a.skill = clamp(a.skill - randInt(8, 15));
      a.injury = undefined;
    }
  }

  // Academy tuition while young.
  if (a.inAcademy && (a.stage === "youth" || a.stage === "junior")) {
    if (c.money >= 15000) c.money -= 15000;
    else {
      a.inAcademy = false;
      log.push({
        age: c.age,
        text: "You couldn't afford academy tuition this year — back to public courts.",
        tone: "bad",
      });
    }
  }

  // Development / decline arc.
  if (a.stage !== "retired") {
    if (c.age <= a.peakAge) {
      const growth =
        a.stage === "college" ? randInt(2, 5) : a.stage === "pro" ? randInt(1, 3) : randInt(1, 2);
      a.skill = clamp(a.skill + growth, 0, Math.min(100, a.talent + 10));
    } else {
      const past = c.age - a.peakAge;
      const decline = Math.round(past * 0.8 + a.chronicWear / 20 + randInt(0, 2));
      a.skill = clamp(a.skill - decline);
      if (past === 1)
        log.push({
          age: c.age,
          text: "You feel it in the mornings now. The decline has quietly begun.",
          tone: "neutral",
        });
    }
    a.fitness = clamp(a.fitness - (c.age > def.declineAge ? 6 : 2));
  }

  // College years auto-develop and pressure the draft decision.
  if (a.stage === "college") {
    log.push({
      age: c.age,
      text: `Another college season in the books (skill ${a.skill}). Scouts are ${a.skill >= 60 ? "circling" : "lukewarm"}.`,
      tone: a.skill >= 60 ? "good" : "neutral",
    });
    if (c.age >= 23) {
      a.stage = "junior";
      log.push({
        age: c.age,
        text: "College eligibility exhausted — declare for the draft or move on with life.",
        tone: "neutral",
      });
    }
  }

  if (a.stage !== "pro") return;

  // The season itself.
  if (a.sport === "mma") mmaYear(c, a, log);
  else if (a.sport === "tennis") tennisSeason(c, a, log);
  else teamSeason(c, a, log);

  // Endorsements track fame and skill; agents multiply them.
  const hasAgent = c.contacts?.some((x) => x.type === "agent" && x.relationship >= 50) ?? false;
  a.endorsements = Math.round(
    (c.fame * 4000 + effectiveSkill(a) * 2000 + a.majors * 150000) * (hasAgent ? 1.5 : 1),
  );
  if (a.endorsements > 0) {
    c.money += a.endorsements;
    a.careerEarnings += a.endorsements;
  }

  // Injury roll for the season's grind.
  if (
    !a.injury &&
    Math.random() < def.injuryRate + a.chronicWear / 300 + (c.age > def.declineAge ? 0.08 : 0)
  ) {
    inflictInjury(c, a, "during the season");
  }

  // Career-threatening injury past the peak can simply end it.
  if (a.injury?.severity === "career-threatening" && c.age > a.peakAge && Math.random() < 0.4) {
    log.push({
      age: c.age,
      text: "The medical reports are unanimous. Your body has made the retirement decision for you.",
      tone: "bad",
    });
    const res = retire(c);
    Object.assign(c, res.character);
    return;
  }

  // Big moments: 1-3 per season depending on how good the season is.
  if (!a.pendingMoment) {
    const quality = effectiveSkill(a);
    if (
      !a.fixOffered &&
      a.stage === "pro" &&
      Math.random() < 0.12 &&
      (a.sport === "tennis" ? (a.ranking ?? 999) > 60 : true)
    ) {
      a.fixOffered = true;
      a.pendingMoment = buildMoment(FIX_MOMENT, a, def);
      log.push({
        age: c.age,
        text: "Someone approached you after practice. You should deal with this — Athlete hub.",
        tone: "bad",
      });
    } else if (Math.random() < 0.7) {
      let pool: MomentTemplate[];
      if (a.sport === "tennis" && (a.ranking ?? 999) <= 25 && Math.random() < 0.5)
        pool = MOMENTS.filter((m) => m.stakes === "slam");
      else if (quality > 70)
        pool = MOMENTS.filter((m) => m.stakes === "final" || m.stakes === "playoff");
      else pool = MOMENTS.filter((m) => m.stakes === "regular" || m.stakes === "playoff");
      a.pendingMoment = buildMoment(randItem(pool), a, def);
      log.push({
        age: c.age,
        text: `${a.pendingMoment.title} — a big moment awaits your call in the Athlete hub.`,
        tone: "neutral",
      });
    }
  }

  // Retirement pressure with teeth: the sport retires you before you choose to.
  if (c.age >= def.retirementAge || a.skill < 30) {
    const forced =
      c.age >= def.retirementAge + 2 || a.skill < 22 || (a.skill < 30 && Math.random() < 0.6);
    if (forced) {
      log.push({
        age: c.age,
        text:
          a.skill < 30
            ? "The level is gone and everyone can see it. The sport made the decision for you."
            : "Time, the undefeated opponent, finally won.",
        tone: "neutral",
      });
      const res = retire(c);
      Object.assign(c, res.character);
    } else {
      log.push({
        age: c.age,
        text: "Younger, faster players are everywhere. It might be time.",
        tone: "neutral",
      });
    }
  }
}

function buildMoment(t: MomentTemplate, a: AthleteState, def: SportDef): SportMoment {
  return {
    id: `${t.id}-${uid()}`,
    stakes: t.stakes,
    title: t.title(a, def),
    description: t.description(a, def),
    options: t.options,
  };
}

/** True when this character's job came from the athlete post-career system. */
export function isSportsPostCareer(c: Character): boolean {
  return c.job?.careerGroup === "sports-post";
}

// ---------------------------------------------------------------------------
// Combat sports (Build 13). No seasons — a fight-card structure: you choose
// each bout, each bout leaves permanent wear, and "one more fight" gets
// heavier every time. Rankings run 1 (champion contender) to 50.
// ---------------------------------------------------------------------------

export type FightTier = "safe" | "fair" | "risky";

const FIGHT_TIERS: Record<
  FightTier,
  { label: string; oppEdge: number; purseMult: number; rankJump: number }
> = {
  safe: { label: "a safe tune-up", oppEdge: -12, purseMult: 0.6, rankJump: 1 },
  fair: { label: "a ranked opponent", oppEdge: 0, purseMult: 1, rankJump: 3 },
  risky: { label: "a dangerous step-up", oppEdge: 12, purseMult: 1.8, rankJump: 6 },
};

export function fightPurse(a: AthleteState, tier: FightTier): number {
  const rank = a.ranking ?? 50;
  const base = 8000 + Math.max(0, 50 - rank) * 6000 + (a.beltHolder ? 400000 : 0);
  return Math.round(base * FIGHT_TIERS[tier].purseMult);
}

export function fightWinChance(c: Character, tier: FightTier): number {
  const a = c.athlete!;
  let chance = 50;
  chance += (effectiveSkill(a) - 60) * 0.6;
  chance += (a.fitness - 60) * 0.25;
  chance -= a.chronicWear * 0.35; // damage catches up in there
  chance -= FIGHT_TIERS[tier].oppEdge;
  if (c.age > sportDef("mma").declineAge) chance -= (c.age - sportDef("mma").declineAge) * 2;
  return clamp(Math.round(chance), 5, 95);
}

export function takeFight(
  input: Character,
  tier: FightTier,
  spend: (c: Character) => boolean,
): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (a.sport !== "mma" || a.stage !== "pro")
    return fail(input, "You're not a professional fighter.");
  if (a.bannedYears > 0) return fail(input, `You're suspended for ${a.bannedYears} more year(s).`);
  if (a.injury) return fail(input, `You can't fight through ${a.injury.name}. Heal first.`);
  if (c.crime?.prison) return fail(input, "No sanctioned bouts from a prison cell.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  const t = FIGHT_TIERS[tier];
  const purse = fightPurse(a, tier);
  a.lastFightAge = c.age;

  // Occasionally, an envelope arrives before the fight.
  if (!a.fixOffered && Math.random() < 0.08 && (a.ranking ?? 50) <= 25) {
    a.fixOffered = true;
    a.pendingMoment = {
      id: `fix-${c.age}`,
      title: "A Visitor Before the Fight",
      description:
        "Two men find you at the hotel. Take a dive in the second round, and there's $150,000 in it. They know where you train.",
      stakes: "final",
      options: [
        {
          label: "Refuse and report it to the commission",
          text: "Investigators moved fast. The bettors were arrested; the division respects you more for it.",
          tone: "good",
          performance: 0,
          reportFix: true,
        },
        {
          label: "Refuse quietly",
          text: "You said nothing and fought your fight. They didn't return.",
          tone: "neutral",
          performance: 0,
        },
        {
          label: "Take the money and the dive",
          text: "You went down in the second. The money cleared. Somewhere, a betting pattern was flagged.",
          tone: "bad",
          performance: -100,
          corrupt: true,
          banRisk: true,
        },
        {
          label: "Pretend to accept, then expose them mid-scheme",
          text: "You wore a wire. The sting made national news — hero status, dangerous enemies.",
          tone: "good",
          performance: 0,
          reportFix: true,
        },
      ],
    };
    const msg = "Something happened before the fight — a decision is waiting in the Athlete tab.";
    c.log.push({ age: c.age, text: msg, tone: "neutral" });
    return { character: c, message: msg, tone: "neutral", ok: true };
  }

  const chance = fightWinChance(c, tier);
  const won = randInt(1, 100) <= chance;
  const finished = Math.random() < 0.45; // KO/submission vs decision
  // Every fight leaves a mark. Wars leave more.
  const wear = randInt(2, 4) + (tier === "risky" ? 2 : 0) + (!won && finished ? randInt(3, 6) : 0);
  a.chronicWear = clamp(a.chronicWear + wear);
  c.money += purse;
  a.careerEarnings += purse;

  if (won) {
    a.fightWins = (a.fightWins ?? 0) + 1;
    if (finished) a.fightKOs = (a.fightKOs ?? 0) + 1;
    a.ranking = Math.max(1, (a.ranking ?? 50) - t.rankJump);
    c.fame += tier === "risky" ? 3 : 1;
    const msg = `You beat ${t.label} ${finished ? "by KO" : "on the scorecards"} — $${purse.toLocaleString()} purse, now ranked #${a.ranking}. (+${wear} permanent wear)`;
    c.log.push({ age: c.age, text: msg, tone: "good" });
    record(a, c.age, `Won vs ${t.label} (#${a.ranking})`, "good");
    return { character: c, message: msg, tone: "good", ok: true };
  }
  a.fightLosses = (a.fightLosses ?? 0) + 1;
  a.ranking = Math.min(50, (a.ranking ?? 50) + (tier === "safe" ? 4 : 2));
  if (finished) c.stats.health = clamp(c.stats.health - randInt(3, 8));
  if (a.beltHolder) {
    a.beltHolder = false;
    c.log.push({ age: c.age, text: "You lost the belt. The division moves on fast.", tone: "bad" });
  }
  const msg = `You lost to ${t.label}${finished ? " by KO — a bad one" : " on points"}. $${purse.toLocaleString()} purse, ranked #${a.ranking}. (+${wear} permanent wear)`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  record(a, c.age, `Lost vs ${t.label} (#${a.ranking})`, "bad");
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function titleShot(input: Character, spend: (c: Character) => boolean): AthleteResult {
  const c = structuredClone(input);
  const a = ensureAthlete(c);
  if (a.sport !== "mma" || a.stage !== "pro")
    return fail(input, "You're not a professional fighter.");
  if (a.beltHolder) return fail(input, "You ARE the champion. Defend it with a risky fight.");
  if ((a.ranking ?? 50) > 3)
    return fail(input, `Title shots go to the top 3 (you're #${a.ranking ?? 50}).`);
  if (a.injury) return fail(input, "Heal up first — this is the biggest night of your life.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const chance = clamp(fightWinChance(c, "risky") + 5, 5, 90);
  const purse = Math.round(fightPurse(a, "risky") * 2.5);
  const wear = randInt(4, 8);
  a.chronicWear = clamp(a.chronicWear + wear);
  c.money += purse;
  a.careerEarnings += purse;
  a.lastFightAge = c.age;
  if (randInt(1, 100) <= chance) {
    a.beltHolder = true;
    a.ranking = 1;
    a.majors += 1;
    a.fightWins = (a.fightWins ?? 0) + 1;
    c.fame += 10;
    const msg = `AND NEW! You won the championship — $${purse.toLocaleString()} purse, the belt, and your name in history. (+${wear} wear)`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    record(a, c.age, "WON THE WORLD TITLE", "milestone");
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  a.fightLosses = (a.fightLosses ?? 0) + 1;
  a.ranking = Math.min(50, (a.ranking ?? 3) + 3);
  c.stats.health = clamp(c.stats.health - randInt(4, 10));
  const msg = `The title fight ended in heartbreak — outclassed on the biggest stage. $${purse.toLocaleString()} softens nothing. (+${wear} wear)`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  record(a, c.age, "Lost the title fight", "bad");
  return { character: c, message: msg, tone: "bad", ok: true };
}

/** Yearly progression for fighters: no season sim — aging, rust, and the toll. */
function mmaYear(c: Character, a: AthleteState, log: LogEntry[]) {
  const def = sportDef("mma");
  // Ring rust: rankings decay if you don't fight.
  if (a.lastFightAge === undefined || c.age - a.lastFightAge >= 2) {
    if (a.beltHolder) {
      a.beltHolder = false;
      log.push({
        age: c.age,
        text: "Stripped of the belt for inactivity. The division waits for no one.",
        tone: "bad",
      });
    }
    a.ranking = Math.min(50, (a.ranking ?? 50) + 3);
    log.push({
      age: c.age,
      text: `Ring rust: a year without fighting dropped you to #${a.ranking}.`,
      tone: "neutral",
    });
  }
  // Champions who fought this year log a defense.
  if (a.beltHolder && a.lastFightAge === c.age) {
    a.beltDefenses = (a.beltDefenses ?? 0) + 1;
  }
  // The wear talks louder every year.
  if (a.chronicWear >= 60 && Math.random() < 0.3) {
    c.stats.health = clamp(c.stats.health - randInt(2, 6));
    log.push({
      age: c.age,
      text: "Headaches. Stiff hands in the morning. The fights are still in you.",
      tone: "bad",
    });
  }
  if (c.age >= def.retirementAge - 2 && a.stage === "pro") {
    log.push({
      age: c.age,
      text: "Cornermen and doctors keep using the word 'retirement' around you.",
      tone: "neutral",
    });
  }
}
