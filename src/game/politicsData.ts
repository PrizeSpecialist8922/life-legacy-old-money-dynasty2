import type { PartyLean, PoliticalDomain, PoliticalIssue } from "./types";

// ---------------------------------------------------------------------------
// Politics data — country-specific office ladders, real political parties,
// the ideology spectrum, campaign event pool, debate questions and national
// crisis definitions. Pure data; all logic lives in politics.ts.
// ---------------------------------------------------------------------------

// ---------- Offices ----------

export type OfficeSelection = "election" | "appointment" | "leadership";

export interface OfficeDef {
  id: string;
  name: string;
  level: number; // rung on the country's ladder (0 = lowest)
  optional?: boolean; // e.g. School Board
  termYears: number;
  salary: number;
  minAge: number;
  executive: boolean; // governs (cabinet, crises) vs legislates
  selection: OfficeSelection;
  hasPrimary?: boolean; // party primary before the general election
  minExperience: number; // political XP normally required
  skipExperience: number; // XP required to *skip* straight to this office
  requiresParty?: boolean; // appointments & leadership races need a party
  baseOpponent: number; // typical opponent strength 0-100
}

function ladder(
  entries: Array<
    [
      string,
      string,
      {
        term: number;
        salary: number;
        minAge?: number;
        exec?: boolean;
        sel?: OfficeSelection;
        primary?: boolean;
        optional?: boolean;
        party?: boolean;
        opp?: number;
      },
    ]
  >,
): OfficeDef[] {
  return entries.map(([id, name, o], i) => ({
    id,
    name,
    level: i,
    optional: o.optional,
    termYears: o.term,
    salary: o.salary,
    minAge: o.minAge ?? 18,
    executive: o.exec ?? false,
    selection: o.sel ?? "election",
    hasPrimary: o.primary ?? false,
    minExperience: i * 22,
    skipExperience: Math.round(i * 22 * 2.4),
    requiresParty: o.party ?? (o.sel === "appointment" || o.sel === "leadership"),
    baseOpponent: o.opp ?? 40 + i * 7,
  }));
}

