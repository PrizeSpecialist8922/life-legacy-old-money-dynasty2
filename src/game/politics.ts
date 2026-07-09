import {
  ADVISOR_ROLES,
  CAMPAIGN_EVENTS,
  CRISES,
  POLITICAL_DILEMMAS,
  DEBATE_QUESTIONS,
  DOMAINS,
  FIRST_NAMES_POOL,
  ISSUES,
  LEAN_POSITION,
  PARTIES,
  POLITICIAN_SURNAMES,
  partiesFor,
  systemFor,
} from "./politicsData";
import type { CampaignEventDef, OfficeDef, PartyDef } from "./politicsData";
import type {
  AdvisorRole,
  CampaignStage,
  CampaignState,
  Character,
  CrisisOption,
  LogEntry,
  LogTone,
  Minister,
  PendingCrisis,
  PoliticalAdvisor,
  PoliticalDomain,
  PoliticalIssue,
  PoliticsState,
} from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Politics engine (Build 8). Every mutating function follows the existing
// engine convention: clone the character, mutate the clone, return an
// ActionResult-shaped object. Yearly progression happens in advancePolitics,
// which engine.ts calls from ageUp.
// ---------------------------------------------------------------------------

export interface PoliticsResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): PoliticsResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

function pushLog(c: Character, text: string, tone: LogTone) {
  c.log.push({ age: c.age, text, tone });
}

function mark(p: PoliticsState, age: number, text: string) {
  p.timeline.push({ age, text });
  if (p.timeline.length > 200) p.timeline.shift();
}

// ---------- State ----------

export function defaultPolitics(): PoliticsState {
  return {
    approval: 50,
    publicTrust: 50,
    funds: 0,
    prestige: 0,
    experience: 0,
    reputation: 40,
    volunteers: 0,
    partySupport: 0,
    domainApproval: {
      economy: 50,
      education: 50,
      healthcare: 50,
      crime: 50,
      environment: 50,
      foreign: 50,
    },
    advisors: [],
    cabinet: [],
    electionHistory: [],
    timeline: [],
    billsPassed: 0,
    billsFailed: 0,
    scandalRisk: 0,
    corruptActs: 0,
    highestLevelWon: -1,
    fundraisesThisYear: 0,
    mediaThisYear: 0,
  };
}

/** Lazily attach a politics block; keeps pre-Build-8 saves loading cleanly. */
export function ensurePolitics(c: Character): PoliticsState {
  if (!c.politics) c.politics = defaultPolitics();
  const p = c.politics;
  // Backfill fields for saves created mid-development.
  if (!p.domainApproval) p.domainApproval = defaultPolitics().domainApproval;
  if (!p.advisors) p.advisors = [];
  if (!p.cabinet) p.cabinet = [];
  if (!p.electionHistory) p.electionHistory = [];
  if (!p.timeline) p.timeline = [];
  if (p.highestLevelWon === undefined) p.highestLevelWon = -1;
  return p;
}

export function partyOf(c: Character): PartyDef | null {
  const p = c.politics;
  if (!p?.partyId || p.partyId === "independent") return null;
  if (p.partyId === "custom") {
    return {
      id: "custom",
      name: p.customPartyName ?? "Your Party",
      lean: "centre",
      popularity: 10,
    };
  }
  return partiesFor(c.country).find((x) => x.id === p.partyId) ?? null;
}

export function partyName(c: Character): string {
  const p = c.politics;
  if (!p?.partyId) return "No affiliation";
  if (p.partyId === "independent") return "Independent";
  if (p.partyId === "custom") return p.customPartyName ?? "Your Party";
  return partyOf(c)?.name ?? "No affiliation";
}

/** -100 (fully left) .. +100 (fully right) from the 7 issue positions. */
export function ideologyScore(p: PoliticsState): number {
  if (!p.ideology) return 0;
  const vals = ISSUES.map((i) => (p.ideology?.[i.id] ?? 1) - 1);
  return Math.round((vals.reduce((s, v) => s + v, 0) / ISSUES.length) * 100);
}

export function ideologyLabel(score: number): string {
  if (score <= -60) return "Strongly Left";
  if (score <= -20) return "Centre-Left";
  if (score < 20) return "Centrist";
  if (score < 60) return "Centre-Right";
  return "Strongly Right";
}

// ---------- Ideology & parties ----------

export function setIdeology(
  input: Character,
  ideology: Record<PoliticalIssue, number>,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const first = !p.ideology;
  p.ideology = { ...ideology };
  const label = ideologyLabel(ideologyScore(p));
  if (!first) {
    // Flip-flopping on the record erodes trust a little.
    p.publicTrust = clamp(p.publicTrust - 3);
  }
  const msg = first
    ? `You defined your political platform. Voters would call you: ${label}.`
    : `You updated your platform. You now read as: ${label}.`;
  pushLog(c, msg, "neutral");
  if (first) mark(p, c.age, "Defined a political platform");
  return { character: c, message: msg, tone: first ? "good" : "neutral", ok: true };
}

export function joinParty(input: Character, partyId: string): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (p.campaign) return fail(input, "You can't switch parties mid-campaign.");
  const party = partiesFor(c.country).find((x) => x.id === partyId);
  if (!party) return fail(input, "That party doesn't exist here.");
  if (p.partyId === partyId) return fail(input, `You're already a member of the ${party.name}.`);
  const switching = !!p.partyId && p.partyId !== "independent";
  p.partyId = partyId;
  p.customPartyName = undefined;
  p.partySupport = switching ? 15 : 30;
  if (switching) p.publicTrust = clamp(p.publicTrust - 8);
  const msg = switching
    ? `You crossed the floor to the ${party.name}. Old allies feel betrayed; new ones are wary.`
    : `You joined the ${party.name}.`;
  pushLog(c, msg, switching ? "neutral" : "good");
  mark(p, c.age, switching ? `Switched to the ${party.name}` : `Joined the ${party.name}`);
  return { character: c, message: msg, tone: switching ? "neutral" : "good", ok: true };
}

