/* Headless test: athlete path across all 5 sports + tennis depth + save compat. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  SPORT_DEFS, chooseSport, joinAcademy, negotiateContract, playCollegeBall,
  resolveMoment, retire, startPostCareer, trainSport, turnPro,
} from "../src/game/athlete";
import { launchCampaign, setIdeology } from "../src/game/politics";
import { ISSUES } from "../src/game/politicsData";
import type { Character, PoliticalIssue, Sport } from "../src/game/types";

let failures = 0;
const check = (cond: boolean, label: string) => { if (!cond) { failures++; console.error(`  ✗ ${label}`); } };
const ageTo = (c: Character, age: number) => { while (c.age < age && c.alive) c = ageUp(c).character; return c; };

console.log("1) Old-save compat");
let c = createCharacter({ name: "Old", gender: "male", country: "Canada" });
delete (c as Partial<Character>).athlete;
let sim = JSON.parse(JSON.stringify(c)) as Character;
for (let i = 0; i < 40; i++) sim = ageUp(sim).character;
check(sim.age === 40 || !sim.alive, "old save ages fine");
check(!sim.athlete, "athlete stays absent");
console.log("  ok");

console.log("2) Tennis: youth → academy → pro → tour → retirement");
c = createCharacter({ name: "Ace", gender: "female", country: "United States" });
c = ageTo(c, 10);
c.money = 300000; c.stats.health = 90;
let r = chooseSport(c, "tennis");
check(r.ok, `choose tennis (${r.message})`); c = r.character;
c.athlete!.talent = 92; // force a prodigy for deterministic depth testing
r = joinAcademy(c); check(r.ok, "join academy"); c = r.character;
// Train hard through youth
while (c.age < 17) {
  c.yearActionsUsed = 0;
  for (let i = 0; i < 3; i++) { const t = trainSport(c, trySpendEnergy); if (t.ok) c = t.character; }
  c = ageUp(c).character;
  if (c.athlete!.pendingMoment) c = resolveMoment(c, 0).character;
}
check(c.athlete!.skill >= 45, `skill developed (${c.athlete!.skill})`);
r = turnPro(c); check(r.ok, `turn pro (${r.message})`); c = r.character;
check(typeof c.athlete!.ranking === "number", "tennis ranking assigned");
const startRank = c.athlete!.ranking!;
let slamSeen = false, fixSeen = false, injurySeen = false;
while (c.age < 36 && c.alive && c.athlete!.stage === "pro") {
  c.yearActionsUsed = 0;
  const t = trainSport(c, trySpendEnergy); if (t.ok) c = t.character;
  c = ageUp(c).character;
  const a = c.athlete!;
  if (a.injury) injurySeen = true;
  if (a.pendingMoment) {
    if (a.pendingMoment.stakes === "slam") slamSeen = true;
    if (a.pendingMoment.id.startsWith("fix")) { fixSeen = true; c = resolveMoment(c, 0).character; } // report it
    else c = resolveMoment(c, 0).character;
  }
}
const a2 = c.athlete!;
check(a2.ranking! < startRank || a2.titles > 0, `career progressed (rank ${startRank}→${a2.ranking}, titles ${a2.titles})`);
check(a2.careerEarnings > 0, "prize money earned");
if (a2.stage === "pro") { r = retire(c); check(r.ok, "manual retirement"); c = r.character; }
check(c.athlete!.stage === "retired", "retired");
r = startPostCareer(c, "commentator");
if (!r.ok && c.job) { c.job = undefined; r = startPostCareer(c, "commentator"); }
check(r.ok, "post-career starts"); c = r.character;
check(c.job?.careerGroup === "sports-post", "commentary job created");
// Fame crossover into politics
c.fame = Math.max(c.fame, 40);
const ideo = {} as Record<PoliticalIssue, number>;
for (const i of ISSUES) ideo[i.id] = 1;
c = setIdeology(c, ideo).character;
const camp = launchCampaign(c, "us-school-board");
check(camp.ok, "retired athlete can run for office");
check(camp.character.politics!.campaign!.endorsements.some((e) => e.includes("name recognition")), "athlete endorsement fires");
console.log(`  ok (slam moment: ${slamSeen}, fix offered: ${fixSeen}, injured: ${injurySeen})`);

console.log("3) Team sports: college → draft → contract → career, all 4 sports");
for (const sport of ["basketball", "soccer", "hockey", "football"] as Sport[]) {
  let t = createCharacter({ name: sport, gender: "male", country: "United States" });
  t = ageTo(t, 14); t.money = 100000; 
  t = chooseSport(t, sport).character;
  t.athlete!.talent = 85;
  while (t.age < 18) {
    t.yearActionsUsed = 0;
    for (let i = 0; i < 3; i++) { const tr = trainSport(t, trySpendEnergy); if (tr.ok) t = tr.character; }
    t = ageUp(t).character;
    if (t.athlete!.pendingMoment) t = resolveMoment(t, 0).character;
  }
  let res = playCollegeBall(t); check(res.ok, `${sport}: college ball (${res.message})`); t = res.character;
  for (let i = 0; i < 2; i++) { t.yearActionsUsed = 0; const tr = trainSport(t, trySpendEnergy); if (tr.ok) t = tr.character; t = ageUp(t).character; if (t.athlete!.pendingMoment) t = resolveMoment(t, 0).character; }
  res = turnPro(t); check(res.ok, `${sport}: drafted (${res.message})`); t = res.character;
  check(!!t.athlete!.team && !!t.athlete!.contract, `${sport}: team + contract`);
  for (let i = 0; i < 6 && t.alive; i++) {
    t = ageUp(t).character;
    if (t.athlete!.pendingMoment) t = resolveMoment(t, 0).character;
    if (t.athlete!.stage === "pro" && !t.athlete!.contract) { const n = negotiateContract(t); if (n.ok) t = n.character; }
  }
  check(t.athlete!.careerEarnings > 0, `${sport}: salary flowed`);
}
console.log("  ok");

console.log("4) Full random lifetimes, all sports, no crashes");
for (let run = 0; run < 10; run++) {
  const sport = SPORT_DEFS[run % 5].id;
  let t = createCharacter({ name: `S${run}`, gender: run % 2 ? "male" : "female", country: "United Kingdom" });
  t = ageTo(t, 9); t.money = 200000;
  t = chooseSport(t, sport).character;
  while (t.alive && t.age < 90) {
    t.yearActionsUsed = 0;
    const tr = trainSport(t, trySpendEnergy); if (tr.ok) t = tr.character;
    if (t.athlete!.stage !== "pro" && t.athlete!.stage !== "retired" && t.age >= 17) {
      const p = turnPro(t); if (p.ok) t = p.character;
      else if (t.age === 18 && SPORT_DEFS.find(s => s.id === sport)!.team) { const cb = playCollegeBall(t); if (cb.ok) t = cb.character; }
    }
    if (t.athlete!.stage === "pro" && !t.athlete!.contract && SPORT_DEFS.find(s => s.id === sport)!.team) { const n = negotiateContract(t); if (n.ok) t = n.character; }
    t = ageUp(t).character;
    if (t.athlete?.pendingMoment) t = resolveMoment(t, Math.floor(Math.random() * t.athlete.pendingMoment.options.length)).character;
    if (t.age % 10 === 0) t = JSON.parse(JSON.stringify(t));
  }
  const st = t.athlete!;
  console.log(`  run ${run} (${sport}): reached ${st.stage}${st.retiredAge ? ` at ${st.retiredAge}` : ""}, skill peak-ish ${st.skill}, titles ${st.titles}, majors ${st.majors}, earnings $${Math.round(st.careerEarnings/1e6)}M, injuries ${st.injuriesCount}${st.bannedYears || st.seasonLog.some(s=>s.summary.includes("Banned")) ? ", BANNED at some point" : ""}`);
}
console.log(failures === 0 ? "\nALL ATHLETE CHECKS PASSED" : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