export const POLITICAL_SYSTEMS: Record<string, OfficeDef[]> = {
  "United States": ladder([
    ["us-school-board", "School Board Member", { term: 4, salary: 12000, optional: true, opp: 30 }],
    ["us-city-council", "City Council Member", { term: 4, salary: 48000, primary: true }],
    ["us-mayor", "Mayor", { term: 4, salary: 120000, exec: true, primary: true }],
    ["us-state-leg", "State Legislator", { term: 2, salary: 60000, primary: true }],
    ["us-governor", "Governor", { term: 4, salary: 180000, exec: true, primary: true, minAge: 30 }],
    ["us-house", "U.S. Representative", { term: 2, salary: 174000, primary: true, minAge: 25 }],
    ["us-senate", "U.S. Senator", { term: 6, salary: 174000, primary: true, minAge: 30 }],
    [
      "us-president",
      "President of the United States",
      { term: 4, salary: 400000, exec: true, primary: true, minAge: 35, opp: 92 },
    ],
  ]),
  Canada: ladder([
    [
      "ca-school-board",
      "School Board Trustee",
      { term: 4, salary: 15000, optional: true, opp: 28 },
    ],
    ["ca-councillor", "City Councillor", { term: 4, salary: 65000 }],
    ["ca-mayor", "Mayor", { term: 4, salary: 145000, exec: true }],
    ["ca-mpp", "Member of Provincial Parliament", { term: 4, salary: 116000 }],
    ["ca-premier", "Premier", { term: 4, salary: 208000, exec: true, sel: "leadership" }],
    ["ca-mp", "Member of Parliament", { term: 4, salary: 194000 }],
    ["ca-cabinet", "Cabinet Minister", { term: 4, salary: 287000, sel: "appointment" }],
    [
      "ca-pm",
      "Prime Minister",
      { term: 4, salary: 389000, exec: true, sel: "leadership", opp: 90 },
    ],
  ]),
  "United Kingdom": ladder([
    ["uk-councillor", "Local Councillor", { term: 4, salary: 14000, opp: 30 }],
    ["uk-mayor", "Mayor", { term: 4, salary: 82000, exec: true }],
    ["uk-mp", "Member of Parliament", { term: 5, salary: 91000 }],
    ["uk-cabinet", "Cabinet Minister", { term: 5, salary: 159000, sel: "appointment" }],
    [
      "uk-pm",
      "Prime Minister",
      { term: 5, salary: 172000, exec: true, sel: "leadership", opp: 88 },
    ],
  ]),
  Australia: ladder([
    ["au-councillor", "Local Councillor", { term: 4, salary: 35000, opp: 30 }],
    ["au-mayor", "Mayor", { term: 4, salary: 110000, exec: true }],
    ["au-state-mp", "State MP", { term: 4, salary: 165000 }],
    ["au-premier", "Premier", { term: 4, salary: 340000, exec: true, sel: "leadership" }],
    ["au-federal-mp", "Federal MP", { term: 3, salary: 217000 }],
    ["au-minister", "Cabinet Minister", { term: 3, salary: 330000, sel: "appointment" }],
    [
      "au-pm",
      "Prime Minister",
      { term: 3, salary: 549000, exec: true, sel: "leadership", opp: 88 },
    ],
  ]),
  Germany: ladder([
    ["de-council", "Gemeinderat Member", { term: 5, salary: 18000, opp: 30 }],
    ["de-mayor", "Bürgermeister", { term: 6, salary: 105000, exec: true }],
    ["de-landtag", "Landtag Member", { term: 5, salary: 95000 }],
    [
      "de-mp-president",
      "Minister-President",
      { term: 5, salary: 210000, exec: true, sel: "leadership" },
    ],
    ["de-bundestag", "Bundestag Member", { term: 4, salary: 122000 }],
    ["de-minister", "Federal Minister", { term: 4, salary: 200000, sel: "appointment" }],
    [
      "de-chancellor",
      "Chancellor",
      { term: 4, salary: 250000, exec: true, sel: "leadership", opp: 88 },
    ],
  ]),
  France: ladder([
    ["fr-council", "Conseiller Municipal", { term: 6, salary: 12000, opp: 30 }],
    ["fr-maire", "Maire", { term: 6, salary: 70000, exec: true }],
    ["fr-regional", "Conseiller Régional", { term: 6, salary: 40000 }],
    ["fr-depute", "Député", { term: 5, salary: 87000 }],
    ["fr-minister", "Minister", { term: 5, salary: 126000, sel: "appointment" }],
    [
      "fr-president",
      "President of the Republic",
      { term: 5, salary: 182000, exec: true, primary: true, opp: 90 },
    ],
  ]),
  Japan: ladder([
    ["jp-city-assembly", "City Assembly Member", { term: 4, salary: 60000, opp: 30 }],
    ["jp-mayor", "Mayor", { term: 4, salary: 130000, exec: true }],
    ["jp-pref-assembly", "Prefectural Assembly Member", { term: 4, salary: 100000 }],
    ["jp-governor", "Governor", { term: 4, salary: 180000, exec: true }],
    ["jp-diet", "Member of the Diet", { term: 4, salary: 160000, minAge: 25 }],
    ["jp-minister", "Cabinet Minister", { term: 4, salary: 220000, sel: "appointment" }],
    [
      "jp-pm",
      "Prime Minister",
      { term: 4, salary: 335000, exec: true, sel: "leadership", opp: 88 },
    ],
  ]),
  Brazil: ladder([
    ["br-vereador", "Vereador", { term: 4, salary: 40000, opp: 30 }],
    ["br-prefeito", "Prefeito", { term: 4, salary: 90000, exec: true }],
    ["br-dep-estadual", "Deputado Estadual", { term: 4, salary: 110000 }],
    ["br-governador", "Governador", { term: 4, salary: 130000, exec: true }],
    ["br-dep-federal", "Deputado Federal", { term: 4, salary: 160000 }],
    ["br-senador", "Senador", { term: 8, salary: 160000, minAge: 35 }],
    ["br-presidente", "Presidente", { term: 4, salary: 110000, exec: true, minAge: 35, opp: 90 }],
  ]),
  Nigeria: ladder([
    ["ng-councillor", "LGA Councillor", { term: 3, salary: 20000, opp: 30 }],
    ["ng-lga-chair", "LGA Chairman", { term: 3, salary: 60000, exec: true }],
    ["ng-state-assembly", "State House of Assembly Member", { term: 4, salary: 80000 }],
    ["ng-governor", "Governor", { term: 4, salary: 140000, exec: true, minAge: 35 }],
    ["ng-house", "House of Representatives Member", { term: 4, salary: 120000, minAge: 25 }],
    ["ng-senator", "Senator", { term: 4, salary: 150000, minAge: 35 }],
    ["ng-president", "President", { term: 4, salary: 175000, exec: true, minAge: 35, opp: 90 }],
  ]),
  India: ladder([
    ["in-councillor", "Municipal Councillor", { term: 5, salary: 8000, opp: 30 }],
    ["in-mayor", "Mayor", { term: 5, salary: 25000, exec: true }],
    ["in-mla", "Member of Legislative Assembly", { term: 5, salary: 35000, minAge: 25 }],
    [
      "in-cm",
      "Chief Minister",
      { term: 5, salary: 55000, exec: true, sel: "leadership", minAge: 25 },
    ],
    ["in-mp", "Member of Parliament (Lok Sabha)", { term: 5, salary: 40000, minAge: 25 }],
    ["in-minister", "Cabinet Minister", { term: 5, salary: 60000, sel: "appointment", minAge: 25 }],
    [
      "in-pm",
      "Prime Minister",
      { term: 5, salary: 75000, exec: true, sel: "leadership", minAge: 25, opp: 90 },
    ],
  ]),
};

export function systemFor(country: string): OfficeDef[] {
  return POLITICAL_SYSTEMS[country] ?? POLITICAL_SYSTEMS["United States"];
}