export function goIndependent(input: Character): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (p.campaign) return fail(input, "You can't change affiliation mid-campaign.");
  if (p.partyId === "independent") return fail(input, "You're already an Independent.");
  const had = !!p.partyId;
  p.partyId = "independent";
  p.customPartyName = undefined;
  p.partySupport = 0;
  if (had) p.publicTrust = clamp(p.publicTrust - 4);
  const msg = "You registered as an Independent. No party machine — and no party bosses.";
  pushLog(c, msg, "neutral");
  mark(p, c.age, "Became an Independent");
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export const CREATE_PARTY_REQUIREMENTS = {
  funds: 500000,
  volunteers: 200,
  reputation: 70,
  networking: 60,
};

export function canCreateParty(c: Character): { ok: boolean; reasons: string[] } {
  const p = c.politics ?? defaultPolitics();
  const r = CREATE_PARTY_REQUIREMENTS;
  const reasons: string[] = [];
  if (p.funds < r.funds) reasons.push(`Requires $${r.funds.toLocaleString()} in campaign funds`);
  if (p.volunteers < r.volunteers) reasons.push(`Requires ${r.volunteers}+ volunteers`);
  if (p.reputation < r.reputation) reasons.push(`Requires ${r.reputation}+ public reputation`);
  if ((c.networking ?? 0) < r.networking) reasons.push(`Requires ${r.networking}+ networking`);
  return { ok: reasons.length === 0, reasons };
}

export function createParty(input: Character, name: string): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (p.campaign) return fail(input, "You can't found a party mid-campaign.");
  const check = canCreateParty(c);
  if (!check.ok)
    return fail(input, `Founding a party is a massive undertaking. ${check.reasons.join(". ")}.`);
  const clean = name.trim().slice(0, 40) || "New Movement";
  p.funds -= CREATE_PARTY_REQUIREMENTS.funds;
  p.volunteers = Math.max(0, p.volunteers - 100);
  p.partyId = "custom";
  p.customPartyName = clean;
  p.partySupport = 100; // it's your party
  p.prestige = clamp(p.prestige + 10);
  const msg = `You founded the ${clean}! Organising a national movement drained your war chest, but the party is yours.`;
  pushLog(c, msg, "milestone");
  mark(p, c.age, `Founded the ${clean}`);
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Office eligibility ----------

export interface OfficeListing {
  def: OfficeDef;
  status: "held" | "won-before" | "eligible" | "skip" | "locked";
  reasons: string[];
}

export function officeListings(c: Character): OfficeListing[] {
  const p = c.politics ?? defaultPolitics();
  const system = systemFor(c.country);
  // Leading optional rungs (e.g. School Board) are true entry points: players
  // may start there or skip straight to the first mandatory office.
  let entryCap = 0;
  while (entryCap < system.length - 1 && system[entryCap].optional) entryCap += 1;
  return system.map((def) => {
    const reasons: string[] = [];
    if (p.office?.id === def.id) return { def, status: "held" as const, reasons };
    if (c.age < def.minAge) reasons.push(`Minimum age ${def.minAge}`);
    if (def.requiresParty && (!p.partyId || p.partyId === "independent"))
      reasons.push("Requires party membership");
    if (def.selection === "appointment") {
      if (p.highestLevelWon < def.level - 1) reasons.push("Win the office below it first");
      if (p.partySupport < 70) reasons.push("Requires 70+ party support");
      if (p.approval < 50) reasons.push("Requires 50+ approval");
    }
    const earned = p.highestLevelWon >= def.level - 1 || def.level <= entryCap;
    const canSkip = !earned && p.experience >= def.skipExperience && p.reputation >= 60;
    if (!earned && !canSkip)
      reasons.push(
        `Needs the rung below (or ${def.skipExperience} political XP + 60 reputation to leapfrog)`,
      );
    if (p.campaign) reasons.push("Finish your current campaign first");
    if (p.office && p.office.id !== def.id && def.selection !== "appointment")
      reasons.push("Resign your current office to run for a different one");
    const status = reasons.length
      ? ("locked" as const)
      : !earned
        ? ("skip" as const)
        : p.highestLevelWon >= def.level
          ? ("won-before" as const)
          : ("eligible" as const);
    return { def, status, reasons };
  });
}

function officeById(country: string, id: string): OfficeDef | undefined {
  return systemFor(country).find((o) => o.id === id);
}

// ---------- Campaign creation ----------

function makeOpponent(c: Character, def: OfficeDef, internal: boolean): CampaignState["opponent"] {
  const name = `${randItem(FIRST_NAMES_POOL)} ${randItem(POLITICIAN_SURNAMES)}`;
  const parties = partiesFor(c.country);
  const own = partyOf(c);
  let party: string;
  if (internal) {
    party = own?.name ?? "Independent";
  } else {
    const rivals = parties.filter((x) => x.id !== own?.id);
    party = rivals.length ? randItem(rivals).name : "Independent";
  }
  const strength = clamp(def.baseOpponent + randInt(-8, 8), 15, 96);
  return { name, party, strength };
}

