/* Headless test for the Build 12 crime path. */
import { ageUp, applyToJob, createCharacter, trySpendEnergy } from "../src/game/engine";
import { JOBS } from "../src/game/data";
import {
  CRIME_JOBS,
  commitCrime,
  jobSuccessChance,
  joinSyndicate,
  launderThroughBusiness,
  layLow,
  leaveTheLife,
  prisonAction,
  recruitCrew,
  requestParole,
  resolveCrimeEvent,
  startRacket,
  hireLawyer,
  trialStep,
  trialOptions,
  takePlea,
  turnInformant,
  trialConvictionChance,
  currentPleaOffer,
  startHeist,
  resolveHeist,
} from "../src/game/crime";
import { startBusiness } from "../src/game/business";
import type { Character } from "../src/game/types";

/** Plays a full trial start-to-verdict with safe, legal plays. */
function playTrial(
  c: Character,
  lawyer: "public" | "local" | "specialist" | "elite" | null,
): Character {
  if (lawyer) {
    const h = hireLawyer(c, lawyer);
    if (h.ok) c = h.character;
  }
  let guard = 0;
  while (c.crime?.trial && guard++ < 10) {
    const opts = trialOptions(c);
    const tier = c.crime.trial.lawyer;
    // Use the best legal play the current counsel unlocks.
    const gated = opts.find(
      (o) => !o.corrupt && o.needsLawyer && tier && o.needsLawyer.includes(tier),
    );
    const safe = gated ?? opts.find((o) => !o.needsLawyer && !o.corrupt) ?? opts[0];
    const r2 = trialStep(c, safe.id);
    if (!r2.ok) break;
    c = r2.character;
  }
  return c;
}