// ---------- Parties ----------

export interface PartyDef {
  id: string;
  name: string;
  lean: PartyLean;
  popularity: number; // 0-100 national baseline
}

export const PARTIES: Record<string, PartyDef[]> = {
  "United States": [
    { id: "us-dem", name: "Democratic Party", lean: "left", popularity: 47 },
    { id: "us-gop", name: "Republican Party", lean: "right", popularity: 47 },
    { id: "us-lib", name: "Libertarian Party", lean: "right", popularity: 8 },
    { id: "us-green", name: "Green Party", lean: "left", popularity: 6 },
  ],
  Canada: [
    { id: "ca-lib", name: "Liberal Party", lean: "centre", popularity: 40 },
    { id: "ca-con", name: "Conservative Party", lean: "right", popularity: 40 },
    { id: "ca-ndp", name: "New Democratic Party", lean: "left", popularity: 22 },
    { id: "ca-green", name: "Green Party", lean: "left", popularity: 7 },
  ],
  "United Kingdom": [
    { id: "uk-lab", name: "Labour Party", lean: "left", popularity: 42 },
    { id: "uk-con", name: "Conservative Party", lean: "right", popularity: 38 },
    { id: "uk-libdem", name: "Liberal Democrats", lean: "centre", popularity: 14 },
    { id: "uk-green", name: "Green Party", lean: "left", popularity: 8 },
    { id: "uk-reform", name: "Reform UK", lean: "right", popularity: 14 },
  ],
  Australia: [
    { id: "au-labor", name: "Australian Labor Party", lean: "left", popularity: 42 },
    { id: "au-liberal", name: "Liberal Party", lean: "right", popularity: 40 },
    { id: "au-nationals", name: "National Party", lean: "right", popularity: 10 },
    { id: "au-greens", name: "Australian Greens", lean: "left", popularity: 12 },
  ],
  Germany: [
    { id: "de-spd", name: "SPD", lean: "left", popularity: 28 },
    { id: "de-cdu", name: "CDU/CSU", lean: "right", popularity: 32 },
    { id: "de-greens", name: "Alliance 90/The Greens", lean: "left", popularity: 16 },
    { id: "de-fdp", name: "FDP", lean: "centre", popularity: 8 },
    { id: "de-linke", name: "Die Linke", lean: "left", popularity: 6 },
  ],
  France: [
    { id: "fr-re", name: "Renaissance", lean: "centre", popularity: 26 },
    { id: "fr-lr", name: "Les Républicains", lean: "right", popularity: 16 },
    { id: "fr-ps", name: "Parti Socialiste", lean: "left", popularity: 16 },
    { id: "fr-rn", name: "Rassemblement National", lean: "right", popularity: 26 },
    { id: "fr-lfi", name: "La France Insoumise", lean: "left", popularity: 16 },
  ],
  Japan: [
    { id: "jp-ldp", name: "Liberal Democratic Party", lean: "right", popularity: 40 },
    { id: "jp-cdp", name: "Constitutional Democratic Party", lean: "left", popularity: 24 },
    { id: "jp-komeito", name: "Komeito", lean: "centre", popularity: 10 },
    { id: "jp-ishin", name: "Japan Innovation Party", lean: "right", popularity: 12 },
    { id: "jp-jcp", name: "Japanese Communist Party", lean: "left", popularity: 7 },
  ],
  Brazil: [
    { id: "br-pt", name: "Partido dos Trabalhadores (PT)", lean: "left", popularity: 32 },
    { id: "br-pl", name: "Partido Liberal (PL)", lean: "right", popularity: 32 },
    { id: "br-mdb", name: "MDB", lean: "centre", popularity: 16 },
    { id: "br-psdb", name: "PSDB", lean: "centre", popularity: 10 },
  ],
  Nigeria: [
    { id: "ng-apc", name: "All Progressives Congress (APC)", lean: "right", popularity: 38 },
    { id: "ng-pdp", name: "People's Democratic Party (PDP)", lean: "centre", popularity: 34 },
    { id: "ng-lp", name: "Labour Party", lean: "left", popularity: 22 },
  ],
  India: [
    { id: "in-bjp", name: "Bharatiya Janata Party (BJP)", lean: "right", popularity: 42 },
    { id: "in-inc", name: "Indian National Congress (INC)", lean: "centre", popularity: 28 },
    { id: "in-aap", name: "Aam Aadmi Party (AAP)", lean: "centre", popularity: 12 },
    { id: "in-cpim", name: "CPI(M)", lean: "left", popularity: 6 },
  ],
};

export function partiesFor(country: string): PartyDef[] {
  return PARTIES[country] ?? PARTIES["United States"];
}

// ---------- Ideology spectrum ----------

export interface IssueDef {
  id: PoliticalIssue;
  label: string;
  positions: [string, string, string]; // index 0 = left, 1 = centre, 2 = right
}