function makeElectorate(): Record<PoliticalIssue, number> {
  const e = {} as Record<PoliticalIssue, number>;
  for (const issue of ISSUES) {
    const roll = Math.random();
    e[issue.id] = roll < 0.34 ? 0 : roll < 0.67 ? 1 : 2;
  }
  return e;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function advisorBonus(p: PoliticsState, role: AdvisorRole): number {
  const a = p.advisors.find((x) => x.role === role);
  if (!a) return 0;
  return (a.competence * 0.6 + a.experience * 0.4) / 100; // 0..1
}

/** How well the player's platform matches this electorate: -1 .. +1. */
export function electorateAlignment(
  p: PoliticsState,
  electorate: Record<PoliticalIssue, number>,
): number {
  if (!p.ideology) return 0;
  let score = 0;
  for (const issue of ISSUES) {
    const d = Math.abs((p.ideology[issue.id] ?? 1) - electorate[issue.id]);
    score += d === 0 ? 1 : d === 1 ? 0 : -1;
  }
  return score / ISSUES.length;
}

function startPolling(
  c: Character,
  p: PoliticsState,
  def: OfficeDef,
  camp: Partial<CampaignState>,
): CampaignState["polling"] {
  const internal = camp.stage !== "general";
  const opp = internal ? camp.primaryOpponent! : camp.opponent!;
  let you = 32;
  you += (c.networking ?? 0) * 0.08;
  you += p.reputation * 0.08;
  you += p.prestige * 0.05;
  if (camp.isIncumbent) you += (p.approval - 50) * 0.25 + 5;
  if (camp.isSkip) you -= 10;
  if (!internal && p.partyId === "independent") you -= 8;
  if (!internal) you += electorateAlignment(p, camp.electorate!) * 6;
  you -= c.criminalRecord * 3;
  you += Math.min(6, c.fame * 0.06); // celebrity candidates start with name recognition
  you += (camp.endorsements?.length ?? 0) * 1.5;
  const oppShare = 26 + opp.strength * 0.22;
  const undecided = clamp(100 - you - oppShare, 8, 45);
  const total = you + oppShare + undecided;
  return {
    you: Math.round((you / total) * 100),
    opponent: Math.round((oppShare / total) * 100),
    undecided: Math.max(
      0,
      100 - Math.round((you / total) * 100) - Math.round((oppShare / total) * 100),
    ),
  };
}

export function launchCampaign(input: Character, officeId: string): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const def = officeById(c.country, officeId);
  if (!def) return fail(input, "Unknown office.");
  if (!p.ideology) return fail(input, "Define your political platform before running for office.");
  if (p.campaign) return fail(input, "You're already running a campaign.");
  if (c.crime?.prison) return fail(input, "You can't campaign from a prison cell.");
  const listing = officeListings(c).find((l) => l.def.id === officeId)!;
  const isIncumbent = p.office?.id === officeId;
  if (!isIncumbent && listing.status === "locked")
    return fail(input, `You can't run for ${def.name} yet: ${listing.reasons.join("; ")}.`);
  if (def.selection === "appointment")
    return fail(input, `${def.name} is appointed, not elected. Seek the appointment instead.`);

  const hasContest =
    (def.hasPrimary || def.selection === "leadership") &&
    !!p.partyId &&
    p.partyId !== "independent" &&
    !isIncumbent;
  const stage: CampaignStage = hasContest
    ? def.selection === "leadership"
      ? "leadership"
      : "primary"
    : "general";

  const endorsements: string[] = [];
  if ((c.networking ?? 0) >= 60) endorsements.push("A former professor publicly endorsed you");
  if ((c.jobYearsAccrued ?? 0) >= 5) endorsements.push("Your former employer backed the campaign");
  if ((c.edu.leadership?.length ?? 0) > 0)
    endorsements.push("Old teammates vouched for your leadership");
  const friends = c.relationships.filter(
    (r) => r.alive && r.type === "friend" && r.relationship >= 70,
  );
  if (friends.length)
    endorsements.push(
      `${friends.length} close friend${friends.length > 1 ? "s" : ""} joined as volunteers`,
    );
  if (c.athlete?.stage === "retired" && (c.athlete.hallOfFame || c.fame >= 30))
    endorsements.push(
      c.athlete.hallOfFame
        ? "Hall-of-Fame name recognition — crowds show up just to meet you"
        : "Your sports career gave you instant name recognition",
    );
  if ((c.jobYearsAccrued ?? 0) >= 5) p.funds += 15000;
  p.volunteers += friends.length * 5;

  const camp: CampaignState = {
    officeId: def.id,
    officeName: def.name,
    stage,
    hasPrimary: hasContest,
    eventsDone: 0,
    eventsTotal: hasContest ? 9 : 8,
    usedEventIds: [],
    polling: { you: 0, opponent: 0, undecided: 0 },
    opponent: makeOpponent(c, def, false),
    primaryOpponent: hasContest ? makeOpponent(c, def, true) : undefined,
    electorate: makeElectorate(),
    debateDone: false,
    adSpend: 0,
    isIncumbent,
    isSkip: listing.status === "skip",
    startAge: c.age,
    endorsements,
  };
  camp.polling = startPolling(c, p, def, camp);
  p.campaign = camp;

  const stageLabel =
    stage === "primary"
      ? "party primary"
      : stage === "leadership"
        ? "party leadership race"
        : "general election";
  const msg = `You launched your campaign for ${def.name}! First hurdle: the ${stageLabel}.${camp.isSkip ? " Running above your experience level — expect a brutal race." : ""}`;
  pushLog(c, msg, "milestone");
  mark(p, c.age, `Launched a campaign for ${def.name}`);
  if (c.criminalRecord > 0)
    pushLog(c, "Your criminal record is already circulating in opposition mailers.", "bad");
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function seekAppointment(input: Character, officeId: string): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const def = officeById(c.country, officeId);
  if (!def || def.selection !== "appointment") return fail(input, "That office isn't appointed.");
  const listing = officeListings(c).find((l) => l.def.id === officeId)!;
  if (listing.status === "locked") return fail(input, `Not yet: ${listing.reasons.join("; ")}.`);
  const chance =
    0.35 + p.partySupport / 200 + p.approval / 300 + advisorBonus(p, "chief_of_staff") * 0.15;
  if (Math.random() > chance) {
    p.partySupport = clamp(p.partySupport - 5);
    const msg = `The leader passed you over for ${def.name} this time. Keep building support inside the party.`;
    pushLog(c, msg, "bad");
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  takeOffice(c, p, def, true);
  const msg = `You were appointed ${def.name}! A seat at the cabinet table at last.`;
  pushLog(c, msg, "milestone");
  mark(p, c.age, `Appointed ${def.name}`);
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Campaign events ----------

/** The next unplayed campaign event, deterministic for stable UI rendering. */
export function nextCampaignEvent(c: Character): CampaignEventDef | null {
  const camp = c.politics?.campaign;
  if (!camp || camp.eventsDone >= camp.eventsTotal) return null;
  const remaining = CAMPAIGN_EVENTS.filter((e) => !camp.usedEventIds.includes(e.id));
  if (!remaining.length) return null;
  // Stable pseudo-random pick keyed on campaign progress.
  const seed = camp.startAge * 31 + camp.eventsDone * 7 + camp.officeId.length;
  return remaining[seed % remaining.length];
}

export function playCampaignEvent(
  input: Character,
  eventId: string,
  choiceIndex: number,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const camp = p.campaign;
  if (!camp) return fail(input, "No active campaign.");
  const ev = CAMPAIGN_EVENTS.find((e) => e.id === eventId);
  const choice = ev?.choices[choiceIndex];
  if (!ev || !choice) return fail(input, "Unknown campaign event.");
  if (camp.usedEventIds.includes(eventId)) return fail(input, "That event already happened.");

  const mgr = advisorBonus(p, "campaign_manager");
  const comms = advisorBonus(p, "comms_director");

  let swing = randInt(choice.poll[0], choice.poll[1]);
  if (swing > 0) swing = Math.round(swing * (1 + mgr * 0.5));
  if (choice.risky && Math.random() < Math.max(0.1, 0.35 - comms * 0.25)) {
    swing = -Math.abs(swing) - randInt(0, 2);
  }
  let text = choice.text;
  if (choice.funds) {
    const fin = advisorBonus(p, "finance_director");
    const amt = Math.round(randInt(choice.funds[0], choice.funds[1]) * (1 + fin * 0.5));
    p.funds += amt;
    text += ` (+$${amt.toLocaleString()} raised)`;
  }
  if (choice.trust)
    p.publicTrust = clamp(p.publicTrust + randInt(choice.trust[0], choice.trust[1]));
  if (choice.volunteers) p.volunteers += randInt(choice.volunteers[0], choice.volunteers[1]);
  if (choice.corrupt) {
    p.corruptActs += 1;
    p.scandalRisk = clamp(p.scandalRisk + randInt(15, 25), 0, 100);
    text += " Your scandal risk just went up.";
  }

  applyPollSwing(camp, swing);
  camp.usedEventIds.push(eventId);
  camp.eventsDone += 1;
  p.experience += 2;

  const tone: LogTone = swing > 0 ? "good" : swing < 0 ? "bad" : "neutral";
  const msg = `${text} ${swing >= 0 ? "+" : ""}${swing} in the polls.`;
  pushLog(c, `${ev.title}: ${msg}`, tone);
  return { character: c, message: msg, tone, ok: true };
}

function applyPollSwing(camp: CampaignState, swing: number) {
  if (swing === 0) return;
  if (swing > 0) {
    const fromUndecided = Math.min(camp.polling.undecided, Math.ceil(swing * 0.6));
    const fromOpp = Math.min(camp.polling.opponent - 5, swing - fromUndecided);
    camp.polling.you += fromUndecided + Math.max(0, fromOpp);
    camp.polling.undecided -= fromUndecided;
    camp.polling.opponent -= Math.max(0, fromOpp);
  } else {
    const loss = Math.min(camp.polling.you - 5, -swing);
    camp.polling.you -= Math.max(0, loss);
    camp.polling.opponent += Math.ceil(Math.max(0, loss) * 0.5);
    camp.polling.undecided += Math.floor(Math.max(0, loss) * 0.5);
  }
  camp.polling.you = Math.max(2, camp.polling.you);
  camp.polling.opponent = Math.max(2, camp.polling.opponent);
  camp.polling.undecided = Math.max(0, 100 - camp.polling.you - camp.polling.opponent);
}

// ---------- Debate ----------

export interface DebateQuestionView {
  issue: PoliticalIssue;
  label: string;
  question: string;
  answers: [string, string, string];
}

export function debateQuestions(c: Character): DebateQuestionView[] {
  const camp = c.politics?.campaign;
  const count = camp ? 5 + ((camp.startAge + camp.officeId.length) % 3) : 6; // 5-7
  return DEBATE_QUESTIONS.slice(0, Math.min(count, DEBATE_QUESTIONS.length)).map((q) => ({
    issue: q.issue,
    label: ISSUES.find((i) => i.id === q.issue)?.label ?? q.issue,
    question: q.question,
    answers: q.answers,
  }));
}

export function resolveDebate(
  input: Character,
  answers: Record<PoliticalIssue, number>,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const camp = p.campaign;
  if (!camp) return fail(input, "No active campaign.");
  if (camp.debateDone) return fail(input, "You've already debated this cycle.");

  const pollster = advisorBonus(p, "pollster");
  const debateClub = c.edu.clubs?.some((x) => x.toLowerCase().includes("debate")) ?? false;
  let score = 0;
  let consistency = 0;
  let appeal = 0;
  const qs = Object.keys(answers) as PoliticalIssue[];
  for (const issue of qs) {
    const ans = answers[issue];
    if (p.ideology && p.ideology[issue] === ans) consistency += 1;
    if (camp.electorate[issue] === ans) appeal += 1;
  }
  const n = Math.max(1, qs.length);
  score += (appeal / n) * 6; // reading the room
  score += (consistency / n) * 4; // staying true to your record
  score += (c.stats.smarts - 50) / 18;
  if (debateClub) score += 2;
  score += pollster * 2;
  score += randInt(-2, 2);
  const swing = clamp(Math.round(score - 4), -8, 10);

  applyPollSwing(camp, swing);
  camp.debateDone = true;
  p.experience += 4;

  let msg: string;
  let tone: LogTone;
  if (swing >= 5) {
    msg = `You dominated the debate! Pundits declared you the clear winner. +${swing} in the polls.`;
    tone = "good";
    p.funds += randInt(10000, 30000);
    p.approval = clamp(p.approval + 3);
  } else if (swing >= 1) {
    msg = `A solid debate performance. +${swing} in the polls.`;
    tone = "good";
  } else if (swing >= -2) {
    msg = `A shaky debate — you survived, barely. ${swing} in the polls.`;
    tone = "neutral";
  } else {
    msg = `The debate was a disaster. Clips of your worst moments are everywhere. ${swing} in the polls.`;
    tone = "bad";
    p.approval = clamp(p.approval - 3);
  }
  if (consistency < n / 2 && p.ideology)
    msg += " Commentators noted you contradicted your own platform.";
  pushLog(c, msg, tone);
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Campaign resources ----------

export function fundraise(
  input: Character,
  spendAction: (c: Character) => boolean,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!spendAction(c)) return fail(input, "No energy left this year. Age up first.");
  const fin = advisorBonus(p, "finance_director");
  const sources: Array<[string, number]> = [
    ["small donors", randInt(4000, 12000) + (c.networking ?? 0) * 80],
    ["wealthy donors", randInt(8000, 30000) + p.prestige * 300],
    ["local businesses", randInt(5000, 20000) + c.businessReputation * 400],
    ["a labour union drive", randInt(6000, 18000) + p.volunteers * 30],
    ["a fundraising dinner", randInt(10000, 25000) + p.reputation * 150],
  ];
  const [src, base] = randItem(sources);
  const amt = Math.round(base * (1 + fin * 0.6) * (0.8 + p.publicTrust / 250));
  p.funds += amt;
  p.fundraisesThisYear += 1;
  const msg = `You raised $${amt.toLocaleString()} from ${src}.`;
  pushLog(c, msg, "good");
  return { character: c, message: msg, tone: "good", ok: true };
}

export function recruitVolunteers(
  input: Character,
  spendAction: (c: Character) => boolean,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!spendAction(c)) return fail(input, "No energy left this year. Age up first.");
  const gained =
    randInt(8, 20) + Math.round((c.networking ?? 0) / 8) + Math.round(p.reputation / 12);
  p.volunteers += gained;
  const msg = `You recruited ${gained} new volunteers. The ground game grows.`;
  pushLog(c, msg, "good");
  return { character: c, message: msg, tone: "good", ok: true };
}

export type MediaKind = "tv" | "press" | "podcast" | "newspaper" | "social";

const MEDIA_LABELS: Record<MediaKind, string> = {
  tv: "television interview",
  press: "press conference",
  podcast: "podcast appearance",
  newspaper: "newspaper interview",
  social: "social media campaign",
};

export function mediaAppearance(
  input: Character,
  kind: MediaKind,
  spendAction: (c: Character) => boolean,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!spendAction(c)) return fail(input, "No energy left this year. Age up first.");
  const comms = advisorBonus(p, "comms_director");
  const quality = (c.stats.smarts + c.stats.looks) / 2 + comms * 25 + randInt(-15, 15);
  const good = quality >= 50;
  const label = MEDIA_LABELS[kind];
  p.mediaThisYear += 1;
  let msg: string;
  let tone: LogTone;
  if (good) {
    const appr = randInt(2, 5);
    p.approval = clamp(p.approval + appr);
    p.publicTrust = clamp(p.publicTrust + randInt(1, 3));
    p.reputation = clamp(p.reputation + randInt(1, 3));
    c.fame += kind === "tv" || kind === "podcast" ? randInt(1, 3) : randInt(0, 1);
    const donations = randInt(2000, 9000);
    p.funds += donations;
    if (p.campaign) applyPollSwing(p.campaign, randInt(1, 3));
    msg = `Your ${label} landed well. +${appr} approval, +$${donations.toLocaleString()} in donations.`;
    tone = "good";
  } else {
    const appr = randInt(1, 4);
    p.approval = clamp(p.approval - appr);
    if (p.campaign) applyPollSwing(p.campaign, -randInt(1, 2));
    msg = `Your ${label} fell flat — an awkward clip is making the rounds. −${appr} approval.`;
    tone = "bad";
  }
  pushLog(c, msg, tone);
  return { character: c, message: msg, tone, ok: true };
}

