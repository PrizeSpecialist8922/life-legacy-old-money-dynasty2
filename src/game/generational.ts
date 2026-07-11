import type { Character, LogEntry, LogTone, Relationship } from "./types";
import { createCharacter } from "./engine";
import { ensureChildren } from "./upbringing";
import { familyNetWorth } from "./prestige";
import { estateValue } from "./lifestyle";
import { collectionsValue } from "./collections";
import { clamp, formatMoney, randInt } from "./util";

// ---------------------------------------------------------------------------
// The Generation Switch (Build 12.1). Step out of your own life and into your
// child's — while you're still alive. There is no way back: the founder
// becomes a parent NPC, still sitting on the fortune, aging at the edge of
// your new life until the day the estate finally passes.
// ---------------------------------------------------------------------------

export interface SwitchResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): SwitchResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

/** Liquid wealth the parent NPC keeps sitting on: everything not welded to the dynasty. */
function parentLiquid(c: Character): number {
  const dynastyHeld =
    estateValue(c) + collectionsValue(c) + (c.dynasty?.trust?.corpus ?? 0);
  return Math.max(0, familyNetWorth(c) - dynastyHeld);
}

export function switchToChild(input: Character, relId: string): SwitchResult {
  const c = structuredClone(input);
  const rel = c.relationships.find(
    (r) => r.id === relId && r.type === "child" && r.alive,
  );
  if (!rel) return fail(input, "They aren't here to take over.");
  if (rel.age < 18)
    return fail(
      input,
      `${rel.name} is ${rel.age}. Childhood first; dynasty later.`,
    );
  ensureChildren(c);
  const k = c.children!.find((x) => x.relId === relId)!;
  if (k.cutOff)
    return fail(input, "You cut them off. You don't get to become them.");
  if (k.branchId)
    return fail(
      input,
      `${rel.name} founded their own branch — that life is already spoken for.`,
    );

  const d = c.dynasty;

  // --- Build the new life ---
  const heir = createCharacter({
    name: rel.name,
    country: c.country,
  });
  heir.age = rel.age;
  heir.stats.smarts = clamp(35 + Math.round(k.academics * 0.55));
  heir.stats.happiness = clamp(
    55 + Math.round((k.affection - k.resentment) / 5),
  );
  heir.stats.health = clamp(92 - Math.max(0, rel.age - 20));
  heir.stats.looks = clamp(randInt(40, 75));
  heir.money = Math.max(10000, Math.round(k.brokerage ?? 0)) + 40000; // their own account, plus a graduation gift
  heir.education =
    rel.age >= 22 && k.academics >= 55
      ? "graduated"
      : rel.age >= 18
        ? "graduated"
        : "high";
  if (rel.age >= 22 && k.academics >= 55) {
    heir.edu.degrees.push("B.A. Liberal Arts");
    heir.log.push({
      age: rel.age,
      text: "You finished university the way the family expected: adequately, and photographed.",
      tone: "neutral",
    });
  }
  heir.networking = clamp(
    Math.round((c.networking ?? 0) * 0.25) + Math.round(k.worldliness / 4),
  );
  heir.fame = clamp(Math.round(c.fame * 0.2));

  // --- The dynasty walks across the hallway ---
  if (d) {
    heir.dynasty = d;
    d.generation += 1;
    // The parent keeps the liquid fortune. It arrives when it arrives.
    const kidsAlive = c.relationships.filter(
      (r) => r.type === "child" && r.alive,
    );
    const split = c.will?.splits?.find((s) => s.relId === relId)?.pct;
    const pct = split ?? Math.round(100 / Math.max(1, kidsAlive.length));
    d.parentEstate = {
      holder: c.name,
      partner: c.relationships.find((r) => r.type === "partner" && r.alive)
        ?.name,
      value: parentLiquid(c),
      pct,
    };
    d.archives = d.archives ?? [];
    d.archives.push({
      id: `switch:${relId}:${d.generation}`,
      generation: d.generation,
      age: rel.age,
      person: rel.name,
      kind: "milestone",
      text: `${c.name} stepped back at ${c.age}. ${rel.name} became the face of the family.`,
    });
  }

  // --- Populate the new life's relationships ---
  heir.relationships = [];
  heir.relationships.push({
    id: `parent-founder`,
    name: c.name,
    type: c.gender === "female" ? "mother" : "father",
    relationship: clamp(45 + Math.round((k.affection - k.resentment) / 2)),
    age: c.age,
    alive: true,
  });
  const spouse = c.relationships.find((r) => r.type === "partner" && r.alive);
  if (spouse)
    heir.relationships.push({
      id: `parent-founder-spouse`,
      name: spouse.name,
      type: c.gender === "female" ? "father" : "mother",
      relationship: clamp(55 + Math.round(k.affection / 4)),
      age: spouse.age,
      alive: true,
    });
  for (const sib of c.relationships.filter(
    (r) => r.type === "child" && r.alive && r.id !== relId,
  )) {
    const sk = c.children?.find((x) => x.relId === sib.id);
    heir.relationships.push({
      id: `sibling-${sib.id}`,
      name: sib.name,
      type: "sibling",
      relationship: clamp(60 - Math.round((sk?.resentment ?? 0) / 2)),
      age: sib.age,
      alive: true,
    });
  }
  // Their own background family becomes real, exactly as at succession.
  if (k.spouseName) {
    heir.relationships.push({
      id: `partner-${Date.now()}`,
      name: k.spouseName,
      type: "partner",
      relationship: 72,
      age: Math.max(18, rel.age + randInt(-3, 3)),
      alive: true,
    });
  }
  const own = (d?.descendants ?? []).filter(
    (t) => t.branch === relId && t.parentName === rel.name && t.alive,
  );
  for (const t of own) {
    const nrel: Relationship = {
      id: `child-${t.id}`,
      name: t.name,
      type: "child",
      relationship: 82,
      age: t.age,
      alive: true,
    };
    heir.relationships.push(nrel);
    ensureChildren(heir);
    const nk = heir.children!.find((x) => x.relId === nrel.id);
    if (nk) {
      nk.affection = 70;
      nk.academics = clamp(randInt(30, 55) + Math.round(t.age * 1.5));
    }
  }
  if (d && own.length)
    d.descendants = d.descendants!.filter(
      (t) => !own.some((o) => o.id === t.id),
    );

  const inheritanceNote = d?.parentEstate
    ? ` The fortune — ${formatMoney(d.parentEstate.value)} of it liquid — stays with them for now. Your share is ${d.parentEstate.pct}%, payable in grief.`
    : "";
  heir.log.push({
    age: rel.age,
    text: `THE SWITCH: You are ${rel.name} now. ${c.name} still takes calls, still signs the checks, still sits at the head of the table.${inheritanceNote}`,
    tone: "milestone",
  });
  const msg = `You are ${rel.name} now. There is no going back — ${c.name} is a parent across the dinner table, and the money is still theirs.`;
  return { character: heir, message: msg, tone: "milestone", ok: true };
}

