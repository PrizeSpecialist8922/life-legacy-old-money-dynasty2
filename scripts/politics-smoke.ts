/* Headless runtime test for the Build 8 politics simulation. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  canHoldVote,
  debateQuestions,
  ensurePolitics,
  fundraise,
  generateAdvisorCandidates,
  generateMinisterCandidates,
  appointMinister,
  hireAdvisor,
  holdVote,
  joinParty,
  launchCampaign,
  mediaAppearance,
  nextCampaignEvent,
  officeListings,
  playCampaignEvent,
  policyDecision,
  proposeBill,
  recruitVolunteers,
  resolveCrisis,
  resolveDebate,
  seekAppointment,
  setIdeology,
} from "../src/game/politics";
import { partiesFor, systemFor, ISSUES } from "../src/game/politicsData";
import type { Character, PoliticalIssue } from "../src/game/types";

let failures = 0;
function check(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function ageTo(c: Character, age: number): Character {
  while (c.age < age && c.alive) c = ageUp(c).character;
  return c;
}

// ---------- 1. Old-save compatibility: a character with no politics field ----------
console.log("1) Old-save compatibility");
let c = createCharacter({ name: "Legacy Save", gender: "male", country: "United States" });
delete (c as Partial<Character>).politics; // simulate a pre-Build-8 save
const roundTrip = JSON.parse(JSON.stringify(c)) as Character;
let sim = roundTrip;
for (let i = 0; i < 25; i++) sim = ageUp(sim).character; // must not throw
check(sim.age === 25, "old save ages to 25 without politics state");
check(sim.politics === undefined, "politics stays absent until first political action");
const listings0 = officeListings(sim);
check(listings0.length === 8, "US ladder has 8 rungs");
console.log("  ok");

// ---------- 2. Full US career: platform → party → primary → general → govern ----------
console.log("2) United States career");
c = createCharacter({ name: "Test Pol", gender: "female", country: "United States" });
c = ageTo(c, 30);
c.stats.smarts = 85;
c.networking = 80;
c.money = 500000;

const ideology = {} as Record<PoliticalIssue, number>;
for (const i of ISSUES) ideology[i.id] = 1;
let r = setIdeology(c, ideology);
check(r.ok, "set ideology");
c = r.character;
r = joinParty(c, partiesFor(c.country)[0].id);
check(r.ok, "join party");
c = r.character;

// Hire an advisor
const advisors = generateAdvisorCandidates("campaign_manager");
ensurePolitics(c).funds = 200000;
r = hireAdvisor(c, advisors[0]);
check(r.ok, "hire campaign manager");
c = r.character;

// City council (level 1) — party primary first
r = launchCampaign(c, "us-city-council");
check(r.ok, `launch city council campaign (${r.message})`);
c = r.character;
check(c.politics!.campaign!.stage === "primary", "US campaign starts at the primary");

// Grind campaign events until primary is allowed
for (let guard = 0; guard < 20 && !canHoldVote(c).ok; guard++) {
  const ev = nextCampaignEvent(c);
  check(!!ev, "campaign event available");
  r = playCampaignEvent(c, ev!.id, 0);
  check(r.ok, `play event ${ev!.id}`);
  c = r.character;
}
r = holdVote(c);
check(r.ok, "primary vote resolves");
c = r.character;

// If we lost the primary, relaunch until we're in a general (bounded retries)
for (
  let retry = 0;
  retry < 8 && !c.politics!.campaign && c.politics!.highestLevelWon < 1;
  retry++
) {
  c.politics!.reputation = 80;
  r = launchCampaign(c, "us-city-council");
  c = r.character;
  for (let guard = 0; guard < 20 && c.politics!.campaign && !canHoldVote(c).ok; guard++) {
    const ev = nextCampaignEvent(c);
    if (ev) {
      r = playCampaignEvent(c, ev.id, 0);
      c = r.character;
    } else break;
  }
  if (c.politics!.campaign) {
    r = holdVote(c);
    c = r.character;
  }
}

if (c.politics!.campaign?.stage === "general") {
  const camp = c.politics!.campaign!;
  check(
    camp.polling.you + camp.polling.opponent + camp.polling.undecided === 100,
    "polling sums to 100",
  );
  // Finish all events
  for (let guard = 0; guard < 30 && camp.eventsDone < camp.eventsTotal; guard++) {
    const ev = nextCampaignEvent(c);
    if (!ev) break;
    r = playCampaignEvent(c, ev.id, Math.min(1, ev.choices.length - 1));
    check(r.ok, `general event ${ev.id}`);
    c = r.character;
  }
  // Debate
  const qs = debateQuestions(c);
  check(qs.length >= 5 && qs.length <= 7, `debate has 5-7 questions (got ${qs.length})`);
  const answers = {} as Record<PoliticalIssue, number>;
  for (const q of qs) answers[q.issue] = c.politics!.campaign!.electorate[q.issue];
  r = resolveDebate(c, answers);
  check(r.ok, "debate resolves");
  c = r.character;
  check(canHoldVote(c).ok, "election unlocked after events + debate");
  r = holdVote(c);
  check(r.ok, "general election resolves");
  c = r.character;
  check(c.politics!.electionHistory.length >= 2, "election history recorded");
}

// Force a win if RNG was cruel, to test governing deterministically
if (!c.politics!.office) {
  console.log("  (RNG lost the election — forcing office for governing tests)");
  c.politics!.highestLevelWon = 1;
  const def = systemFor(c.country).find((o) => o.id === "us-mayor")!;
  c.politics!.office = {
    id: def.id,
    name: def.name,
    level: def.level,
    termYears: def.termYears,
    yearsServed: 0,
    termsServed: 0,
    salary: def.salary,
    executive: true,
  };
  c.job = {
    id: "political-office",
    title: def.name,
    company: "Public Office",
    salary: def.salary,
    performance: 60,
    level: def.level,
    field: "Politics",
    careerGroup: "political-office",
  };
}

// Governing: energy actions
c.yearActionsUsed = 0;
r = policyDecision(c, "education", "invest", trySpendEnergy);
check(r.ok, "policy decision works");
c = r.character;
r = proposeBill(c, "economy", "compromise", trySpendEnergy);
check(r.ok, "bill proposal works");
c = r.character;
r = fundraise(c, trySpendEnergy);
check(r.ok, "fundraise works");
c = r.character;
r = recruitVolunteers(c, trySpendEnergy);
check(!r.ok, "energy pool exhausts after 3 actions");

// Cabinet (mayor is executive in forced path; if elected council, skip)
if (c.politics!.office?.executive) {
  const ms = generateMinisterCandidates("healthcare");
  r = appointMinister(c, ms[0]);
  check(r.ok, "minister appointment works");
  c = r.character;
}

// Yearly progression: salary paid, term advances, crises eventually fire
const moneyBefore = c.money;
const office = c.politics!.office!;
let crisisSeen = false;
for (let i = 0; i < office.termYears - 1 && c.alive; i++) {
  c = ageUp(c).character;
  if (c.politics!.pendingCrisis) {
    crisisSeen = true;
    r = resolveCrisis(c, 0);
    check(r.ok, "crisis resolves");
    c = r.character;
  }
}
check(c.money > moneyBefore, "office salary is paid yearly");
check(!!c.politics!.office, "still in office before final term year");

// Term expiry without reelection → leave office
c = ageUp(c).character;
if (c.politics!.pendingCrisis) c = resolveCrisis(c, 0).character;
check(!c.politics!.office, "term expires without reelection campaign");
check(c.job?.careerGroup !== "political-office", "office job cleared at term end");
console.log(`  ok (crisis fired during term: ${crisisSeen})`);

// ---------- 3. Appointment & leadership systems (Canada) ----------
console.log("3) Canada: appointments & leadership races");
let ca = createCharacter({ name: "Maple Pol", gender: "male", country: "Canada" });
ca = ageTo(ca, 40);
const cIdeo = {} as Record<PoliticalIssue, number>;
for (const i of ISSUES) cIdeo[i.id] = 0;
ca = setIdeology(ca, cIdeo).character;
ca = joinParty(ca, "ca-ndp").character;
const p = ensurePolitics(ca);
p.highestLevelWon = 5; // has been an MP
p.partySupport = 90;
p.approval = 70;
p.experience = 300;
p.reputation = 80;
let appointed = false;
for (let i = 0; i < 12 && !appointed; i++) {
  const res = seekAppointment(ca, "ca-cabinet");
  ca = res.character;
  if (ca.politics!.office?.id === "ca-cabinet") appointed = true;
}
check(appointed, "cabinet appointment achievable with strong party support");
const pmListing = officeListings(ca).find((l) => l.def.id === "ca-pm")!;
check(pmListing.def.selection === "leadership", "PM is a leadership-race office");
console.log("  ok");

// ---------- 4. All ten countries have coherent systems ----------
console.log("4) All countries");
for (const country of [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "Nigeria",
  "India",
]) {
  const sys = systemFor(country);
  const parties = partiesFor(country);
  check(sys.length >= 5, `${country}: ladder has 5+ rungs`);
  check(parties.length >= 3, `${country}: 3+ parties`);
  check(
    sys.some((o) => o.executive),
    `${country}: has an executive office`,
  );
  check(new Set(sys.map((o) => o.id)).size === sys.length, `${country}: office ids unique`);
  const leans = new Set(parties.map((x) => x.lean));
  check(leans.size >= 2, `${country}: parties span the spectrum`);
}
console.log("  ok");

// ---------- 5. Save round-trip mid-campaign ----------
console.log("5) Mid-campaign save round-trip");
let us = createCharacter({ name: "Saver", gender: "female", country: "United Kingdom" });
us = ageTo(us, 28);
us.networking = 70;
const uIdeo = {} as Record<PoliticalIssue, number>;
for (const i of ISSUES) uIdeo[i.id] = 2;
us = setIdeology(us, uIdeo).character;
us = launchCampaign(us, "uk-councillor").character; // independent run, straight to general
check(us.politics!.campaign?.stage === "general", "no-party campaign skips primary");
const restored = JSON.parse(JSON.stringify(us)) as Character;
const ev = nextCampaignEvent(restored);
check(!!ev, "campaign event still available after JSON round-trip");
const after = playCampaignEvent(restored, ev!.id, 0);
check(after.ok, "campaign playable after round-trip");
console.log("  ok");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