export function runAds(input: Character, amount: number): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const camp = p.campaign;
  if (!camp) return fail(input, "Ads only matter during a campaign.");
  if (amount <= 0 || p.funds < amount) return fail(input, "Not enough campaign funds.");
  p.funds -= amount;
  camp.adSpend += amount;
  const swing = clamp(Math.round(Math.sqrt(amount / 12000) * 2), 1, 6);
  applyPollSwing(camp, swing);
  const msg = `You blanketed the airwaves with $${amount.toLocaleString()} of advertising. +${swing} in the polls.`;
  pushLog(c, msg, "good");
  return { character: c, message: msg, tone: "good", ok: true };
}

export function donateToCampaign(input: Character, amount: number): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (amount <= 0 || c.money < amount)
    return fail(input, "You don't have that much personal money.");
  c.money -= amount;
  p.funds += amount;
  const msg = `You transferred $${amount.toLocaleString()} of personal money into the campaign.`;
  pushLog(c, msg, "neutral");
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Election day ----------

function candidateScore(c: Character, p: PoliticsState, camp: CampaignState): number {
  let s = 0;
  s += (c.networking ?? 0) * 0.15;
  s += p.reputation * 0.15;
  s += c.stats.smarts * 0.08;
  s += Math.min(20, Math.sqrt(camp.adSpend / 5000));
  s += Math.min(12, p.volunteers / 25);
  s += advisorBonus(p, "campaign_manager") * 10;
  s += camp.debateDone ? 3 : -4;
  s += p.experience * 0.04;
  s -= c.criminalRecord * 4;
  const party = partyOf(c);
  if (camp.stage === "general" && party) s += (party.popularity - 30) * 0.1 + p.partySupport * 0.05;
  return s;
}