export const ISSUES: IssueDef[] = [
  {
    id: "economy",
    label: "Economy & Taxes",
    positions: ["Higher taxes, more services", "Moderate taxes", "Lower taxes, smaller government"],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    positions: ["Public system", "Mixed public-private", "Private system"],
  },
  {
    id: "education",
    label: "Education",
    positions: ["Increase funding", "Maintain funding", "Reduce funding"],
  },
  {
    id: "crime",
    label: "Crime & Justice",
    positions: ["Rehabilitation focus", "Balanced approach", "Tough on crime"],
  },
  { id: "immigration", label: "Immigration", positions: ["Open", "Moderate", "Restrictive"] },
  {
    id: "foreign",
    label: "Foreign Policy",
    positions: ["Isolationist", "Moderate", "Interventionist"],
  },
  {
    id: "environment",
    label: "Environment",
    positions: ["Strong regulation", "Moderate regulation", "Limited regulation"],
  },
];

/** Which position index each party lean is drawn toward, per issue. */
export const LEAN_POSITION: Record<PartyLean, Record<PoliticalIssue, number>> = {
  left: {
    economy: 0,
    healthcare: 0,
    education: 0,
    crime: 0,
    immigration: 0,
    foreign: 0,
    environment: 0,
  },
  centre: {
    economy: 1,
    healthcare: 1,
    education: 1,
    crime: 1,
    immigration: 1,
    foreign: 1,
    environment: 1,
  },
  right: {
    economy: 2,
    healthcare: 2,
    education: 2,
    crime: 2,
    immigration: 2,
    foreign: 2,
    environment: 2,
  },
};

export const DOMAINS: { id: PoliticalDomain; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "education", label: "Education" },
  { id: "healthcare", label: "Healthcare" },
  { id: "crime", label: "Crime & Safety" },
  { id: "environment", label: "Environment" },
  { id: "foreign", label: "Foreign Policy" },
];

// ---------- Campaign events ----------

export interface CampaignChoiceDef {
  label: string;
  text: string;
  poll: [number, number]; // min/max polling swing toward you
  funds?: [number, number]; // funds delta
  trust?: [number, number];
  volunteers?: [number, number];
  corrupt?: boolean;
  risky?: boolean; // 35% chance the swing backfires (negated)
}

export interface CampaignEventDef {
  id: string;
  title: string;
  description: string;
  choices: CampaignChoiceDef[];
}

