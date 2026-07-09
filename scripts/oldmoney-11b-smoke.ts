/* Build 11B: Old Money lifestyle, luxury & legacy systems. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import { acquireSeat } from "../src/game/oldmoney";
import { createHeir, ensureDynasty, writeWill } from "../src/game/legacy";
import {
  buildEstateUpgrade,
  buyBerth,
  buyTransport,
  estateMaintenance,
  estateValue,
  hireStaff,
  raiseStaff,
  refitTransport,
  staffPayroll,
} from "../src/game/lifestyle";
import {
  applyToClub,
  attendClub,
  establishTradition,
  setTraditionActive,
} from "../src/game/clubs";
import {
  acquirePiece,
  collectionsValue,
  sellPiece,
} from "../src/game/collections";
import {
  createFoundation,
  donate,
  fundBuilding,
  joinBoard,
} from "../src/game/philanthropy";
import { familyNetWorth, prestigeBreakdown } from "../src/game/prestige";
import { findPartner, propose, tryForBaby } from "../src/game/upbringing";
import type { Character } from "../src/game/types";

let pass = 0;
let failCount = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    failCount++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

function must(
  r: { character: Character; ok: boolean; message: string },
  name: string,
): Character {
  check(name, r.ok, `— ${r.message}`);
  return r.character;
}

// --- Rich adult with a Seat ---
let c = createCharacter({
  name: "Augusta Vane",
  gender: "female",
  country: "USA",
});
while (c.age < 30) c = ageUp(c).character;
c.money = 500_000_000;
c.networking = 80;
const d = ensureDynasty(c);
d.reputation = 70;
d.pedigree = 40;

c = must(acquireSeat(c, "Vane Hall", trySpendEnergy), "acquire seat");
c.yearActionsUsed = 0;

// --- Estate upgrades + staff + transport ---
c = must(buildEstateUpgrade(c, "gardens"), "build gardens");
if (c.dynasty!.seat!.value < 3_000_000) {
  check("ballroom gated by seat value", !buildEstateUpgrade(c, "ballroom").ok);
  c.dynasty!.seat!.value = 5_000_000; // the family trades up
}
c = must(buildEstateUpgrade(c, "ballroom"), "build ballroom");
c = must(buildEstateUpgrade(c, "cellar"), "build wine cellar");
check("duplicate upgrade rejected", !buildEstateUpgrade(c, "gardens").ok);
check(
  "estate value includes upgrades",
  estateValue(c) > (c.dynasty!.seat!.value ?? 0),
);
check("maintenance positive", estateMaintenance(c) > 0);

c = must(hireStaff(c, "butler"), "hire butler");
c = must(hireStaff(c, "tutor"), "hire tutor");
c = must(hireStaff(c, "curator"), "hire curator");
c = must(hireStaff(c, "sommelier"), "hire sommelier");
check("duplicate staff rejected", !hireStaff(c, "butler").ok);
c = must(raiseStaff(c, c.lifestyle!.staff[0].id), "raise staff");
check("payroll positive", staffPayroll(c) > 0);

c = must(buyTransport(c, "jet"), "buy jet");
c = must(refitTransport(c, c.lifestyle!.transport[0].id), "refit jet");
c = must(buyBerth(c, c.lifestyle!.transport[0].id), "buy hangar");
check("duplicate transport rejected", !buyTransport(c, "jet").ok);

// --- Clubs + traditions ---
let joined = false;
for (let i = 0; i < 12 && !joined; i++) {
  c.yearActionsUsed = 0;
  const r = applyToClub(c, "country", trySpendEnergy);
  c = r.character;
  joined = (c.clubs ?? []).some((m) => m.id === "country");
}
check("joined country club (within 12 tries)", joined);
if (joined) {
  c.yearActionsUsed = 0;
  c = must(attendClub(c, "country", trySpendEnergy), "attend club");
}
c = must(establishTradition(c, "council"), "establish family council");
c = must(
  establishTradition(c, "Midsummer Regatta", true),
  "establish custom tradition",
);
check("duplicate tradition rejected", !establishTradition(c, "council").ok);
const regatta = c.dynasty!.traditions!.find((t) => t.custom)!;
c = must(setTraditionActive(c, regatta.id, false), "pause tradition");
c = must(setTraditionActive(c, regatta.id, true), "resume tradition");

// --- Collections ---
c = must(acquirePiece(c, "art", 2_000_000), "acquire fine art");
c = must(acquirePiece(c, "wine", 100_000), "acquire wine");
check("undersized budget rejected", !acquirePiece(c, "art", 1_000).ok);
check("collections value tracked", collectionsValue(c) >= 2_100_000 * 0.9);

// --- Philanthropy + boards ---
c = must(
  createFoundation(c, "The Vane Foundation", 20_000_000),
  "charter foundation",
);
check(
  "second foundation rejected",
  !createFoundation(c, "Another", 5_000_000).ok,
);
c = must(
  donate(c, "scholarship", 1_500_000, true),
  "endow scholarships via foundation",
);
c = must(donate(c, "disaster", 500_000, false), "personal donation");
c = must(fundBuilding(c, "publiclibrary", false), "fund named library");
check(
  "building carries family name",
  c.dynasty!.namedBuildings![0].name.includes(c.dynasty!.familyName),
);
c.yearActionsUsed = 0;
c = must(joinBoard(c, "museum", trySpendEnergy), "join museum board");

// --- Family: marriage + child (for succession + archives) ---
c.yearActionsUsed = 0;
for (
  let i = 0;
  i < 10 && !c.relationships.some((r) => r.type === "partner");
  i++
) {
  c.yearActionsUsed = 0;
  c = findPartner(c, trySpendEnergy).character;
}
if (c.relationships.some((r) => r.type === "partner")) {
  c.yearActionsUsed = 0;
  c = propose(c, trySpendEnergy).character;
}
for (let i = 0; i < 10 && !(c.children?.length ?? 0); i++) {
  c.yearActionsUsed = 0;
  c = tryForBaby(c, trySpendEnergy).character;
}
check("has a child (within 10 tries)", (c.children?.length ?? 0) > 0);

// --- Advance 10 years: yearly systems + records sync + goals ---
for (let i = 0; i < 10; i++) {
  c.yearActionsUsed = 0;
  c = ageUp(c).character;
}
check(
  "still solvent after a decade of upkeep",
  c.money > 0,
  `money=${c.money}`,
);
check("archives populated", (c.dynasty?.archives?.length ?? 0) > 0);
check("library populated", (c.dynasty?.library?.length ?? 0) > 0);
check(
  "tradition years accrued",
  (c.dynasty?.traditions?.[0]?.yearsMaintained ?? 0) >= 5,
);
check("staff gained experience", (c.lifestyle?.staff[0]?.experience ?? 0) >= 5);
check("collections appreciated or held", collectionsValue(c) > 0);
const p = prestigeBreakdown(c);
check(
  "prestige computed",
  p.overall > 0 && p.social > 0 && p.philanthropic > 0,
);
check("family net worth computed", familyNetWorth(c) > estateValue(c));
console.log(
  `  info prestige = W${p.wealth} A${p.academic} P${p.political} Ath${p.athletic} B${p.business} Ph${p.philanthropic} S${p.social} => ${p.overall}; goals done: ${c.dynasty?.goalsDone?.join(", ") || "none"}`,
);

// --- Family tree runs in the background: marriages + grandchildren ---
const kidRel = c.relationships.find((r) => r.type === "child" && r.alive);
if (kidRel) {
  kidRel.age = 26; // fast-forward the child into marrying age
  let married = false;
  let grandkid = false;
  for (let i = 0; i < 80 && !(married && grandkid); i++) {
    c.yearActionsUsed = 0;
    // hold the player steady so the fast-forward can't kill them
    const savedAge = c.age;
    c = ageUp(c).character;
    c.age = savedAge;
    c.stats.health = 90;
    c.alive = true;
    // keep the child inside the marrying/conceiving window
    const kr = c.relationships.find((r) => r.id === kidRel.id);
    if (kr && kr.age > 40) kr.age = 28;
    const k = c.children?.find((x) => x.relId === kidRel.id);
    married = !!k?.spouseName;
    grandkid = (c.dynasty?.descendants?.length ?? 0) > 0;
  }
  check("child married in background", married);
  check("grandchild born in background", grandkid);
  check(
    "wedding archived",
    (c.dynasty?.archives ?? []).some((a) => a.kind === "wedding"),
  );
  check(
    "grandchild archived as birth",
    (c.dynasty?.archives ?? []).some((a) => a.id.startsWith("gbirth:")),
  );
}

// --- Succession: dynasty carries the 11B state ---
const kid = c.relationships.find((r) => r.type === "child" && r.alive);
if (kid) {
  c = writeWill(c, kid.id, 10).character;
  // age the child up so they can inherit sensibly
  const rel = c.relationships.find((r) => r.id === kid.id)!;
  rel.age = 25;
  const { heir } = createHeir(c, kid.id);
  check(
    "heir carries collections",
    (heir.dynasty?.collections?.length ?? 0) ===
      (c.dynasty?.collections?.length ?? 0),
  );
  check(
    "heir carries archives incl. death",
    (heir.dynasty?.archives ?? []).some((a) => a.kind === "death"),
  );
  check("heir carries library", (heir.dynasty?.library?.length ?? 0) > 0);
  check(
    "heir carries traditions",
    (heir.dynasty?.traditions?.length ?? 0) >= 2,
  );
  check(
    "heir carries named buildings",
    (heir.dynasty?.namedBuildings?.length ?? 0) === 1,
  );
  check("heir carries foundation", !!heir.dynasty?.foundation);
  check(
    "heir has no personal staff/clubs",
    !(heir.lifestyle?.staff.length || heir.clubs?.length),
  );
  // Legacy admissions data
  check("alma maters array exists", Array.isArray(heir.dynasty?.almaMaters));
  // Background family becomes real for the heir
  const deadRec = c.children?.find((k) => k.relId === kid.id);
  if (deadRec?.spouseName) {
    check(
      "heir's background spouse became partner",
      heir.relationships.some(
        (r) => r.type === "partner" && r.name === deadRec.spouseName,
      ),
    );
  }
  check(
    "remaining tree retagged as extended",
    (heir.dynasty?.descendants ?? []).every((t) => t.branch === "extended"),
  );
} else {
  check("child available for succession", false);
}

// --- Old-save compatibility: a character with none of the 11B fields ages fine ---
let old = createCharacter({
  name: "Legacy Save",
  gender: "male",
  country: "USA",
});
delete (old as Partial<Character>).lifestyle;
delete (old as Partial<Character>).clubs;
delete (old as Partial<Character>).boards;
for (let i = 0; i < 30; i++) old = ageUp(old).character;
check(
  "old save shape survives 30 years",
  old.age >= 30 && old.alive !== undefined,
);

console.log(`\n${pass} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
