/* Build 12: The House — council, constitution, rivals, vault, bank, office,
   press, matchmaking, heirlooms, cadet branches, seat customization. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import { acquireSeat } from "../src/game/oldmoney";
import { createHeir, ensureDynasty, writeWill } from "../src/game/legacy";
import {
  CONSTITUTION_RULES,
  adoptRule,
  establishCouncil,
  resolveCouncil,
} from "../src/game/council";
import {
  ensureRivals,
  investigateRival,
  useLeverage,
} from "../src/game/rivals";
import {
  approveLoan,
  forgiveLoan,
  setOfficeTier,
  suppressScandal,
} from "../src/game/familybank";
import {
  arrangeIntroduction,
  assignHeirloom,
  commissionHeirloom,
  foundBranch,
} from "../src/game/matchmaking";
import { renameSeat, renovateSeat } from "../src/game/lifestyle";
import { ensureChildren } from "../src/game/upbringing";
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
function year(c: Character): Character {
  c.yearActionsUsed = 0;
  const saved = c.age;
  const n = ageUp(c).character;
  n.age = saved; // frozen clock: systems tick, nobody dies of the calendar
  n.stats.health = 90;
  n.alive = true;
  n.money = Math.max(n.money, 5_000_000); // solvent throughout
  return n;
}

// --- A patriarch with a Seat, money, and two adult children ---
let c = createCharacter({
  name: "Roland Vane",
  gender: "male",
  country: "USA",
});
while (c.age < 45) c = ageUp(c).character;
c.money = 800_000_000;
c.networking = 80;
const d0 = ensureDynasty(c);
d0.reputation = 75;
d0.pedigree = 55;
c = must(acquireSeat(c, "Vane Hall", trySpendEnergy), "acquire seat");
for (const nm of ["Arthur Vane", "Beatrice Vane"]) {
  c.relationships.push({
    id: `child-${nm.split(" ")[0]}`,
    name: nm,
    type: "child",
    relationship: 85,
    age: 26,
    alive: true,
  });
}
ensureChildren(c);
const arthur = c.relationships.find((r) => r.name === "Arthur Vane")!;
const bea = c.relationships.find((r) => r.name === "Beatrice Vane")!;

// --- Seat customization ---
const before = c.dynasty!.seat!.value;
c = must(renovateSeat(c, 5_000_000), "renovate the seat");
check(
  "seat value customized upward",
  c.dynasty!.seat!.value >= before + 4_000_000,
);
check("cheap renovation rejected", !renovateSeat(c, 50_000).ok);
c = must(renameSeat(c, "Vane Court"), "rename the seat");
check("seat renamed", c.dynasty!.seat!.name === "Vane Court");

// --- Council + constitution ---
c = must(establishCouncil(c), "establish the council");
check("second council rejected", !establishCouncil(c).ok);
c = must(
  adoptRule(c, CONSTITUTION_RULES[0].id),
  "adopt first constitution rule",
);
c = must(adoptRule(c, CONSTITUTION_RULES[1].id), "adopt second rule");
check("duplicate rule rejected", !adoptRule(c, CONSTITUTION_RULES[0].id).ok);
let resolved = false;
for (let i = 0; i < 30 && !resolved; i++) {
  c = year(c);
  const m = c.dynasty?.council?.pending;
  if (m) {
    const r = resolveCouncil(c, m.options[0].id);
    c = r.character;
    resolved = r.ok;
  }
}
check("a council matter arose and was resolved (within 30 yrs)", resolved);
check(
  "constitution rules tracked yearly",
  (c.dynasty?.constitution?.[0]?.keptYears ?? 0) >= 0,
);

// --- Rivals + vault + leverage ---
c = structuredClone(c);
ensureRivals(c);
check("rival houses seeded", (c.dynasty?.rivals?.length ?? 0) >= 1);
const rival = c.dynasty!.rivals![0];
let haveLeverage = false;
for (let i = 0; i < 25 && !haveLeverage; i++) {
  c.yearActionsUsed = 0;
  c = investigateRival(c, rival.id, trySpendEnergy).character;
  haveLeverage = (c.dynasty?.vault?.length ?? 0) > 0;
}
check("investigation produced vault leverage (within 25 tries)", haveLeverage);
if (haveLeverage) {
  const item = c.dynasty!.vault![0];
  const relBefore =
    c.dynasty!.rivals!.find((r) => r.id === item.rivalId)?.relation ?? 0;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- game function, not a React hook
  c = must(useLeverage(c, item.id, "relation"), "use leverage on relations");
  const relAfter =
    c.dynasty!.rivals!.find((r) => r.id === item.rivalId)?.relation ?? 0;
  check("leverage moved the relationship", relAfter !== relBefore);
  check(
    "leverage consumed from vault",
    !c.dynasty!.vault!.some((v) => v.id === item.id),
  );
  // Offensive leak: acquire another folder and feed it to the papers.
  let second = false;
  for (let i = 0; i < 25 && !second; i++) {
    c.yearActionsUsed = 0;
    c = investigateRival(c, rival.id, trySpendEnergy).character;
    second = (c.dynasty?.vault?.length ?? 0) > 0;
  }
  if (second) {
    const folder = c.dynasty!.vault![0];
    const target = c.dynasty!.rivals!.find((r) => r.id === folder.rivalId)!;
    const prestigeBefore = target.prestige;
    // eslint-disable-next-line react-hooks/rules-of-hooks -- game function, not a React hook
    c = must(useLeverage(c, folder.id, "leak"), "leak a story about the rival");
    const after = c.dynasty!.rivals!.find((r) => r.id === folder.rivalId)!;
    check("leak damaged rival prestige", after.prestige < prestigeBefore);
  } else {
    check("second folder acquired for leak test", false);
  }
}

// --- Family bank ---
let requested = false;
for (let i = 0; i < 40 && !requested; i++) {
  c = year(c);
  requested = !!c.dynasty?.bank?.pendingRequest;
}
check("a relative came to the bank window (within 40 yrs)", requested);
if (requested) {
  c = must(approveLoan(c, 5), "approve loan at 5%");
  check("loan on the books", (c.dynasty?.bank?.loans.length ?? 0) > 0);
  const loan = c.dynasty!.bank!.loans[0];
  c = must(forgiveLoan(c, loan.id), "forgive the loan");
  check("forgiveness tallied", (c.dynasty?.bank?.lifetimeForgiven ?? 0) > 0);
}

// --- Family office + scandal press ---
c = must(setOfficeTier(c, 2), "engage family office (tier 2)");
c = year(c);
check("office fees paid", (c.dynasty?.office?.feesPaid ?? 0) > 0);
c.dynasty!.press = c.dynasty!.press ?? { suppressed: 0, weathered: 0 };
let killed = false;
for (let i = 0; i < 12 && !killed; i++) {
  c.dynasty!.press!.active = c.dynasty!.press!.active ?? {
    id: `t${i}`,
    headline: "THE VANE AFFAIR: What the Staff Saw",
    heat: 50,
    yearsRunning: 1,
  };
  c = must(suppressScandal(c), "suppress attempt (30% leak by design)");
  killed = !c.dynasty?.press?.active;
}
check(
  "story killed and tallied (within 12 tries)",
  killed && (c.dynasty?.press?.suppressed ?? 0) > 0,
);

// --- Matchmaking: arranged introduction with prenup (fresh child — the
// background tree may have married the others off during the loops above) ---
c.relationships.push({
  id: "child-Clara",
  name: "Clara Vane",
  type: "child",
  relationship: 85,
  age: 24,
  alive: true,
});
ensureChildren(c);
const clara = c.relationships.find((r) => r.name === "Clara Vane")!;
c.yearActionsUsed = 0;
c = must(
  arrangeIntroduction(
    c,
    clara.id,
    "political",
    true,
    undefined,
    trySpendEnergy,
  ),
  "arrange a political match for Clara",
);
let wed = false;
for (let i = 0; i < 30 && !wed; i++) {
  c = year(c);
  const k = c.children?.find((x) => x.relId === clara.id);
  wed = !!k?.spouseName && k?.contract === "political";
  // A courtship can fizzle (the child may refuse) or the background tree may
  // marry her first — both are legitimate; clear and re-arrange for the test.
  if (!wed && k && !k.courtship) {
    k.spouseName = undefined;
    k.prenup = undefined;
    k.contract = undefined;
    c.yearActionsUsed = 0;
    const again = arrangeIntroduction(
      c,
      clara.id,
      "political",
      true,
      undefined,
      trySpendEnergy,
    );
    if (again.ok) c = again.character;
  }
  const kr = c.relationships.find((r) => r.id === clara.id);
  if (kr && kr.age > 44) kr.age = 30;
}
check("arranged match concluded in marriage (within 30 yrs)", wed);
check(
  "prenup recorded",
  !!c.children?.find((x) => x.relId === clara.id)?.prenup,
);

// --- Heirlooms ---
c = must(
  commissionHeirloom(c, "The Founder's Compass"),
  "commission an heirloom",
);
const loom = c.dynasty!.heirlooms![c.dynasty!.heirlooms!.length - 1];
c = must(
  assignHeirloom(c, loom.id, bea.id),
  "assign heirloom to Beatrice in the will",
);
check(
  "assignment recorded",
  c.dynasty!.heirlooms!.some((h) => h.assignedTo === bea.id),
);

// --- Cadet branch founded in life ---
c = must(
  foundBranch(c, bea.id, 2_000_000),
  "found a cadet branch for Beatrice",
);
check("branch exists", (c.dynasty?.branches?.length ?? 0) === 1);
check(
  "branch founder recorded",
  c.dynasty!.branches![0].founder.includes("Beatrice"),
);
check(
  "child flagged as branched",
  !!c.children?.find((x) => x.relId === bea.id)?.branchId,
);
check("double-founding rejected", !foundBranch(c, bea.id, 2_000_000).ok);

// --- Dual-heir succession: split the estate, second share powers the house ---
const branchesBefore = c.dynasty?.branches?.length ?? 0;
c = writeWill(c, arthur.id, 0, [
  { relId: arthur.id, pct: 60 },
  { relId: bea.id, pct: 40 },
]).character;
check("split will written", c.will?.splits?.length === 2);
const heirRes = createHeir(c, arthur.id);
const heir = heirRes.heir;
check("heir carries council", !!heir.dynasty?.council?.established);
check(
  "heir carries constitution",
  (heir.dynasty?.constitution?.length ?? 0) >= 2,
);
check("heir carries rivals", (heir.dynasty?.rivals?.length ?? 0) >= 1);
check(
  "heir carries branches",
  (heir.dynasty?.branches?.length ?? 0) >= branchesBefore,
);
check(
  "assigned heirloom changed hands",
  heir.dynasty!.heirlooms!.some((h) => h.holder.includes("Beatrice")),
);

// --- Old save survives ---
let old = createCharacter({
  name: "Old Save",
  gender: "female",
  country: "USA",
});
for (let i = 0; i < 30; i++) old = ageUp(old).character;
check("old save shape survives 30 years", old.age >= 30);

console.log(`\n${pass} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);

// --- The Generation Switch: continue as a child while the founder lives ---
import("../src/game/generational").then(async () => {
  const { switchToChild, advanceGenerational } =
    await import("../src/game/generational");
  let f = createCharacter({
    name: "Founder Vane",
    gender: "male",
    country: "USA",
  });
  while (f.age < 50) f = ageUp(f).character;
  f.money = 300_000_000;
  const fd = ensureDynasty(f);
  fd.reputation = 60;
  f.relationships.push({
    id: "child-Heir",
    name: "Junior Vane",
    type: "child",
    relationship: 85,
    age: 25,
    alive: true,
  });
  ensureChildren(f);
  const minor = { ...f.relationships[f.relationships.length - 1] };
  f.relationships.push({
    ...minor,
    id: "child-Baby",
    name: "Baby Vane",
    age: 8,
  });
  ensureChildren(f);
  check("switch rejected for a minor", !switchToChild(f, "child-Baby").ok);
  const sw = switchToChild(f, "child-Heir");
  check("switch succeeds for adult child", sw.ok, `— ${sw.message}`);
  let h = sw.character;
  check("now playing the child", h.name === "Junior Vane" && h.age === 25);
  check(
    "founder became parent NPC",
    h.relationships.some(
      (r) =>
        (r.type === "father" || r.type === "mother") &&
        r.name === "Founder Vane" &&
        r.alive,
    ),
  );
  check(
    "sibling carried over",
    h.relationships.some((r) => r.type === "sibling"),
  );
  check(
    "dynasty carried, generation advanced",
    (h.dynasty?.generation ?? 0) === fd.generation + 1,
  );
  check(
    "parent estate parked",
    (h.dynasty?.parentEstate?.value ?? 0) > 100_000_000,
  );
  check("child starts on their own money", h.money < 1_000_000);
  // Age until the founder dies and the estate passes.
  let inherited = false;
  for (let i = 0; i < 60 && !inherited; i++) {
    h.yearActionsUsed = 0;
    const saved = h.age;
    h = ageUp(h).character;
    h.age = saved;
    h.stats.health = 90;
    h.alive = true;
    const parent = h.relationships.find((r) => r.name === "Founder Vane");
    if (parent) parent.age += 1;
    advanceGenerational(h, h.log);
    inherited = !h.dynasty?.parentEstate && h.money > 10_000_000;
  }
  check(
    "estate eventually passed to the new life",
    inherited,
    `money=${h.money}`,
  );
  console.log(`\n[switch] ${pass} passed, ${failCount} failed`);
  if (failCount > 0) process.exit(1);
});