export const CAMPAIGN_EVENTS: CampaignEventDef[] = [
  {
    id: "tv-interview",
    title: "Prime-Time TV Interview",
    description:
      "A major network invites you on for a one-on-one interview. Millions will be watching.",
    choices: [
      {
        label: "Stick to your core message",
        text: "Disciplined and on-message. Viewers know what you stand for.",
        poll: [1, 3],
        trust: [1, 3],
      },
      {
        label: "Go on the attack against your opponent",
        text: "The clips went viral — but attack politics cuts both ways.",
        poll: [2, 5],
        trust: [-4, -1],
        risky: true,
      },
      {
        label: "Open up about your personal story",
        text: "A human moment. Undecided voters warmed to you.",
        poll: [1, 4],
        trust: [2, 4],
      },
    ],
  },
  {
    id: "town-hall",
    title: "Town Hall Meeting",
    description:
      "A packed community hall. Real voters, unscripted questions, local press in the back row.",
    choices: [
      {
        label: "Answer every question honestly, even the hard ones",
        text: "Some answers cost you, but the room respected the honesty.",
        poll: [1, 3],
        trust: [3, 5],
      },
      {
        label: "Pivot every answer back to talking points",
        text: "Safe, polished — and a little hollow. Some attendees noticed.",
        poll: [0, 2],
        trust: [-2, 0],
      },
      {
        label: "Make bold promises to the crowd",
        text: "The room loved it. Delivering later is tomorrow's problem.",
        poll: [3, 6],
        trust: [-3, -1],
        risky: true,
      },
    ],
  },
  {
    id: "fundraising-dinner",
    title: "Fundraising Dinner",
    description: "A $500-a-plate dinner with local business leaders and wealthy donors.",
    choices: [
      {
        label: "Work the room all night",
        text: "Cheques flowed. Your war chest grew nicely.",
        poll: [0, 1],
        funds: [25000, 60000],
      },
      {
        label: "Give a big-vision speech, then leave early",
        text: "Inspiring, but you left money on the table.",
        poll: [1, 2],
        funds: [8000, 20000],
      },
      {
        label: "Quietly accept an off-the-books envelope",
        text: "A very generous 'gift' — one that must never surface.",
        poll: [0, 0],
        funds: [80000, 150000],
        corrupt: true,
      },
    ],
  },
  {
    id: "debate-prep",
    title: "Debate Prep Session",
    description: "Your team wants a full day of mock-debate drills before the big night.",
    choices: [
      {
        label: "Grind through the full prep day",
        text: "Exhausting, but you'll walk on stage sharp.",
        poll: [1, 2],
        trust: [0, 1],
      },
      {
        label: "Skim the briefing book and trust your instincts",
        text: "You saved a day of campaigning, but you're winging the debate.",
        poll: [0, 1],
      },
    ],
  },
  {
    id: "university-visit",
    title: "University Campus Visit",
    description: "Students pack the auditorium. Young voters are energised but skeptical.",
    choices: [
      {
        label: "Talk tuition, jobs and housing",
        text: "You spoke to their actual problems. Student volunteers signed up.",
        poll: [1, 3],
        volunteers: [8, 20],
      },
      {
        label: "Dodge the tough policy questions",
        text: "The crowd cooled fast. Students can smell evasion.",
        poll: [-2, 0],
      },
      {
        label: "Promise sweeping student-debt relief",
        text: "Huge cheers — and instant attack ads about the cost.",
        poll: [2, 5],
        trust: [-2, 0],
        risky: true,
      },
    ],
  },
  {
    id: "factory-visit",
    title: "Factory Floor Visit",
    description: "Hard hats, cameras and workers worried about their future.",
    choices: [
      {
        label: "Listen to the workers, then speak",
        text: "You let them talk first. The union took notice.",
        poll: [1, 3],
        trust: [1, 3],
      },
      {
        label: "Deliver a jobs-plan speech",
        text: "Solid coverage on the evening news.",
        poll: [1, 3],
      },
      {
        label: "Stage a photo-op on the machinery",
        text: "The photo looked great — until workers said you'd never touched a machine.",
        poll: [-1, 3],
        risky: true,
      },
    ],
  },
  {
    id: "community-event",
    title: "Community Festival",
    description: "The annual neighbourhood festival — babies to kiss, sausages to grill.",
    choices: [
      {
        label: "Spend the whole day shaking hands",
        text: "Retail politics at its finest. People remember a handshake.",
        poll: [1, 3],
        volunteers: [3, 10],
      },
      { label: "Give a short speech and move on", text: "Efficient, forgettable.", poll: [0, 1] },
    ],
  },
  {
    id: "media-interview",
    title: "Hostile Newspaper Interview",
    description: "The city's biggest paper sends its toughest reporter. The questions are pointed.",
    choices: [
      {
        label: "Stay calm and answer everything",
        text: "A fair, tough piece. You came across as serious.",
        poll: [1, 3],
        trust: [2, 4],
      },
      {
        label: "Cut the interview short",
        text: "The headline: 'Candidate storms out.' Ouch.",
        poll: [-4, -1],
      },
      {
        label: "Charm the reporter off the record",
        text: "A friendlier article than you deserved.",
        poll: [2, 4],
        trust: [-1, 1],
      },
    ],
  },
  {
    id: "policy-announcement",
    title: "Major Policy Announcement",
    description: "Time to unveil the centrepiece policy of your platform.",
    choices: [
      {
        label: "Detailed, fully-costed plan",
        text: "Wonks applauded. Serious voters took you seriously.",
        poll: [1, 3],
        trust: [2, 4],
      },
      {
        label: "Big vision, light on details",
        text: "Great soundbites. Analysts asked where the numbers were.",
        poll: [2, 4],
        trust: [-2, 0],
      },
    ],
  },
  {
    id: "volunteer-rally",
    title: "Volunteer Rally",
    description: "Your ground game needs bodies. A rally could fire up the base.",
    choices: [
      {
        label: "Deliver a barnburner speech",
        text: "The room roared. Sign-up sheets filled fast.",
        poll: [0, 2],
        volunteers: [15, 35],
      },
      {
        label: "Personally thank every volunteer",
        text: "Slower, warmer. These people will knock doors in the rain for you.",
        poll: [0, 1],
        volunteers: [10, 20],
        trust: [1, 3],
      },
    ],
  },
  {
    id: "podcast",
    title: "Long-Form Podcast",
    description: "A three-hour podcast with a huge audience of young men. Anything can happen.",
    choices: [
      {
        label: "Relax and be yourself",
        text: "Clips of you being genuinely funny did numbers online.",
        poll: [1, 4],
        risky: true,
      },
      {
        label: "Treat it like a press conference",
        text: "Stiff. The host visibly lost interest an hour in.",
        poll: [-1, 1],
      },
      {
        label: "Decline the invitation",
        text: "Safe — but your opponent booked the slot instead.",
        poll: [-2, 0],
      },
    ],
  },
  {
    id: "attack-ad",
    title: "Opposition Research Lands",
    description: "Your team dug up something embarrassing (but legal) about your opponent.",
    choices: [
      {
        label: "Run the attack ad",
        text: "Brutal and effective — the race just got ugly.",
        poll: [2, 5],
        trust: [-3, -1],
      },
      {
        label: "Leak it to a journalist instead",
        text: "The story ran with someone else's fingerprints on it.",
        poll: [1, 4],
        trust: [-1, 0],
      },
      {
        label: "Take the high road and shelve it",
        text: "Nothing aired. Your team grumbled; your conscience didn't.",
        poll: [0, 1],
        trust: [2, 4],
      },
    ],
  },
  {
    id: "door-knocking",
    title: "Door-Knocking Blitz",
    description: "A weekend of canvassing. Your volunteers are ready to fan out.",
    choices: [
      {
        label: "Knock doors yourself all weekend",
        text: "Voters were stunned to find the actual candidate on their porch.",
        poll: [1, 3],
        trust: [1, 3],
      },
      {
        label: "Coordinate the volunteers from HQ",
        text: "Efficient targeting. The ground game hums.",
        poll: [1, 2],
        volunteers: [5, 12],
      },
    ],
  },
];