export function canHoldVote(c: Character): { ok: boolean; reason?: string } {
  const camp = c.politics?.campaign;
  if (!camp) return { ok: false, reason: "No active campaign" };
  const internal = camp.stage !== "general";
  if (internal) {
    if (camp.eventsDone < 3)
      return { ok: false, reason: `Complete ${3 - camp.eventsDone} more campaign event(s) first` };
    return { ok: true };
  }
  if (camp.eventsDone < camp.eventsTotal)
    return {
      ok: false,
      reason: `Complete ${camp.eventsTotal - camp.eventsDone} more campaign event(s) first`,
    };
  if (!camp.debateDone) return { ok: false, reason: "Take part in the debate first" };
  return { ok: true };
}

export function holdVote(input: Character): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const camp = p.campaign;
  if (!camp) return fail(input, "No active campaign.");
  const gate = canHoldVote(c);
  if (!gate.ok) return fail(input, gate.reason ?? "Not yet.");

  const internal = camp.stage !== "general";
  const opp = internal ? camp.primaryOpponent! : camp.opponent;
  const def = officeById(c.country, camp.officeId)!;

  const meScore = candidateScore(c, p, camp);
  const oppScore = opp.strength * 0.35 + randInt(-4, 4);
  const edge = meScore - oppScore; // typically -30..+30
  const undecidedShare = clamp(50 + edge * 1.6, 8, 92) / 100;
  const finalYou = clamp(
    Math.round(camp.polling.you + camp.polling.undecided * undecidedShare + randInt(-2, 2)),
    2,
    98,
  );
  const finalOpp = 100 - finalYou;
  const won = finalYou > finalOpp;

  p.electionHistory.push({
    age: c.age,
    office: def.name,
    stage: camp.stage,
    result: won ? "won" : "lost",
    share: finalYou,
    opponent: opp.name,
  });

  if (internal) {
    const raceLabel = camp.stage === "leadership" ? "leadership race" : "primary";
    if (won) {
      camp.stage = "general";
      camp.polling = startPolling(c, p, def, camp);
      p.partySupport = clamp(p.partySupport + 15);
      p.experience += 8;
      const msg = `You won the ${raceLabel} ${finalYou}–${finalOpp} against ${opp.name}! On to the general election.`;
      pushLog(c, msg, "milestone");
      mark(p, c.age, `Won the ${def.name} ${raceLabel}`);
      return { character: c, message: msg, tone: "milestone", ok: true };
    }
    p.campaign = undefined;
    p.partySupport = clamp(p.partySupport - 10);
    p.experience += 4;
    const msg = `You lost the ${raceLabel} ${finalYou}–${finalOpp} to ${opp.name}. The party chose someone else.`;
    pushLog(c, msg, "bad");
    mark(p, c.age, `Lost the ${def.name} ${raceLabel}`);
    return { character: c, message: msg, tone: "bad", ok: true };
  }

  p.campaign = undefined;
  if (won) {
    takeOffice(c, p, def, false);
    p.experience += 15 + def.level * 5;
    p.prestige = clamp(p.prestige + 6 + def.level * 3);
    p.reputation = clamp(p.reputation + 4);
    c.politicalInfluence += 5 + def.level * 3;
    c.fame += def.level * 2;
    const msg = `ELECTION NIGHT: You defeated ${opp.name} ${finalYou}–${finalOpp} and won ${def.name}!`;
    pushLog(c, msg, "milestone");
    mark(p, c.age, `Elected ${def.name} (${finalYou}%)`);
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  p.experience += 6;
  p.approval = clamp(p.approval - 4);
  const msg = `ELECTION NIGHT: ${opp.name} defeated you ${finalOpp}–${finalYou}. A bitter night — but campaigns build machines.`;
  pushLog(c, msg, "bad");
  mark(p, c.age, `Lost the ${def.name} election`);
  return { character: c, message: msg, tone: "bad", ok: true };
}

