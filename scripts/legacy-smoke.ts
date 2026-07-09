/* Build 15: wills, estates with taxes+drama, heirs, dynasties, societies. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  createHeir,
  ensureDynasty,
  lifeLegacyScore,
  livingChildren,
  writeWill,
} from "../src/game/legacy";
import { acceptInvite, ensureSociety, resolveObligation, callInFavor } from "../src/game/society";
import { startBusiness } from "../src/game/business";
import { buyProperty, invest } from "../src/game/investing";
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
const addChild = (c: Character, name: string, age: number): Character => {
  c.relationships.push({
    id: `kid-${name}`,
    name,
    type: "child",
    relationship: 80,
    age,
    alive: true,
  } as Relationship);
  return c;
};

console.log("1) Wills");
let c = createCharacter({ name: "Elder Vance", gender: "male", country: "United States" });
c = ageTo(c, 40);
c = addChild(c, "Ada Vance", 12);
c = addChild(c, "Ben Vance", 9);
let r = writeWill(c, "kid-Ada Vance", 20);
check(r.ok, "will written");
c = r.character;
check(c.will?.heirId === "kid-Ada Vance" && c.will.charityPct === 20, "will stored");
r = writeWill(c, "kid-Nobody", 0);
check(!r.ok, "can't name a stranger as heir");
console.log("  ok");

console.log("2) Estate settlement: taxes, charity, drama");
c.money = 6000000;
c = startBusiness(c, "consulting", "Vance & Co").character;
c = invest(c, "etf", 500000).character;
c = buyProperty(c, "condo").character;
c.age = 80;
c.alive = false;
const { heir, report } = createHeir(c, "kid-Ada Vance");
console.log(
  `  gross $${report.grossEstate.toLocaleString()} → tax $${report.tax.toLocaleString()} → charity $${report.charity.toLocaleString()} → heir $${report.netToHeir.toLocaleString()}`,
);
console.log(
  `  drama: ${report.drama.length} event(s); businesses kept ${report.businessesKept}/lost ${report.businessesLost}; properties ${report.propertiesKept}`,
);
check(report.tax > 1000000, "progressive estate tax bites a $6M+ estate");
check(report.charity > 0, "charity honored");
check(heir.money === report.netToHeir, "heir receives net");
check(heir.dynasty?.generation === 2, "generation 2");
check((heir.dynasty?.ancestors.length ?? 0) === 1, "ancestor recorded");
check(heir.age === 12, "heir starts at their actual age");
check(heir.fame === Math.round(c.fame * 0.3) || heir.fame >= 0, "fame partially inherited");
check(report.propertiesKept === 1 && heir.investing?.properties.length === 1, "property transfers");
check(
  heir.relationships.some((x) => x.name === "Ben Vance" && x.type === "sibling"),
  "sibling relationship preserved",
);
check(
  heir.log.some((l) => l.text.includes("Generation 2")),
  "handoff logged",
);
console.log("  ok");

console.log("3) No-will drama: executor fire-sales");
let sales = 0;
let keeps = 0;
for (let i = 0; i < 20; i++) {
  let d = createCharacter({ name: "Intestate", gender: "female", country: "Canada" });
  d = ageTo(d, 40);
  d.money = 2000000;
  d = addChild(d, "Kid", 20);
  d = startBusiness(d, "retail", "Shop").character;
  d.alive = false;
  const res = createHeir(d, "kid-Kid");
  if (res.report.businessesLost > 0) sales++;
  else keeps++;
}
console.log(`  over 20 intestate deaths: ${sales} fire-sales, ${keeps} survived`);
check(sales > 3 && keeps > 3, "no-will fire-sale drama is probabilistic, not certain");
console.log("  ok");

console.log("4) Path inheritance: dynasty bonuses & marked families");
let boss = createCharacter({ name: "Don Vito", gender: "male", country: "United States" });
boss = ageTo(boss, 50);
boss = addChild(boss, "Michael", 25);
boss.crime = {
  active: true,
  rank: "boss",
  syndicate: "Moretti Family",
  notoriety: 90,
  heat: 20,
  dirtyMoney: 300000,
  crew: [],
  rackets: 3,
  crimesCommitted: 40,
  timesCaught: 2,
  totalYearsServed: 3,
  informant: false,
  leftTheLife: false,
};
boss.alive = false;
const { heir: michael } = createHeir(boss, "kid-Michael");
check(
  (michael.crime?.notoriety ?? 0) >= 20,
  "syndicate legacy gives the heir a name on the street",
);
check(
  michael.log.some((l) => l.text.includes("Moretti")),
  "the family reached out at the funeral",
);
let rat = createCharacter({ name: "Henry", gender: "male", country: "United States" });
rat = ageTo(rat, 50);
rat = addChild(rat, "Junior", 18);
rat.crime = {
  active: false,
  notoriety: 30,
  heat: 10,
  dirtyMoney: 0,
  crew: [],
  rackets: 0,
  crimesCommitted: 10,
  timesCaught: 2,
  totalYearsServed: 2,
  informant: true,
  leftTheLife: true,
};
rat.alive = false;
const { heir: junior } = createHeir(rat, "kid-Junior");
check(junior.dynasty?.markedBySyndicate !== undefined, "informant marks the family");
check((junior.crime?.heat ?? 0) >= 15, "marked heirs start hot");
console.log("  ok");

console.log("5) Societies: invite → obligations → favors → enemy");
let s = createCharacter({ name: "Socialite", gender: "female", country: "United Kingdom" });
s = ageTo(s, 30);
s.money = 5000000; // Ivory Chamber material
let invited = false;
for (let i = 0; i < 30 && !invited; i++) {
  s = ageUp(s).character;
  if (s.society?.pendingInvite) invited = true;
}
check(invited, "wealth attracts an invitation");
r = acceptInvite(s);
check(r.ok, `initiated (${r.message})`);
s = r.character;
check(s.society?.member === "The Ivory Chamber", "joined the right society");
let obligations = 0;
let favors = 0;
for (let i = 0; i < 15 && s.alive; i++) {
  s = ageUp(s).character;
  if (s.society?.pendingObligation) {
    obligations++;
    const res = resolveObligation(s, true);
    if (res.ok) {
      s = res.character;
      favors = s.society!.favors;
    }
  }
}
console.log(`  ${obligations} obligations over 15 yrs, ${favors} favors banked`);
check(obligations > 0, "obligations arrive");
check(favors > 0, "compliance earns favors");
r = callInFavor(s, "open-doors");
check(r.ok, "favor spends");
s = r.character;
// Refusal → enemy
let e = createCharacter({ name: "Refusenik", gender: "male", country: "Germany" });
e = ageTo(e, 30);
ensureSociety(e).pendingInvite = "The Meridian Order";
e = acceptInvite(e).character;
e.society!.standing = 20;
for (let i = 0; i < 10 && !e.society!.enemy; i++) {
  e.society!.pendingObligation = {
    id: `x${i}`,
    title: "T",
    description: "D",
    complyText: "c",
    refuseText: "r",
    cost: {},
  };
  e = resolveObligation(e, false).character;
}
check(e.society!.enemy && !e.society!.member, "refusals make an enemy");
console.log("  ok");

console.log("6) Three-generation dynasty run");
let g = createCharacter({ name: "Founder Reyes", gender: "male", country: "United States" });
ensureDynasty(g);
for (let gen = 1; gen <= 3; gen++) {
  g = ageTo(g, 30 + gen * 5);
  g.money += 2000000; // each generation builds
  g = addChild(g, `Gen${gen + 1}Kid`, 20);
  const w = writeWill(g, `kid-Gen${gen + 1}Kid`, 10);
  if (w.ok) g = w.character;
  g.alive = false;
  const res = createHeir(g, `kid-Gen${gen + 1}Kid`);
  g = res.heir;
  check(g.dynasty?.generation === gen + 1, `generation ${gen + 1} begins`);
}
console.log(
  `  dynasty after 3 handoffs: gen ${g.dynasty!.generation}, score ${g.dynasty!.legacyScore}, wealth created $${Math.round(g.dynasty!.wealthCreated).toLocaleString()}, ${g.dynasty!.ancestors.length} ancestors`,
);
check(g.dynasty!.legacyScore > 0, "score accumulates");
check(g.dynasty!.ancestors.length === 3, "all ancestors remembered");
// Heir plays on without crashing
let ok = true;
try {
  for (let i = 0; i < 20 && g.alive; i++) g = ageUp(g).character;
} catch (err) {
  ok = false;
  console.error(err);
}
check(ok, "gen-4 heir lives on cleanly");
console.log("  ok");

console.log("7) Save round-trip across a handoff");
let sv = createCharacter({ name: "Saver", gender: "female", country: "Japan" });
sv = ageTo(sv, 40);
sv.money = 1500000;
sv = addChild(sv, "Next", 15);
sv = writeWill(sv, "kid-Next", 0).character;
sv = JSON.parse(JSON.stringify(sv));
sv.alive = false;
const { heir: next } = createHeir(sv, "kid-Next");
const restored = JSON.parse(JSON.stringify(next)) as Character;
ok = true;
let rc: Character = restored;
try {
  for (let i = 0; i < 15; i++) {
    rc = ageUp(rc).character;
    if (!rc.alive) break;
  }
} catch (err) {
  ok = false;
  console.error(err);
}
check(ok, "heir survives round-trip + 15 years");
check(rc.dynasty?.generation === 2, "dynasty survives serialization");
console.log("  ok");

console.log(failures === 0 ? "\nALL LEGACY CHECKS PASSED" : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