// ---------- Debate questions ----------

export interface DebateQuestionDef {
  issue: PoliticalIssue;
  question: string;
  answers: [string, string, string]; // aligned with position index 0/1/2
}

export const DEBATE_QUESTIONS: DebateQuestionDef[] = [
  {
    issue: "economy",
    question: "The budget is under pressure. How would you handle taxes?",
    answers: [
      "Raise taxes on the wealthy to fund stronger public services.",
      "Keep taxes stable and focus on efficient spending.",
      "Cut taxes across the board to boost growth.",
    ],
  },
  {
    issue: "healthcare",
    question: "Wait times and costs are rising. What is your healthcare plan?",
    answers: [
      "Expand the public system so no one pays out of pocket.",
      "Blend public coverage with private options for choice.",
      "Let private competition drive quality and lower prices.",
    ],
  },
  {
    issue: "education",
    question: "Schools say they are underfunded. What would you do?",
    answers: [
      "Significantly increase education funding and teacher pay.",
      "Maintain funding but demand better results.",
      "Trim budgets and give parents more school choice.",
    ],
  },
  {
    issue: "crime",
    question: "Crime is a top voter concern. What is your approach?",
    answers: [
      "Invest in rehabilitation, prevention and root causes.",
      "Balance enforcement with prevention programs.",
      "More police, tougher sentences, zero tolerance.",
    ],
  },
  {
    issue: "immigration",
    question: "Where do you stand on immigration levels?",
    answers: [
      "Welcome more newcomers — immigration built this country.",
      "Keep levels moderate and tied to housing and jobs.",
      "Reduce intake until services and borders catch up.",
    ],
  },
  {
    issue: "foreign",
    question: "A conflict abroad demands a response. What role should we play?",
    answers: [
      "Stay out of it — focus on problems at home.",
      "Support allies diplomatically without overcommitting.",
      "Lead decisively, with force if necessary.",
    ],
  },
  {
    issue: "environment",
    question: "How aggressively should we regulate emissions?",
    answers: [
      "Strong regulation now — the climate can't wait.",
      "Steady, moderate rules that industry can absorb.",
      "Light-touch rules — innovation, not regulation.",
    ],
  },
];

// ---------- National crises ----------

export interface CrisisDef {
  id: string;
  title: string;
  description: string;
  options: Array<{
    label: string;
    text: string;
    tone: "good" | "bad" | "neutral";
    approval: [number, number];
    trust: [number, number];
    money?: [number, number];
    corrupt?: boolean;
    domains: Partial<Record<PoliticalDomain, [number, number]>>;
  }>;
}

