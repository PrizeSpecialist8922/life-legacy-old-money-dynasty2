/* Build 13 test: music/acting/influencer lanes + MMA fight-card career. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  actingClass, apologyArc, audition, brandDeal, createContent, practiceMusic,
  releaseMusic, resolveEntEvent, signLabel, startActing, startInfluencing, startMusic, tour,
} from "../src/game/entertainment";
import { chooseSport, takeFight, titleShot, trainSport, turnPro, resolveMoment, fightWinChance } from "../src/game/athlete";
import type { Character } from "../src/game/types";

let failures = 0;
const check = (cond: boolean, label: string) => { if (!cond) { failures++; console.error(`  ✗ ${label}`); } };
const ageTo = (c: Character, age: number) => { while (c.age < age && c.alive) c = ageUp(c).character; return c; };
const fresh = (c: Character) => { c.yearActionsUsed = 0; return c; };

console.log("1) Old-save compat");
let c = createCharacter({ name: "Old", gender: "male", country: "Canada" });
delete (c as Partial<Character>).entertainment;
let sim = JSON.parse(JSON.stringify(c)) as Character;
for (let i = 0; i < 30; i++) sim = ageUp(sim).character;
check(!sim.entertainment, "entertainment absent until used");
console.log("  ok");

console.log("2) Music: garage → signed → charting → tour");
c = createCharacter({ name: "Melody", gender: "female", country: "United States" });
c = ageTo(c, 18); c.stats.smarts = 80;
let r = startMusic(c); check(r.ok, "start music"); c = r.character;
for (let y = 0; y < 12 && c.alive; y++) {
  c = fresh(c);
  const m = c.entertainment!.music!;
  if (m.skill < 70) { const p = practiceMusic(c, trySpendEnergy); if (p.ok) c = p.character; }
  const rel = releaseMusic(c, m.singles >= 2 && y % 3 === 2 ? "album" : "single", trySpendEnergy);
  check(rel.ok, "release executes"); c = rel.character;
  if (c.entertainment!.music!.fans >= 40 && c.entertainment!.music!.label !== "signed") {
    const s2 = signLabel(c); check(s2.ok, "sign label"); c = s2.character;
  }
  if (c.entertainment!.music!.stage >= 2) { const t = tour(c, trySpendEnergy); if (t.ok) c = t.character; }
  c = ageUp(c).character;
  if (c.entertainment?.pendingEvent) c = resolveEntEvent(c, 0).character;
}
const m = c.entertainment!.music!;
console.log(`  music after 12yr: stage ${m.stage}, ${Math.round(m.fans)}k fans, ${m.hits} hits, earned $${Math.round(c.entertainment!.lifetimeEarnings).toLocaleString()}`);
check(m.fans > 0 && c.entertainment!.lifetimeEarnings > 0, "music career generates fans and money");
console.log("  ok");

console.log("3) Acting + agent effect");
c = createCharacter({ name: "Theo", gender: "male", country: "United Kingdom" });
c = ageTo(c, 20); c.stats.looks = 85;
r = startActing(c); check(r.ok, "start acting"); c = r.character;
let booked = 0;
for (let y = 0; y < 15 && c.alive; y++) {
  c = fresh(c);
  const a = c.entertainment!.acting!;
  if (a.craft < 60) { const cl = actingClass(c, trySpendEnergy); if (cl.ok) c = cl.character; }
  const before = c.entertainment!.acting!.credits;
  const au = audition(c, y % 2 ? "bold" : "safe", trySpendEnergy);
  check(au.ok, "audition executes"); c = au.character;
  if (c.entertainment!.acting!.credits > before) booked++;
  c = ageUp(c).character;
  if (c.entertainment?.pendingEvent) c = resolveEntEvent(c, 1).character;
}
console.log(`  acting after 15yr: stage ${c.entertainment!.acting!.stage}, ${booked} bookings, ${c.entertainment!.acting!.nominations} noms, ${c.entertainment!.awards} awards`);
check(booked > 0, "some auditions land");
console.log("  ok");

console.log("4) Influencer: growth, strikes, cancellation, apology arc");
c = createCharacter({ name: "Vlog", gender: "female", country: "Japan" });
c = ageTo(c, 16);
r = startInfluencing(c); check(r.ok, "start influencing"); c = r.character;
for (let y = 0; y < 10 && c.alive && !c.entertainment!.influencer!.cancelled; y++) {
  c = fresh(c);
  const cc = createContent(c, "clickbait", trySpendEnergy); // strike-farming on purpose
  check(cc.ok, "content executes"); c = cc.character;
  if (c.entertainment!.influencer!.followers >= 10000 && !c.entertainment!.influencer!.cancelled) {
    const bd = brandDeal(c, trySpendEnergy); if (bd.ok) c = bd.character;
  }
  c = ageUp(c).character;
  if (c.entertainment?.pendingEvent) c = resolveEntEvent(c, 2).character;
}
const inf = c.entertainment!.influencer!;
console.log(`  influencer: ${inf.followers.toLocaleString()} followers, ${inf.cancelStrikes} strikes, cancelled: ${inf.cancelled}`);
if (inf.cancelled) {
  let redeemed = false;
  for (let i = 0; i < 8 && !redeemed; i++) {
    c = fresh(c);
    const ap = apologyArc(c, trySpendEnergy); c = ap.character;
    if (!c.entertainment!.influencer!.cancelled) redeemed = true;
    c = ageUp(c).character;
  }
  check(redeemed || c.entertainment!.influencer!.cancelled, "apology arc resolves either way");
}
console.log("  ok");

console.log("5) Criminal record blocks brand deals");
c.criminalRecord = 1;
if (c.entertainment!.influencer!.cancelled) c.entertainment!.influencer!.cancelled = false;
c.entertainment!.influencer!.followers = 50000;
c = fresh(c);
r = brandDeal(c, trySpendEnergy);
check(!r.ok && r.message.includes("background"), "convictions poison sponsorships");
console.log("  ok");

console.log("6) MMA: train → pro → fights → title → wear");
c = createCharacter({ name: "Champ", gender: "male", country: "Brazil" });
c = ageTo(c, 14);
r = chooseSport(c, "mma"); check(r.ok, `choose mma (${r.message})`); c = r.character;
c.athlete!.talent = 90;
while (c.athlete!.skill < 55 && c.alive) { c = fresh(c); const t = trainSport(c, trySpendEnergy); if (t.ok) c = t.character; c = ageUp(c).character; }
c = ageTo(c, Math.max(c.age, 18));
r = turnPro(c); check(r.ok, `turn pro (${r.message})`); c = r.character;
check(c.athlete!.ranking !== undefined && c.athlete!.fightWins === 0, "fighter initialised");
let fights = 0; let sawFix = false;
for (let y = 0; y < 14 && c.alive && c.athlete!.stage === "pro"; y++) {
  c = fresh(c);
  for (let a = 0; a < 2; a++) {
    if (c.athlete!.pendingMoment) { sawFix = true; const rm = resolveMoment(c, 0); if (rm.ok) c = rm.character; continue; }
    if (c.athlete!.injury || c.athlete!.bannedYears > 0) break;
    if (!c.athlete!.beltHolder && (c.athlete!.ranking ?? 50) <= 3) {
      const ts = titleShot(c, trySpendEnergy); if (ts.ok) { c = ts.character; fights++; }
    } else {
      const tier = fightWinChance(c, "fair") >= 60 ? "fair" : "safe";
      const tf = takeFight(c, tier, trySpendEnergy); if (tf.ok) { c = tf.character; fights++; }
    }
  }
  c = ageUp(c).character;
}
const ath = c.athlete!;
console.log(`  fighter: ${ath.fightWins}-${ath.fightLosses} (${ath.fightKOs} KO), rank #${ath.ranking}, belt: ${!!ath.beltHolder}, wear ${ath.chronicWear}, earned $${Math.round(ath.careerEarnings).toLocaleString()}, fix event seen: ${sawFix}`);
check(fights > 5, "fights happen");
check(ath.chronicWear > 10, "cumulative damage accrues");
check((ath.fightWins ?? 0) + (ath.fightLosses ?? 0) > 0, "record tracked");
console.log("  ok");

console.log("7) Save round-trip with everything live");
c = createCharacter({ name: "All", gender: "female", country: "Germany" });
c = ageTo(c, 20);
c = startMusic(c).character;
c = startActing(c).character;
c = startInfluencing(c).character;
const restored = JSON.parse(JSON.stringify(c)) as Character;
let ok = true; let rc: Character = restored;
try {
  for (let i = 0; i < 20; i++) {
    rc = ageUp(rc).character;
    if (rc.entertainment?.pendingEvent) rc = resolveEntEvent(rc, 0).character;
    if (!rc.alive) break;
  }
} catch (e) { ok = false; console.error(e); }
check(ok, "20 years post-round-trip");
console.log("  ok");

console.log(failures === 0 ? "\nALL BUILD 13 CHECKS PASSED" : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