function takeOffice(c: Character, p: PoliticsState, def: OfficeDef, appointed: boolean) {
  const returning = p.office?.id === def.id;
  p.office = {
    id: def.id,
    name: def.name,
    level: def.level,
    termYears: def.termYears,
    yearsServed: 0,
    termsServed: returning ? (p.office?.termsServed ?? 0) + 1 : appointed ? 0 : 0,
    salary: def.salary,
    executive: def.executive,
  };
  if (returning) p.office.termsServed = c.politics?.office?.termsServed ?? 0;
  p.highestLevelWon = Math.max(p.highestLevelWon, def.level);
  if (!returning) p.cabinet = [];
  // The office becomes the day job — integrates with resume & income systems.
  c.job = {
    id: "political-office",
    title: def.name,
    company: "Public Office",
    salary: def.salary,
    performance: 60,
    level: def.level,
    field: "Politics",
    yearsAtLevel: 0,
    yearsAtCompany: 0,
    burnout: 15,
    managerRel: 60,
    coworkerRel: 60,
    bonusPct: 0,
    careerGroup: "political-office",
  };
}

export function resignOffice(input: Character): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!p.office) return fail(input, "You don't hold any office.");
  const name = p.office.name;
  p.office = undefined;
  p.cabinet = [];
  if (c.job?.careerGroup === "political-office") c.job = undefined;
  p.approval = clamp(p.approval - 5);
  const msg = `You resigned as ${name}.`;
  pushLog(c, msg, "neutral");
  mark(p, c.age, `Resigned as ${name}`);
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Governing: policy, bills, cabinet ----------

export type PolicyApproach = "invest" | "reform" | "cut";

export function policyDecision(
  input: Character,
  domain: PoliticalDomain,
  approach: PolicyApproach,
  spendAction: (c: Character) => boolean,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!p.office) return fail(input, "You need to hold office to set policy.");
  if (!spendAction(c)) return fail(input, "No energy left this year. Age up first.");
  const advisor = advisorBonus(p, "policy_advisor");
  const label = DOMAINS.find((d) => d.id === domain)?.label ?? domain;
  const competence = c.stats.smarts * 0.4 + p.experience * 0.2 + advisor * 25 + randInt(-8, 8);
  const magnitude = competence >= 45 ? randInt(4, 9) : randInt(-4, 3);
  const effects: Record<
    PolicyApproach,
    { main: number; side: Partial<Record<PoliticalDomain, number>>; verb: string }
  > = {
    invest: { main: magnitude + 2, side: { economy: -2 }, verb: "poured new funding into" },
    reform: { main: magnitude, side: {}, verb: "pushed structural reforms through" },
    cut: {
      main: -Math.abs(Math.round(magnitude / 2)),
      side: { economy: 3 },
      verb: "cut spending on",
    },
  };
  const e = effects[approach];
  p.domainApproval[domain] = clamp(p.domainApproval[domain] + e.main);
  for (const [d, v] of Object.entries(e.side)) {
    if (d !== domain)
      p.domainApproval[d as PoliticalDomain] = clamp(p.domainApproval[d as PoliticalDomain] + v);
  }
  p.experience += 3;
  recomputeApproval(p);
  const tone: LogTone = e.main >= 0 ? "good" : "bad";
  const msg = `You ${e.verb} ${label}. ${label} approval ${e.main >= 0 ? "+" : ""}${e.main}.`;
  pushLog(c, msg, tone);
  return { character: c, message: msg, tone, ok: true };
}

export type BillTactic = "negotiate" | "compromise" | "coalition";