export const CRISES: CrisisDef[] = [
  {
    id: "recession",
    title: "Recession Hits",
    description:
      "The economy has contracted for two straight quarters. Unemployment is climbing and voters are scared.",
    options: [
      {
        label: "Launch a major stimulus package",
        text: "Spending surged and jobs stabilised — the debt hawks are furious.",
        tone: "good",
        approval: [2, 8],
        trust: [0, 3],
        domains: { economy: [6, 14], education: [-3, 0] },
      },
      {
        label: "Impose austerity to protect the budget",
        text: "The books balanced, but the cuts hurt real people.",
        tone: "neutral",
        approval: [-8, -2],
        trust: [1, 3],
        domains: { economy: [-2, 4], healthcare: [-6, -2], education: [-6, -2] },
      },
      {
        label: "Do nothing and hope it passes",
        text: "Markets drifted. Voters read your silence as weakness.",
        tone: "bad",
        approval: [-10, -4],
        trust: [-6, -2],
        domains: { economy: [-10, -4] },
      },
    ],
  },
  {
    id: "pandemic",
    title: "Pandemic Outbreak",
    description:
      "A dangerous new virus is spreading. Hospitals are filling and the public wants direction.",
    options: [
      {
        label: "Act early: restrictions plus health funding",
        text: "Painful weeks, thousands of lives saved. History will be kind.",
        tone: "good",
        approval: [-4, 6],
        trust: [3, 6],
        domains: { healthcare: [8, 16], economy: [-8, -3] },
      },
      {
        label: "Keep the economy open, advise caution",
        text: "Business stayed alive; hospitals paid the price.",
        tone: "neutral",
        approval: [-6, 2],
        trust: [-4, 0],
        domains: { economy: [2, 6], healthcare: [-12, -5] },
      },
      {
        label: "Steer emergency contracts to a friendly firm",
        text: "The supplies arrived late and overpriced — and a cut arrived in your account.",
        tone: "bad",
        approval: [-8, -3],
        trust: [-8, -3],
        money: [120000, 300000],
        corrupt: true,
        domains: { healthcare: [-10, -4] },
      },
    ],
  },
  {
    id: "disaster",
    title: "Natural Disaster",
    description:
      "A catastrophic storm has flattened whole neighbourhoods. Thousands are displaced.",
    options: [
      {
        label: "Mobilise everything — visit the wreckage yourself",
        text: "Boots on the ground, arm around survivors. Leadership at its rawest.",
        tone: "good",
        approval: [4, 10],
        trust: [3, 6],
        domains: { environment: [3, 8], economy: [-4, -1] },
      },
      {
        label: "Coordinate from the capital",
        text: "Competent but distant. Cable news showed the empty podium.",
        tone: "neutral",
        approval: [-3, 2],
        trust: [-2, 1],
        domains: { environment: [0, 4] },
      },
      {
        label: "Skim the relief fund",
        text: "Rebuilding slowed mysteriously. Your accounts did not.",
        tone: "bad",
        approval: [-6, -2],
        trust: [-6, -2],
        money: [150000, 400000],
        corrupt: true,
        domains: { environment: [-8, -3] },
      },
    ],
  },
  {
    id: "war",
    title: "Foreign Conflict Erupts",
    description:
      "A hostile power has attacked an allied nation. Allies are asking what you will do.",
    options: [
      {
        label: "Send military support to the ally",
        text: "Allies rallied; a vocal anti-war movement rallied too.",
        tone: "neutral",
        approval: [-4, 6],
        trust: [0, 4],
        domains: { foreign: [6, 14], economy: [-5, -2] },
      },
      {
        label: "Sanctions and diplomacy only",
        text: "Measured, cautious — hawks call it weakness, doves call it wisdom.",
        tone: "neutral",
        approval: [-2, 4],
        trust: [1, 3],
        domains: { foreign: [2, 8] },
      },
      {
        label: "Declare strict neutrality",
        text: "Allies felt abandoned. Isolationists cheered.",
        tone: "neutral",
        approval: [-6, 2],
        trust: [-3, 1],
        domains: { foreign: [-10, -3], economy: [1, 4] },
      },
    ],
  },
  {
    id: "trade-dispute",
    title: "Trade War Brews",
    description: "A major trading partner slaps tariffs on your exports. Industries are howling.",
    options: [
      {
        label: "Retaliate with counter-tariffs",
        text: "Tough headlines at home; prices crept up at the till.",
        tone: "neutral",
        approval: [1, 6],
        trust: [0, 2],
        domains: { economy: [-6, 2], foreign: [-4, 2] },
      },
      {
        label: "Negotiate quietly behind the scenes",
        text: "Months of talks defused the worst of it.",
        tone: "good",
        approval: [-1, 4],
        trust: [1, 4],
        domains: { economy: [2, 7], foreign: [3, 8] },
      },
      {
        label: "Bail out affected industries",
        text: "Farmers and factories cheered. The treasury groaned.",
        tone: "neutral",
        approval: [2, 6],
        trust: [0, 2],
        domains: { economy: [0, 5], education: [-3, 0] },
      },
    ],
  },
];