let failures = 0;
const check = (cond: boolean, label: string) => {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${label}`);
  }
};
const ageTo = (c: Character, age: number) => {
  while (c.age < age && c.alive) c = ageUp(c).character;
  return c;
};
const fresh = (c: Character) => {
  c.yearActionsUsed = 0;
  return c;
};

console.log("1) Old-save compat");
let c = createCharacter({ name: "Clean", gender: "female", country: "Canada" });
delete (c as Partial<Character>).crime;
let sim = JSON.parse(JSON.stringify(c)) as Character;
for (let i = 0; i < 40; i++) sim = ageUp(sim).character;
check(sim.age === 40 || !sim.alive, "40 years without crime state");
check(!sim.crime, "crime state absent until used");
console.log("  ok");

console.log("2) Petty → syndicate → racket lifecycle");
c = createCharacter({ name: "Rook", gender: "male", country: "United States" });
c = ageTo(c, 20);
c.stats.smarts = 85;
// Grind petty crimes to notoriety 20+
for (let guard = 0; guard < 40 && (c.crime?.notoriety ?? 0) < 22 && c.alive; guard++) {
  c = fresh(c);
  const r = commitCrime(c, "pickpocket", trySpendEnergy);
  check(r.ok, `petty crime executes (${r.message})`);
  c = r.character;
  if (c.crime?.trial) {
    const t = takePlea(c);
    c = t.character;
  }
  while (c.crime?.prison && c.alive) {
    c = ageUp(c).character;
  }
  if ((c.crime?.heat ?? 0) > 50) {
    c = fresh(c);
    const l = layLow(c, trySpendEnergy);
    if (l.ok) c = l.character;
  }
}
check((c.crime?.notoriety ?? 0) >= 20 || c.crime!.timesCaught > 3, "notoriety grinds up");
c.crime!.notoriety = Math.max(c.crime!.notoriety, 25);
c.crime!.heat = 10;
c = fresh(c);
let r = joinSyndicate(c, trySpendEnergy);
check(r.ok, `join syndicate (${r.message})`);
c = r.character;
check(!!c.crime!.syndicate, "syndicate assigned");
c = fresh(c);
r = recruitCrew(c, trySpendEnergy);
check(r.ok, "recruit crew");
c = r.character;
c.crime!.notoriety = 45;
c.crime!.dirtyMoney = 50000;
c = fresh(c);
r = startRacket(c, trySpendEnergy);
check(r.ok, `start racket (${r.message})`);
c = r.character;
check(c.crime!.rackets === 1, "racket registered");
const dirtyBefore = c.crime!.dirtyMoney;
c = ageUp(c).character;
if (c.crime!.pendingEvent) {
  const e = resolveCrimeEvent(c, 0);
  check(e.ok, "crime event resolves");
  c = e.character;
}
if (!c.crime!.trial && !c.crime!.prison)
  check(c.crime!.dirtyMoney > dirtyBefore, "racket pays yearly");
console.log("  ok");

console.log("3) Laundering integration");
c.money = 200000;
if (c.crime!.trial) c = takePlea(c).character;
while (c.crime!.prison && c.alive) c = ageUp(c).character;
r = startBusiness(c, "retail", "Wash & Go");
check(r.ok, "start front business");
c = r.character;
c.businessHub!.businesses[0].revenue = 300000;
c.crime!.dirtyMoney = 60000;
const cleanBefore = c.businessHub!.businesses[0].cash;
r = launderThroughBusiness(c, c.businessHub!.businesses[0].id, 40000);
check(r.ok, `launder (${r.message})`);
c = r.character;
check(c.businessHub!.businesses[0].cash === cleanBefore + 34000, "85% comes out clean");
check(c.crime!.dirtyMoney === 20000, "dirty balance reduced");
console.log("  ok");

console.log("4) Trial paths: conviction → prison → parole");
c = createCharacter({ name: "Con", gender: "female", country: "United Kingdom" });
c = ageTo(c, 25);
c.crime = {
  active: true,
  rank: "soldier",
  syndicate: "Test Family",
  notoriety: 50,
  heat: 30,
  dirtyMoney: 0,
  crew: [],
  rackets: 0,
  crimesCommitted: 5,
  timesCaught: 0,
  totalYearsServed: 0,
  informant: false,
  leftTheLife: false,
};
c.crime.trial = { charge: "Bank Job", severity: 9, evidence: 95, offeredPleaYears: 4 };
c.job = {
  id: "x",
  title: "Analyst",
  company: "TestCorp",
  salary: 50000,
  performance: 50,
  level: 0,
  field: "Finance",
  careerGroup: "Finance",
};
check(trialConvictionChance(c) > 0, "conviction odds computed");
check(currentPleaOffer(c) >= 1, "plea offer computed");
r = hireLawyer(c, "public");
check(r.ok, "public defender is free");
c = r.character;
r = takePlea(c);
check(r.ok, "plea accepted");
c = r.character;
check(!!c.crime!.prison, "sent to prison");
check(!c.job, "fired on conviction");
check(c.criminalRecord === 1, "record incremented");
check(c.crime!.prison!.security === "maximum", "severity 9 → maximum security");
c = fresh(c);
r = prisonAction(c, "study", trySpendEnergy);
check(r.ok, "prison study");
c = r.character;
r = prisonAction(c, "workout", trySpendEnergy);
check(r.ok, "prison workout");
c = r.character;
r = requestParole(c);
check(!r.ok, "parole blocked before half served");
c = ageUp(c).character;
c = ageUp(c).character;
check(c.crime!.prison!.yearsServed === 2, "prison years tick");
// Plea length now tracks evidence (95% = long sentence) — serve to eligibility.
while (c.crime?.prison && c.crime.prison.yearsServed < Math.ceil(c.crime.prison.sentence / 2))
  c = ageUp(c).character;
if (c.crime?.prison) c.crime.prison.behavior = 95;
let paroled = false;
for (let i = 0; i < 10 && c.crime!.prison; i++) {
  const pr = requestParole(c);
  c = pr.character;
  if (!c.crime!.prison) paroled = true;
}
check(paroled || c.crime!.prison!.paroleHearingsFailed > 0, "parole system responds");
while (c.crime?.prison && c.alive) c = ageUp(c).character;
check(!c.crime!.prison, "eventually released");
check(c.crime!.totalYearsServed >= 2, "served years tracked");
console.log("  ok");

console.log("5) Informant path + prison blocks politics/jobs");
c = createCharacter({ name: "Rat", gender: "male", country: "Germany" });
c = ageTo(c, 30);
c.crime = {
  active: true,
  rank: "capo",
  syndicate: "Kessler Ring",
  notoriety: 65,
  heat: 40,
  dirtyMoney: 0,
  crew: [],
  rackets: 2,
  crimesCommitted: 9,
  timesCaught: 1,
  totalYearsServed: 0,
  informant: false,
  leftTheLife: false,
};
c.crime.trial = { charge: "Racketeering", severity: 8, evidence: 90, offeredPleaYears: 4 };
r = turnInformant(c);
check(r.ok, `informing works (${r.message})`);
c = r.character;
check(
  c.crime!.informant && !c.crime!.syndicate && !c.crime!.prison,
  "informant walks, loses family",
);
// Prison guards
c.crime!.prison = {
  facility: "Blackgate Correctional",
  security: "medium",
  sentence: 3,
  yearsServed: 0,
  respect: 30,
  behavior: 50,
  gangAffiliated: false,
  paroleHearingsFailed: 0,
};
c = fresh(c);
const jobTry = applyToJob(c, JOBS[0]);
check(!jobTry.ok, "job applications blocked in prison");
console.log("  ok");

console.log("6) Risk/reward sanity: careful high-smarts criminal wins more");
// "Careful" = high smarts, lays low when hot, only takes 60%+ jobs.
// "Reckless" = low smarts, ignores heat, takes the biggest job available.
const runLife = (careful: boolean) => {
  let ch = createCharacter({
    name: careful ? "Careful" : "Reckless",
    gender: "male",
    country: "United States",
  });
  ch = ageTo(ch, 20);
  ch.stats.smarts = careful ? 90 : 25;
  let grossDirty = 0;
  let prisonYears = 0;
  for (let y = 0; y < 25 && ch.alive; y++) {
    ch = fresh(ch);
    for (let a = 0; a < 3; a++) {
      if (ch.crime?.prison || ch.crime?.trial) break;
      if (careful && (ch.crime?.heat ?? 0) > 40) {
        const l = layLow(ch, trySpendEnergy);
        if (l.ok) ch = l.character;
        continue;
      }
      const eligible = CRIME_JOBS.filter(
        (j) =>
          ch.age >= j.minAge && (ch.crime?.notoriety ?? 0) >= j.minNotoriety && !j.needsSyndicate,
      );
      const pick = careful
        ? eligible.filter((j) => jobSuccessChance(ch, j) >= 60).pop()
        : eligible.pop();
      if (!pick) break;
      const before = ch.crime?.dirtyMoney ?? 0;
      const res = commitCrime(ch, pick.id, trySpendEnergy);
      if (res.ok) {
        ch = res.character;
        grossDirty += Math.max(0, (ch.crime?.dirtyMoney ?? 0) - before);
      }
    }
    if (ch.crime?.trial)
      ch = careful
        ? playTrial(ch, ch.money >= 60000 ? "specialist" : "public")
        : takePlea(ch).character;
    const beforeAge = ch.crime?.prison?.yearsServed ?? 0;
    ch = ageUp(ch).character;
    if ((ch.crime?.prison?.yearsServed ?? 0) > beforeAge) prisonYears++;
    if (ch.crime?.pendingEvent) ch = resolveCrimeEvent(ch, 0).character;
  }
  return { grossDirty, caught: ch.crime?.timesCaught ?? 0, record: ch.criminalRecord, prisonYears };
};
// Average over several lifetimes to beat variance.
const avg = (careful: boolean) => {
  const runs = [0, 1, 2, 3, 4].map(() => runLife(careful));
  return {
    dirty: runs.reduce((s, r) => s + r.grossDirty, 0) / runs.length,
    caught: runs.reduce((s, r) => s + r.caught, 0) / runs.length,
    prison: runs.reduce((s, r) => s + r.prisonYears, 0) / runs.length,
  };
};
const smart = avg(true);
const dumb = avg(false);
console.log(
  `  careful:  $${Math.round(smart.dirty).toLocaleString()} gross dirty, caught ${smart.caught.toFixed(1)}x, ${smart.prison.toFixed(1)} prison yrs (avg of 5 lives)`,
);
console.log(
  `  reckless: $${Math.round(dumb.dirty).toLocaleString()} gross dirty, caught ${dumb.caught.toFixed(1)}x, ${dumb.prison.toFixed(1)} prison yrs (avg of 5 lives)`,
);
check(smart.dirty > 0, "careful criminals actually earn");
check(smart.caught < dumb.caught, "careful play gets caught less than reckless play");
check(smart.prison <= dumb.prison, "careful play serves less time");
console.log("  ok");

console.log("7) Save round-trip mid-everything");
c = createCharacter({ name: "Saver", gender: "female", country: "Japan" });
c = ageTo(c, 22);
c.crime = {
  active: true,
  rank: "associate",
  syndicate: "Red Lantern Triad",
  notoriety: 30,
  heat: 55,
  dirtyMoney: 45000,
  crew: [{ id: "1", name: "Test", role: "driver", skill: 70, loyalty: 60 }],
  rackets: 1,
  crimesCommitted: 4,
  timesCaught: 0,
  totalYearsServed: 0,
  informant: false,
  leftTheLife: false,
};
const restored = JSON.parse(JSON.stringify(c)) as Character;
let ok = true;
let rc: Character = restored;
try {
  for (let i = 0; i < 25; i++) {
    rc = ageUp(rc).character;
    if (rc.crime?.trial) rc = Math.random() < 0.5 ? takePlea(rc).character : playTrial(rc, "local");
    if (rc.crime?.pendingEvent) rc = resolveCrimeEvent(rc, 0).character;
    if (!rc.alive) break;
  }
} catch (e) {
  ok = false;
  console.error(e);
}
check(ok, "25 chaotic years post-round-trip without crash");
console.log("  ok");

console.log("8) Lawyer tiers matter; heists play in steps");
{
  const mkTrial = (): Character => {
    let x = createCharacter({ name: "Docket", gender: "male", country: "United States" });
    x = ageTo(x, 30);
    x.money = 1000000;
    x.crime = {
      active: true,
      notoriety: 30,
      heat: 30,
      dirtyMoney: 0,
      crew: [],
      rackets: 0,
      crimesCommitted: 3,
      timesCaught: 1,
      totalYearsServed: 0,
      informant: false,
      leftTheLife: false,
    };
    x.crime.trial = {
      charge: "Burglary",
      severity: 3,
      evidence: 70,
      offeredPleaYears: 2,
      stage: "interrogation",
      courtLog: [],
    };
    return x;
  };
  let a = mkTrial();
  const noLawyerOdds = trialConvictionChance(a);
  a = hireLawyer(a, "elite").character;
  const eliteOdds = trialConvictionChance(a);
  check(eliteOdds <= noLawyerOdds - 20, `elite firm cuts odds (${noLawyerOdds}% -> ${eliteOdds}%)`);
  const fx = hireLawyer(mkTrial(), "fixer");
  check(!fx.ok, "fixer refuses strangers");
  const runTrials = (tier: "public" | "elite") => {
    let acq = 0;
    for (let i = 0; i < 60; i++) {
      let x = mkTrial();
      x = playTrial(x, tier);
      if (!x.crime?.prison) acq++;
    }
    return acq;
  };
  const pubAcq = runTrials("public");
  const eliteAcq = runTrials("elite");
  console.log(`  acquittals over 60 trials: public defender ${pubAcq}, elite firm ${eliteAcq}`);
  check(eliteAcq > pubAcq, "money buys better verdicts");

  let h = createCharacter({ name: "Heister", gender: "female", country: "United States" });
  h = ageTo(h, 30);
  h.stats.smarts = 85;
  h.crime = {
    active: true,
    rank: "capo",
    syndicate: "Moretti Family",
    notoriety: 70,
    heat: 10,
    dirtyMoney: 0,
    crew: [
      { id: "1", name: "A", role: "driver", skill: 80, loyalty: 70 },
      { id: "2", name: "B", role: "safecracker", skill: 85, loyalty: 75 },
      { id: "3", name: "C", role: "muscle", skill: 70, loyalty: 65 },
    ],
    rackets: 0,
    crimesCommitted: 10,
    timesCaught: 0,
    totalYearsServed: 0,
    informant: false,
    leftTheLife: false,
  };
  h.yearActionsUsed = 0;
  const big = commitCrime(h, "bank", trySpendEnergy);
  check(!big.ok && big.message.includes("heist"), "big jobs demand the heist flow");
  const sh = startHeist(h, "bank", "inside", trySpendEnergy);
  check(sh.ok, `heist starts (${sh.message})`);
  h = sh.character;
  check(!!h.crime!.heist, "heist state pending");
  const rh = resolveHeist(h, 0);
  check(rh.ok, "heist resolves");
  h = rh.character;
  check(!h.crime!.heist, "heist state cleared");
  console.log("  ok");
}

console.log(failures === 0 ? "\nALL CRIME CHECKS PASSED" : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