// ---------- The parent NPC ages; one day the estate passes ----------

export function advanceGenerational(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  const pe = d?.parentEstate;
  if (!d || !pe) return;

  const parent = c.relationships.find(
    (r) => (r.type === "mother" || r.type === "father") && r.name === pe.holder,
  );
  if (parent?.alive) {
    // The fortune compounds quietly; the founder was always good with money.
    pe.value = Math.round(pe.value * 1.03);
    // Occasional patronage from the head of the family.
    if (Math.random() < 0.25 && (parent.relationship ?? 50) >= 40) {
      const allowance = Math.max(25000, Math.round(pe.value * 0.002));
      c.money += allowance;
      log.push({
        age: c.age,
        text: `${pe.holder} sent ${formatMoney(allowance)} — no note. The note is that there's no note.`,
        tone: "good",
      });
    }
    // Time works on everyone, even founders.
    if (parent.age > 78 && randInt(1, 100) <= (parent.age - 75) * 3) {
      parent.alive = false;
      log.push({
        age: c.age,
        text: `${pe.holder} died at ${parent.age}. The house went quiet in a way it had never practiced.`,
        tone: "bad",
      });
      d.archives = d.archives ?? [];
      d.archives.push({
        id: `pdeath:${pe.holder}`,
        generation: d.generation,
        age: c.age,
        person: pe.holder,
        kind: "death",
        text: `${pe.holder} died at ${parent.age}.`,
      });
    }
    return;
  }

  // The holder is gone: the estate finally passes.
  const gross = Math.round(pe.value * (pe.pct / 100));
  const tax = Math.round(gross * 0.2);
  const net = gross - tax;
  c.money += net;
  d.parentEstate = undefined;
  c.stats.happiness = clamp(c.stats.happiness - 4); // money is not company
  log.push({
    age: c.age,
    text: `THE ESTATE PASSES: your ${pe.pct}% share of ${pe.holder}'s fortune arrives — ${formatMoney(net)} after ${formatMoney(tax)} in estate tax. The lawyers were gentle; the silence wasn't.`,
    tone: "milestone",
  });
  d.archives = d.archives ?? [];
  d.archives.push({
    id: `inherit:${pe.holder}:${d.generation}`,
    generation: d.generation,
    age: c.age,
    person: c.name,
    kind: "milestone",
    text: `${c.name} inherited ${formatMoney(net)} from ${pe.holder}.`,
  });
}