// Dilemmas hit ANY officeholder — corruption temptations and threats where
// the player's choice, not chance, creates the scandal exposure.
export const POLITICAL_DILEMMAS: CrisisDef[] = [
  {
    id: "corrupt-donor",
    title: "A Donor Wants a Favor",
    description:
      "Your biggest donor wants a city contract steered to his firm — 'nothing illegal, just a thumb on the scale.' He funded half your last campaign.",
    options: [
      {
        label: "Refuse and return his donations",
        text: "He's furious. Your conscience is spotless and your war chest is lighter.",
        tone: "good",
        approval: [0, 3],
        trust: [3, 6],
        domains: {},
      },
      {
        label: "Give him a fair shot, nothing more",
        text: "He didn't win the contract. He didn't forgive you either.",
        tone: "neutral",
        approval: [0, 2],
        trust: [1, 3],
        domains: {},
      },
      {
        label: "Steer the contract his way",
        text: "The contract landed exactly where he wanted. So did the paper trail.",
        tone: "bad",
        approval: [-2, 0],
        trust: [-3, -1],
        money: [40000, 90000],
        corrupt: true,
        domains: { economy: [-4, -1] },
      },
    ],
  },
  {
    id: "journalist",
    title: "A Journalist Is Digging",
    description:
      "An investigative reporter has been calling your old associates. She's found something embarrassing — not illegal, but ugly.",
    options: [
      {
        label: "Get ahead of it: confess publicly first",
        text: "You owned the story before she could. It stung for a week, then died.",
        tone: "good",
        approval: [-4, 1],
        trust: [4, 8],
        domains: {},
      },
      {
        label: "Stonewall and deny everything",
        text: "The story ran anyway — now with 'refused to comment' attached.",
        tone: "bad",
        approval: [-8, -3],
        trust: [-6, -2],
        domains: {},
      },
      {
        label: "Have her quietly discredited",
        text: "Her editor spiked the piece. Two other reporters just picked up her notes.",
        tone: "bad",
        approval: [0, 0],
        trust: [-2, 0],
        corrupt: true,
        domains: {},
      },
    ],
  },
  {
    id: "backroom",
    title: "Backroom Deal Offered",
    description:
      "Your fiercest opponent proposes a secret pact: you both go easy on each other's weak spots, and split the committee chairs.",
    options: [
      {
        label: "Decline — you'll win in the open",
        text: "No deal. The rivalry stays honest and vicious.",
        tone: "good",
        approval: [0, 2],
        trust: [2, 4],
        domains: {},
      },
      {
        label: "Take the deal",
        text: "Politics is addition. The chairs got split; the knives got sheathed — for now.",
        tone: "neutral",
        approval: [0, 3],
        trust: [-3, -1],
        corrupt: true,
        domains: {},
      },
      {
        label: "Leak the offer to the press",
        text: "Your opponent got roasted for a week. Nobody will offer you a deal again.",
        tone: "neutral",
        approval: [2, 5],
        trust: [-1, 1],
        domains: {},
      },
    ],
  },
  {
    id: "lobbyist",
    title: "Lobbyist With an Envelope",
    description:
      "A lobbyist for an industry you regulate invites you to dinner. Dessert arrives with an envelope: 'consulting fees,' he says, smiling.",
    options: [
      {
        label: "Refuse and report him to the ethics office",
        text: "He was banned from the building. Your reputation for being unbuyable spread.",
        tone: "good",
        approval: [1, 4],
        trust: [4, 7],
        domains: {},
      },
      {
        label: "Refuse politely and keep the relationship",
        text: "No envelope, no enemies. The industry still returns your calls.",
        tone: "neutral",
        approval: [0, 1],
        trust: [1, 2],
        domains: {},
      },
      {
        label: "Take the envelope",
        text: "The money was real. So is the leverage he now holds over you.",
        tone: "bad",
        approval: [0, 0],
        trust: [-2, 0],
        money: [60000, 150000],
        corrupt: true,
        domains: {},
      },
    ],
  },
  {
    id: "budget",
    title: "Budget Crunch",
    description:
      "This year's budget doesn't balance. Something has to give, and every option has a constituency.",
    options: [
      {
        label: "Raise taxes to protect services",
        text: "Services held. Taxpayers grumbled all the way to the polls.",
        tone: "neutral",
        approval: [-5, 0],
        trust: [1, 3],
        domains: { healthcare: [2, 6], education: [2, 6], economy: [-5, -2] },
      },
      {
        label: "Cut spending across the board",
        text: "The books balanced. The waiting lists grew.",
        tone: "neutral",
        approval: [-3, 2],
        trust: [0, 2],
        domains: { economy: [2, 6], healthcare: [-5, -2], education: [-5, -2] },
      },
      {
        label: "Borrow and defer the problem",
        text: "Nobody felt pain this year. Next year's you sends their regards.",
        tone: "neutral",
        approval: [1, 4],
        trust: [-3, -1],
        domains: { economy: [-4, -1] },
      },
    ],
  },
];

export const POLITICIAN_SURNAMES = [
  "Whitfield",
  "Okafor",
  "Tanaka",
  "Müller",
  "Dubois",
  "Silva",
  "Sharma",
  "Novak",
  "Reyes",
  "Campbell",
  "Osei",
  "Kimura",
  "Laurent",
  "Costa",
  "Iyer",
  "Bennett",
  "Nakamura",
  "Fischer",
  "Moreau",
  "Almeida",
  "Kapoor",
  "Sullivan",
  "Adeyemi",
  "Sato",
];

export const FIRST_NAMES_POOL = [
  "Alex",
  "Jordan",
  "Morgan",
  "Casey",
  "Riley",
  "Sam",
  "Taylor",
  "Avery",
  "Elena",
  "Marcus",
  "Priya",
  "Kenji",
  "Amara",
  "Lucas",
  "Sofia",
  "Daniel",
  "Grace",
  "Victor",
  "Naomi",
  "Omar",
  "Isabelle",
  "Felix",
  "Hannah",
  "Diego",
];

export const ADVISOR_ROLES: { id: string; label: string; blurb: string }[] = [
  {
    id: "campaign_manager",
    label: "Campaign Manager",
    blurb: "Boosts every campaign event outcome",
  },
  {
    id: "comms_director",
    label: "Communications Director",
    blurb: "Improves media results and softens gaffes",
  },
  { id: "pollster", label: "Pollster", blurb: "Sharper polling and better debate targeting" },
  { id: "finance_director", label: "Finance Director", blurb: "Raises more at every fundraiser" },
  {
    id: "policy_advisor",
    label: "Policy Advisor",
    blurb: "Helps pass legislation and manage domains",
  },
  {
    id: "chief_of_staff",
    label: "Chief of Staff",
    blurb: "Improves governing and crisis management",
  },
];
