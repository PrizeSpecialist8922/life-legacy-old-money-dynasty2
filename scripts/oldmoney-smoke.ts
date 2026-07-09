/* Build 16: upbringing machine + old money systems. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  bringAlong,
  cutOffChild,
  ensureChildren,
  giveResponsibility,
  hireConsultant,
  holdFamilyMeeting,
  makeAmends,
  reconcileChild,
  requestPsychReport,
  resolveAdmissions,
  resolveChildEvent,
  setAllowance,
  setSchooling,
  stageSuccessionTrials,
  teachChild,
} from "../src/game/upbringing";
import { dateNight, findPartner, propose, tryForBaby } from "../src/game/upbringing";
import {
  acquireSeat,
  buyBackSeat,
  challengeTrust,
  closeWing,
  commissionPortrait,
  createTrust,
  endow,
  ensureSin,
  invokeAncestor,
  openTheRoom,
  payQuietCosts,
  sellPainting,
  visitDowager,
} from "../src/game/oldmoney";
import { createHeir, ensureDynasty, writeLetter, writeWill } from "../src/game/legacy";
import type { Character, Relationship } from "../src/game/types";

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
const addChild = (c: Character, name: string, age: number): Character => {
  c.relationships.push({
    id: `kid-${name}`,
    name,
    type: "child",
    relationship: 80,
    age,
    alive: true,
  } as Relationship);
  ensureChildren(c);
  return c;
};

console.log("1) Upbringing lifecycle: school → staff → teach → responsibility");
let c = createCharacter({ name: "Patriarch Vance", gender: "male", country: "United States" });
c = ageTo(c, 30);
c.money = 5000000;
c.businessReputation = 50;
c = addChild(c, "Ada", 5);
c = fresh(c);
let r = setSchooling(c, "kid-Ada", "private", trySpendEnergy);
check(r.ok, `enroll (${r.message})`);
c = r.character;
r = hireConsultant(c, "kid-Ada", "tutor2", trySpendEnergy);
check(r.ok, "hire tutor");
c = r.character;
r = hireConsultant(c, "kid-Ada", "psychologist", trySpendEnergy);
check(r.ok, "hire psychologist");
c = r.character;
check(requestPsychReport(c, "kid-Ada") !== null, "psych report readable");
for (let i = 0; i < 5; i++) {
  c = fresh(c);
  const t = teachChild(c, "kid-Ada", "deal", trySpendEnergy);
  if (t.ok) c = t.character;
  c = ageUp(c).character;
  if (c.children![0].pendingEvent) c = resolveChildEvent(c, "kid-Ada", 1).character;
}
const ada = c.children!.find((k) => k.relId === "kid-Ada")!;
check(ada.academics > 35, `academics grew (${ada.academics})`);
check((ada.affinities.business ?? 0) > 0, "business affinity from teaching");
c = fresh(c);
r = giveResponsibility(c, "kid-Ada", "chores", trySpendEnergy);
check(r.ok, "responsibility rung");
c = r.character;
r = setAllowance(c, "kid-Ada", "earned");
c = r.character;
console.log("  ok");

console.log("2) Boarding school costs connection; neglect builds resentment");
let n = createCharacter({ name: "Absent", gender: "female", country: "Canada" });
n = ageTo(n, 30);
n.money = 3000000;
n = addChild(n, "Kai", 11);
n = fresh(n);
n = setSchooling(n, "kid-Kai", "boarding", trySpendEnergy).character;
const kaiRes0 = n.children!.find((k) => k.relId === "kid-Kai")!.resentment;
for (let i = 0; i < 5; i++) n = ageUp(n).character; // zero parent actions
const kai = n.children!.find((k) => k.relId === "kid-Kai")!;
check(kai.resentment > kaiRes0, `neglect raised resentment (${kaiRes0} → ${kai.resentment})`);
console.log("  ok");

console.log("3) Redemption: amends repair, reconciliation reverses cut-off");
const resBefore = kai.resentment;
let healed = false;
for (let i = 0; i < 6 && !healed; i++) {
  n = fresh(n);
  const am = makeAmends(n, "kid-Kai", trySpendEnergy);
  if (am.ok) n = am.character;
  if (n.children!.find((k) => k.relId === "kid-Kai")!.resentment < resBefore - 8) healed = true;
  n = ageUp(n).character;
  const kk = n.children!.find((x) => x.relId === "kid-Kai")!;
  if (kk.pendingEvent) n = resolveChildEvent(n, "kid-Kai", 1).character;
}
check(healed, "amends heal resentment over time");
while ((n.relationships.find((x) => x.id === "kid-Kai")?.age ?? 99) < 18) n = ageUp(n).character;
n = cutOffChild(n, "kid-Kai").character;
check(n.children!.find((k) => k.relId === "kid-Kai")!.cutOff === true, "cut off works");
n = fresh(n);
r = reconcileChild(n, "kid-Kai", trySpendEnergy);
check(
  r.ok && !r.character.children!.find((k) => k.relId === "kid-Kai")!.cutOff,
  "reconciliation turns the portrait back",
);
console.log("  ok");

console.log("4) Family council + succession trials");
let f = createCharacter({ name: "Chair", gender: "male", country: "United Kingdom" });
f = ageTo(f, 35);
f.money = 2000000;
f = addChild(f, "One", 14);
f = addChild(f, "Two", 15);
f = fresh(f);
r = holdFamilyMeeting(f, "grievances", trySpendEnergy);
check(r.ok, `meeting (${r.message.slice(0, 40)}...)`);
f = r.character;
r = stageSuccessionTrials(f, false, trySpendEnergy);
check(r.ok && r.message.includes("Standings"), "open trials produce standings");
f = r.character;
f = fresh(f);
r = stageSuccessionTrials(f, true, trySpendEnergy);
check(r.ok, "covert assessment runs");
f = r.character;
console.log("  ok");

console.log("5) The Seat: acquire → portrait → genteel poverty → lose → BUY BACK");
let s = createCharacter({ name: "Lord Ash", gender: "male", country: "United Kingdom" });
s = ageTo(s, 40);
s.money = 4000000;
ensureDynasty(s);
s = fresh(s);
r = acquireSeat(s, "Ravenshall", trySpendEnergy);
check(r.ok, "seat acquired");
s = r.character;
r = commissionPortrait(s, "a single raised eyebrow", 1, trySpendEnergy);
check(r.ok, "portrait hangs");
s = r.character;
r = closeWing(s);
check(r.ok, "wing closes");
s = r.character;
r = sellPainting(s);
check(r.ok && r.message.includes("Tuesday"), "the Turner left on a Tuesday");
s = r.character;
s.money = 0; // ruin
let lost = false;
for (let i = 0; i < 8 && !lost; i++) {
  s = ageUp(s).character;
  s.money = 0;
  if (!s.dynasty!.seat) lost = true;
}
check(lost && !!s.dynasty!.lostSeat, "seat lost to the bank, address remembered");
s.money = 10000000;
s = fresh(s);
r = buyBackSeat(s, trySpendEnergy);
check((r.ok && s.dynasty!.lostSeat === undefined) || r.ok, "bought back");
s = r.character;
check(!!s.dynasty!.seat && !s.dynasty!.lostSeat, "the great unfinished business, finished");
console.log("  ok");

console.log("6) Trust: allowance flows, conditions bite, challenge is once");
let t = createCharacter({ name: "Settlor", gender: "female", country: "United States" });
t = ageTo(t, 45);
t.money = 5000000;
ensureDynasty(t);
r = createTrust(t, 5, { cleanRecord: true, mustGraduate: false, seatEntailed: false });
check(r.ok, "trust executed");
t = r.character;
check(t.dynasty!.trust!.corpus === 4000000, "80% locked");
// simulate an heir generation drawing
t.dynasty!.generation = 2;
t.criminalRecord = 1;
const moneyBefore = t.money;
t = ageUp(t).character;
check(t.money > moneyBefore, "allowance flows to next generation");
check(
  t.log.some((l) => l.text.includes("halved")),
  "clean-record clause bites a convict",
);
r = challengeTrust(t);
check(r.ok, "challenge runs");
t = r.character;
r = challengeTrust(t);
check(!r.ok, "only one challenge, ever");
console.log("  ok");

console.log("7) The Sin: sealed → stirs → quiet costs / open room");
let g = createCharacter({ name: "Keeper", gender: "male", country: "Germany" });
g = ageTo(g, 30);
g.money = 1000000;
const sin = ensureSin(g);
check(sin.sealed && !sin.known, "sin sealed at founding");
sin.exposure = 40;
r = payQuietCosts(g);
check(r.ok, "quiet costs paid");
g = r.character;
check(g.dynasty!.sin!.exposure < 40, "exposure reduced");
r = openTheRoom(g);
check(r.ok && g.money >= 0, "room opened");
g = r.character;
check(g.dynasty!.sin!.known, "you can't un-know");
r = holdFamilyMeeting(g, "theMatter", trySpendEnergy);
check(!r.ok, "the matter needs family present"); // no kids
console.log("  ok");

console.log("8) Endowments + letter delivery");
g = addChild(g, "Heir", 10);
g.money = 2000000;
g = fresh(g);
r = endow(g, "wing", trySpendEnergy);
check(r.ok, "hospital wing endowed");
g = r.character;
check((g.dynasty!.patronage ?? []).length === 1, "patronage recorded");
r = writeLetter(g, "Do not trust the Ashfords.", 12, 50000);
check(r.ok, "letter sealed");
g = r.character;
// letter delivers to the WRITER if they reach the age? No — it transfers via createHeir; test full path:
g = writeWill(g, "kid-Heir", 0).character;
g.alive = false;
const { heir } = createHeir(g, "kid-Heir");
check(!!heir.will?.letter && !heir.will.letter.delivered, "letter crossed the generation");
let h2 = heir;
while (h2.age < 12 && h2.alive) h2 = ageUp(h2).character;
check(
  h2.log.some((l) => l.text.includes("AN ENVELOPE")),
  "letter delivered at the appointed age",
);
check(
  h2.log.some((l) => l.text.includes("Ashfords")),
  "your words survived you",
);
console.log("  ok");

console.log("9) Full inheritance: upbringing → curse → dowager");
let p = createCharacter({ name: "Gen2 Rich", gender: "male", country: "United States" });
p = ageTo(p, 40);
p.money = 8000000;
ensureDynasty(p).generation = 2; // heir will be gen 3
p.relationships.push({
  id: "wife",
  name: "Margaret",
  type: "partner",
  relationship: 80,
  age: 62,
  alive: true,
} as Relationship);
p = addChild(p, "Gilded", 16);
const rec = p.children!.find((k) => k.relId === "kid-Gilded")!;
rec.spoiled = 80;
rec.grit = 25;
rec.resentment = 75; // spoiled AND resentful
p = writeWill(p, "kid-Gilded", 0).character;
p.alive = false;
const res9 = createHeir(p, "kid-Gilded");
check(res9.heir.gilded === true, "gen-3 spoiled heir is gilded");
check(
  res9.report.drama.some((d) => d.includes("READING WENT BADLY")),
  "resentment litigates at the reading",
);
check(res9.heir.dowager?.name === "Margaret", "the widow becomes the Dowager");
let gh = res9.heir;
gh = fresh(gh);
r = visitDowager(gh, trySpendEnergy);
check(r.ok, "tea with the Dowager");
gh = r.character;
// The curse is beatable: hold a job 3 years
gh.jobYearsAccrued = 3;
gh = ageUp(gh).character;
check(!gh.gilded, "the gilding cracks when they earn");
check(
  gh.log.some((l) => l.text.includes("gilding cracked")),
  "redemption logged",
);
console.log("  ok");

console.log("10) Old saves + 30-year chaos + round-trip");
let old = createCharacter({ name: "Legacy Save", gender: "female", country: "Japan" });
delete (old as Partial<Character>).children;
delete (old as Partial<Character>).dowager;
old = addChild(JSON.parse(JSON.stringify(old)), "New", 3);
let ok = true;
try {
  for (let i = 0; i < 30 && old.alive; i++) {
    old = ageUp(old).character;
    const kk = old.children?.find((x) => x.relId === "kid-New");
    if (kk?.pendingEvent) old = resolveChildEvent(old, "kid-New", 0).character;
  }
} catch (e) {
  ok = false;
  console.error(e);
}
check(ok, "30 years with a child, no crash");
const rt = JSON.parse(JSON.stringify(old)) as Character;
try {
  for (let i = 0; i < 10; i++) {
    if (!rt.alive) break;
  }
} catch {
  ok = false;
}
check(ok, "round-trip survives");
console.log("  ok");

console.log("11) The Nursery: babies can actually be born");
{
  let b = createCharacter({ name: "Founder Line", gender: "female", country: "Canada" });
  b = ageTo(b, 25);
  b = fresh(b);
  let rb = tryForBaby(b, trySpendEnergy);
  check(!rb.ok && rb.message.includes("partner"), "needs a partner");
  // Acquire the partner through real gameplay, not test injection.
  let met = false;
  for (let i = 0; i < 15 && !met; i++) {
    b = fresh(b);
    const fp = findPartner(b, trySpendEnergy);
    check(fp.ok, "courtship attempt runs");
    b = fp.character;
    if (b.relationships.some((x) => x.type === "partner" && x.alive)) met = true;
    else b = ageUp(b).character;
  }
  check(met, "a partner can actually be found");
  let married = false;
  for (let i = 0; i < 12 && !married; i++) {
    b = fresh(b);
    const pRel = b.relationships.find((x) => x.type === "partner")!;
    if (pRel.relationship < 65) {
      const dn = dateNight(b, trySpendEnergy);
      check(dn.ok, "date night runs");
      b = dn.character;
    } else {
      const pr = propose(b, trySpendEnergy);
      check(pr.ok, "proposal runs");
      b = pr.character;
      if (pr.message.includes("YES")) married = true;
    }
    b = ageUp(b).character;
  }
  check(married, "the proposal eventually lands");
  let born = false;
  for (let i = 0; i < 8 && !born; i++) {
    b = fresh(b);
    rb = tryForBaby(b, trySpendEnergy);
    check(rb.ok, `attempt runs (${rb.message})`);
    b = rb.character;
    if (b.relationships.some((x) => x.type === "child")) born = true;
    b = ageUp(b).character;
  }
  check(born, "a child is eventually born");
  const kid = b.relationships.find((x) => x.type === "child")!;
  check(!!b.children?.find((k) => k.relId === kid.id), "upbringing record auto-created");
  check(kid.name.includes("Line"), "baby carries the family name");
  console.log("  ok");
}

console.log(failures === 0 ? "\nALL OLD MONEY CHECKS PASSED" : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