export function proposeBill(
  input: Character,
  domain: PoliticalDomain,
  tactic: BillTactic,
  spendAction: (c: Character) => boolean,
): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!p.office) return fail(input, "You need to hold office to sponsor legislation.");
  if (!spendAction(c)) return fail(input, "No energy left this year. Age up first.");

  const label = DOMAINS.find((d) => d.id === domain)?.label ?? domain;
  const advisor = advisorBonus(p, "policy_advisor") + advisorBonus(p, "chief_of_staff");
  let support = 30;
  support += p.partySupport * 0.25;
  support += p.approval * 0.2;
  support += (c.networking ?? 0) * 0.15;
  support += advisor * 12;
  support += p.experience * 0.05;
  if (p.partyId === "independent") support -= 12;
  let cost = "";
  if (tactic === "negotiate") support += 8;
  if (tactic === "compromise") support += 18;
  if (tactic === "coalition") {
    support += 28;
    p.partySupport = clamp(p.partySupport - 6);
    cost = " Working across the aisle annoyed your own party.";
  }
  support = clamp(support, 5, 95);
  const roll = randInt(1, 100);

  if (roll <= support) {
    const amended = tactic === "compromise" || roll > support - 15;
    const gain = amended ? randInt(3, 6) : randInt(6, 11);
    p.domainApproval[domain] = clamp(p.domainApproval[domain] + gain);
    p.billsPassed += 1;
    p.experience += 5;
    p.prestige = clamp(p.prestige + 2);
    recomputeApproval(p);
    const msg = amended
      ? `Your ${label} bill passed — heavily amended, but passed. ${label} approval +${gain}.${cost}`
      : `Your ${label} bill passed cleanly! ${label} approval +${gain}.${cost}`;
    pushLog(c, msg, "good");
    mark(p, c.age, `Passed a ${label} bill${amended ? " (amended)" : ""}`);
    return { character: c, message: msg, tone: "good", ok: true };
  }
  p.billsFailed += 1;
  p.experience += 2;
  p.approval = clamp(p.approval - 2);
  const msg = `Your ${label} bill was voted down (${support}% support wasn't enough).${cost}`;
  pushLog(c, msg, "bad");
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function generateMinisterCandidates(portfolio: PoliticalDomain): Minister[] {
  return [0, 1, 2].map(() => ({
    id: uid(),
    name: `${randItem(FIRST_NAMES_POOL)} ${randItem(POLITICIAN_SURNAMES)}`,
    portfolio,
    competence: randInt(35, 95),
    loyalty: randInt(30, 95),
    popularity: randInt(25, 90),
    experience: randInt(20, 95),
  }));
}

export function appointMinister(input: Character, minister: Minister): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (!p.office?.executive) return fail(input, "Only executive offices appoint a cabinet.");
  p.cabinet = p.cabinet.filter((m) => m.portfolio !== minister.portfolio);
  p.cabinet.push(structuredClone(minister));
  const label = DOMAINS.find((d) => d.id === minister.portfolio)?.label ?? minister.portfolio;
  p.experience += 2;
  const msg = `You appointed ${minister.name} as Minister of ${label}.`;
  pushLog(c, msg, "good");
  mark(p, c.age, `Appointed ${minister.name} (${label})`);
  return { character: c, message: msg, tone: "good", ok: true };
}

export function dismissMinister(input: Character, ministerId: string): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const m = p.cabinet.find((x) => x.id === ministerId);
  if (!m) return fail(input, "No such minister.");
  p.cabinet = p.cabinet.filter((x) => x.id !== ministerId);
  const msg = `You dismissed ${m.name} from cabinet.`;
  pushLog(c, msg, "neutral");
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Advisors ----------

export function generateAdvisorCandidates(role: AdvisorRole): PoliticalAdvisor[] {
  return [0, 1, 2].map(() => {
    const competence = randInt(30, 95);
    const experience = randInt(20, 95);
    return {
      id: uid(),
      name: `${randItem(FIRST_NAMES_POOL)} ${randItem(POLITICIAN_SURNAMES)}`,
      role,
      competence,
      loyalty: randInt(35, 95),
      popularity: randInt(25, 90),
      experience,
      salary: 20000 + Math.round((competence + experience) * 400),
    };
  });
}

export function hireAdvisor(input: Character, advisor: PoliticalAdvisor): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  if (p.funds < advisor.salary)
    return fail(
      input,
      `You can't cover ${advisor.name}'s $${advisor.salary.toLocaleString()} salary from campaign funds.`,
    );
  p.funds -= advisor.salary;
  p.advisors = p.advisors.filter((a) => a.role !== advisor.role);
  p.advisors.push(structuredClone(advisor));
  const label = ADVISOR_ROLES.find((r) => r.id === advisor.role)?.label ?? advisor.role;
  const msg = `You hired ${advisor.name} as your ${label} ($${advisor.salary.toLocaleString()}/yr).`;
  pushLog(c, msg, "good");
  mark(p, c.age, `Hired ${advisor.name} as ${label}`);
  return { character: c, message: msg, tone: "good", ok: true };
}

export function fireAdvisor(input: Character, advisorId: string): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const a = p.advisors.find((x) => x.id === advisorId);
  if (!a) return fail(input, "No such advisor.");
  p.advisors = p.advisors.filter((x) => x.id !== advisorId);
  const msg = `You let ${a.name} go.`;
  pushLog(c, msg, "neutral");
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Crises ----------

export function resolveCrisis(input: Character, optionIndex: number): PoliticsResult {
  const c: Character = structuredClone(input);
  const p = ensurePolitics(c);
  const crisis = p.pendingCrisis;
  const opt = crisis?.options[optionIndex];
  if (!crisis || !opt) return fail(input, "No crisis to resolve.");

  const cos = advisorBonus(p, "chief_of_staff");
  const bonus = Math.round(cos * 4 + avgCabinet(p) * 0.04);

  p.approval = clamp(p.approval + opt.approval + (opt.approval > 0 ? bonus : 0));
  p.publicTrust = clamp(p.publicTrust + opt.trust);
  for (const [d, v] of Object.entries(opt.domainEffects)) {
    p.domainApproval[d as PoliticalDomain] = clamp(
      p.domainApproval[d as PoliticalDomain] + (v ?? 0),
    );
  }
  if (opt.money) c.money += opt.money;
  if (opt.corrupt) {
    p.corruptActs += 1;
    p.scandalRisk = clamp(p.scandalRisk + randInt(20, 32), 0, 100);
  }
  p.experience += 4;
  p.pendingCrisis = undefined;
  recomputeApproval(p);
  pushLog(c, `${crisis.title} — ${opt.text}`, opt.tone);
  mark(p, c.age, `Handled: ${crisis.title}`);
  return { character: c, message: opt.text, tone: opt.tone, ok: true };
}

function buildCrisis(pool: typeof CRISES): PendingCrisis {
  const def = randItem(pool);
  const options: CrisisOption[] = def.options.map((o) => ({
    label: o.label,
    text: o.text,
    tone: o.tone,
    approval: randInt(o.approval[0], o.approval[1]),
    trust: randInt(o.trust[0], o.trust[1]),
    money: o.money ? randInt(o.money[0], o.money[1]) : undefined,
    corrupt: o.corrupt,
    domainEffects: Object.fromEntries(
      Object.entries(o.domains).map(([d, r]) => [d, randInt(r![0], r![1])]),
    ) as CrisisOption["domainEffects"],
  }));
  return { id: `${def.id}-${uid()}`, title: def.title, description: def.description, options };
}

// ---------- Yearly progression ----------

function avgCabinet(p: PoliticsState): number {
  if (!p.cabinet.length) return 0;
  return p.cabinet.reduce((s, m) => s + m.competence, 0) / p.cabinet.length;
}

function recomputeApproval(p: PoliticsState) {
  const domains = Object.values(p.domainApproval);
  const domainAvg = domains.reduce((s, v) => s + v, 0) / domains.length;
  p.approval = clamp(Math.round(domainAvg * 0.6 + p.publicTrust * 0.25 + p.approval * 0.15));
}

/**
 * Called once per year from ageUp. Handles office terms, cabinet effects,
 * advisor payroll, scandal exposure and crisis generation.
 */
export function advancePolitics(c: Character, log: LogEntry[]) {
  const p = c.politics;
  if (!p) return;
  ensurePolitics(c);
  p.fundraisesThisYear = 0;
  p.mediaThisYear = 0;

  // Advisor payroll comes out of campaign funds every year.
  for (const a of [...p.advisors]) {
    if (p.funds >= a.salary) {
      p.funds -= a.salary;
    } else {
      p.advisors = p.advisors.filter((x) => x.id !== a.id);
      log.push({
        age: c.age,
        text: `${a.name} quit — the campaign couldn't make payroll.`,
        tone: "bad",
      });
    }
  }

  // Scandal exposure: only ever triggered by the player's own corrupt acts.
  if (p.scandalRisk > 0 && Math.random() < p.scandalRisk / 260) {
    const scandal = randItem([
      "a bribery scheme",
      "an illegal campaign donation",
      "a corruption backchannel",
      "years of tax avoidance",
      "a covered-up affair with a lobbyist",
    ]);
    p.approval = clamp(p.approval - randInt(18, 30));
    p.publicTrust = clamp(p.publicTrust - randInt(20, 35));
    p.reputation = clamp(p.reputation - randInt(10, 20));
    p.scandalRisk = Math.round(p.scandalRisk / 2);
    log.push({
      age: c.age,
      text: `SCANDAL: Journalists exposed ${scandal}. Your approval is in free fall.`,
      tone: "bad",
    });
    mark(p, c.age, "Engulfed in scandal");
    if (Math.random() < 0.35) {
      c.criminalRecord += 1;
      c.money -= Math.min(c.money, randInt(50000, 200000));
      log.push({
        age: c.age,
        text: "Prosecutors filed charges. Legal fees are bleeding you dry.",
        tone: "bad",
      });
    }
    if (p.campaign) applyPollSwing(p.campaign, -randInt(8, 14));
  }

  // Holding office: terms, drift, cabinet, crises.
  if (p.office) {
    p.office.yearsServed += 1;
    p.experience += 6;
    c.politicalInfluence += 1 + p.office.level;

    // Domains drift toward the mean; a competent cabinet counteracts it.
    const cab = avgCabinet(p);
    for (const d of Object.keys(p.domainApproval) as PoliticalDomain[]) {
      const minister = p.cabinet.find((m) => m.portfolio === d);
      const boost = minister ? (minister.competence - 50) / 14 : cab ? (cab - 55) / 25 : 0;
      const drift = (50 - p.domainApproval[d]) * 0.08;
      p.domainApproval[d] = clamp(p.domainApproval[d] + drift + boost + randInt(-3, 3));
    }
    recomputeApproval(p);
    p.reputation = clamp(p.reputation + (p.approval >= 55 ? 1 : p.approval <= 40 ? -2 : 0));

    // National crises land on executives' desks; every officeholder faces
    // political dilemmas (donors, journalists, lobbyists, budget fights).
    if (!p.pendingCrisis) {
      if (p.office.executive && Math.random() < 0.32) {
        p.pendingCrisis = buildCrisis(Math.random() < 0.65 ? CRISES : POLITICAL_DILEMMAS);
        log.push({
          age: c.age,
          text: `CRISIS: ${p.pendingCrisis.title}. The country is waiting for your response.`,
          tone: "bad",
        });
      } else if (!p.office.executive && Math.random() < 0.25) {
        p.pendingCrisis = buildCrisis(POLITICAL_DILEMMAS);
        log.push({
          age: c.age,
          text: `${p.pendingCrisis.title} — a decision is waiting in the Politics hub.`,
          tone: "neutral",
        });
      }
    }

    // Term limits: the final year opens the reelection window.
    if (p.office.yearsServed >= p.office.termYears) {
      if (p.campaign?.officeId === p.office.id) {
        // Reelection campaign in flight — the vote decides at the ballot box.
      } else {
        const name = p.office.name;
        p.office = undefined;
        p.cabinet = [];
        if (c.job?.careerGroup === "political-office") c.job = undefined;
        log.push({
          age: c.age,
          text: `Your term as ${name} ended without a reelection campaign. You left office.`,
          tone: "neutral",
        });
        mark(p, c.age, `Term ended as ${name}`);
      }
    } else if (p.office.yearsServed === p.office.termYears - 1 && !p.campaign) {
      log.push({
        age: c.age,
        text: `Election year: launch your reelection campaign for ${p.office.name} or your term will end.`,
        tone: "neutral",
      });
    }
  } else {
    // Out of office, memories fade gently.
    p.approval = clamp(p.approval + (50 - p.approval) * 0.1);
  }

  // Campaigns that drag on for years bleed momentum.
  if (p.campaign && c.age - p.campaign.startAge >= 2) {
    applyPollSwing(p.campaign, -2);
    log.push({
      age: c.age,
      text: "Your endless campaign is losing steam — voters want an election.",
      tone: "bad",
    });
  }
}

/** True when this character's job is a political office (skip normal job sim). */
export function isPoliticalOffice(c: Character): boolean {
  return c.job?.careerGroup === "political-office";
}
