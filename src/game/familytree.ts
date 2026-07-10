import type {
  Character,
  DescendantRecord,
  Dynasty,
  LogEntry,
  Relationship,
} from "./types";
import { ensureChildren } from "./upbringing";
import { FEMALE_NAMES, MALE_NAMES } from "./data";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Family Tree (Build 11B.1). The tree grows whether you watch or not: adult
// children marry, grandchildren arrive, cousins multiply, and one day the
// papers carry a name you half-recognise. No buttons. Just time.
// ---------------------------------------------------------------------------

const SPOUSE_SURNAMES = [
  "Ashford",
  "Whitmore",
  "Calloway",
  "Vance",
  "Holloway",
  "Bennett",
  "Sinclair",
  "Marchetti",
  "Okafor",
  "Lindqvist",
  "Tanaka",
  "Beaumont",
  "Delacroix",
  "Nakamura",
  "Rothwell",
  "Castellanos",
  "Adeyemi",
  "Fairbanks",
  "Osei",
  "Vandermeer",
];

function firstName(): string {
  return randItem(Math.random() > 0.5 ? MALE_NAMES : FEMALE_NAMES);
}

function spouseName(): string {
  return `${firstName()} ${randItem(SPOUSE_SURNAMES)}`;
}

function surnameOf(fullName: string): string {
  const parts = fullName.trim().split(" ");
  return parts[parts.length - 1] ?? "";
}

function ensureDescendants(d: Dynasty): DescendantRecord[] {
  if (!d.descendants) d.descendants = [];
  return d.descendants;
}

function pushArchive(
  d: Dynasty,
  c: Character,
  kind: string,
  text: string,
  id: string,
) {
  d.archives = d.archives ?? [];
  if (d.archives.some((a) => a.id === id)) return;
  d.archives.push({
    id,
    generation: d.generation,
    age: c.age,
    person: c.name,
    kind,
    text,
  });
}

/** Count everyone recorded as born into the dynasty, across all generations. */
export function descendantCount(c: Character): number {
  return c.dynasty?.archives?.filter((a) => a.kind === "birth").length ?? 0;
}

const MAX_TREE = 60; // the archivist's ledger has a last page

// ---------- Yearly advance: the tree grows on its own ----------

export function advanceFamilyTree(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return; // dynasty is ensured by the records sync each year
  const tree = ensureDescendants(d);
  const unity = d.unity ?? 60;

  // --- Your children marry (age 23+, unmarried) ---
  const kids = c.relationships.filter(
    (r) => r.type === "child" && r.alive && r.age >= 23,
  );
  for (const rel of kids) {
    const k = c.children?.find((x) => x.relId === rel.id);
    if (!k || k.spouseName || k.courtship || k.branchId) continue;
    const chance = clamp(
      6 + (rel.age - 23) * 1.5 + unity / 20 - k.resentment / 12,
      2,
      24,
    );
    if (randInt(1, 100) > chance) continue;
    k.spouseName = spouseName();
    k.marriedAtAge = rel.age;
    // Constitution: a marriage without a contract breaks the house's law.
    const contractRule = d.constitution?.find(
      (r) => r.id === "contract_marriages" && r.active && !r.broken,
    );
    if (contractRule) {
      contractRule.broken = true;
      d.unity = clamp((d.unity ?? 60) - 6);
      d.reputation = clamp(d.reputation - 4);
      log.push({
        age: c.age,
        text: `CONSTITUTIONAL CRISIS: "No marriage without a contract" is broken — ${rel.name} married without one. The Council's minutes will be frosty.`,
        tone: "bad",
      });
    }
    if (k.cutOff) {
      d.unity = clamp(unity - 2);
      pushArchive(
        d,
        c,
        "wedding",
        `${rel.name} married ${k.spouseName}. The family learned of it secondhand.`,
        `wed:${rel.id}`,
      );
      log.push({
        age: c.age,
        text: `${rel.name} married ${k.spouseName}. You were not invited. You found out the way strangers do.`,
        tone: "bad",
      });
    } else {
      d.unity = clamp(unity + 2);
      c.stats.happiness = clamp(c.stats.happiness + 2);
      pushArchive(
        d,
        c,
        "wedding",
        `${rel.name} married ${k.spouseName}.`,
        `wed:${rel.id}`,
      );
      log.push({
        age: c.age,
        text: `${rel.name} married ${k.spouseName}. A good wedding: two families sizing each other up over excellent food.`,
        tone: "milestone",
      });
    }
  }

  // --- Grandchildren arrive (married children, 24–45) ---
  for (const rel of c.relationships.filter(
    (r) => r.type === "child" && r.alive,
  )) {
    const k = c.children?.find((x) => x.relId === rel.id);
    if (!k?.spouseName || rel.age < 24 || rel.age > 45) continue;
    const theirKids = tree.filter(
      (t) => t.branch === rel.id && t.parentName === rel.name,
    ).length;
    if (theirKids >= 4 || tree.length >= MAX_TREE) continue;
    const chance = clamp(18 - theirKids * 4, 4, 18);
    if (randInt(1, 100) > chance) continue;
    const baby: DescendantRecord = {
      id: uid(),
      name: `${firstName()} ${surnameOf(rel.name)}`,
      age: 0,
      alive: true,
      generation: d.generation + 1,
      parentName: rel.name,
      branch: rel.id,
    };
    tree.push(baby);
    pushArchive(
      d,
      c,
      "birth",
      `${baby.name} was born to ${rel.name}.`,
      `gbirth:${baby.id}`,
    );
    if (k.cutOff) {
      log.push({
        age: c.age,
        text: `${rel.name} has a child — ${baby.name}. A grandchild you have never held. The archivist recorded it anyway.`,
        tone: "neutral",
      });
    } else {
      c.stats.happiness = clamp(c.stats.happiness + 2);
      d.unity = clamp((d.unity ?? 60) + 1);
      log.push({
        age: c.age,
        text: `A GRANDCHILD: ${baby.name}, born to ${rel.name}. The dynasty put out another branch while you weren't looking.`,
        tone: "milestone",
      });
    }
  }

  // --- The wider tree lives its own life ---
  for (const t of tree) {
    if (!t.alive) continue;
    t.age += 1;
    // They marry
    if (!t.married && t.age >= 23 && randInt(1, 100) <= 8) {
      t.married = true;
      t.spouseName = spouseName();
      pushArchive(
        d,
        c,
        "wedding",
        `${t.name} married ${t.spouseName}.`,
        `wed:${t.id}`,
      );
    }
    // They have children of their own
    if (t.married && t.age >= 24 && t.age <= 42 && tree.length < MAX_TREE) {
      const own = tree.filter((x) => x.parentName === t.name).length;
      if (own < 3 && randInt(1, 100) <= 10) {
        const baby: DescendantRecord = {
          id: uid(),
          name: `${firstName()} ${surnameOf(t.name)}`,
          age: 0,
          alive: true,
          generation: t.generation + 1,
          parentName: t.name,
          branch: t.branch,
        };
        tree.push(baby);
        pushArchive(
          d,
          c,
          "birth",
          `${baby.name} was born to ${t.name}.`,
          `gbirth:${baby.id}`,
        );
      }
    }
    // Time collects everyone
    if (t.age > 82 && randInt(1, 100) <= (t.age - 80) * 2) {
      t.alive = false;
      pushArchive(
        d,
        c,
        "death",
        `${t.name} passed away at ${t.age}.`,
        `gdeath:${t.id}`,
      );
    }
  }

  // --- The tree reaches back to you (flavor only, never a demand) ---
  const living = tree.filter((t) => t.alive);
  if (living.length && randInt(1, 100) <= 12) {
    const t = randItem(living);
    if (t.age >= 18 && t.age <= 24 && randInt(1, 100) <= 50) {
      d.unity = clamp((d.unity ?? 60) + 2);
      c.stats.happiness = clamp(c.stats.happiness + 2);
      log.push({
        age: c.age,
        text: `An invitation in careful handwriting: ${t.name}'s graduation. You sat in the third row and were pointed at during the speech.`,
        tone: "good",
      });
    } else if (
      c.businessHub?.businesses.length &&
      t.age >= 14 &&
      randInt(1, 100) <= 40
    ) {
      c.businessReputation = clamp(c.businessReputation + 1);
      log.push({
        age: c.age,
        text: `${t.name} asked how the family business actually works — and listened to the whole answer. Worth watching, that one.`,
        tone: "good",
      });
    } else {
      c.stats.happiness = clamp(c.stats.happiness + 2);
      log.push({
        age: c.age,
        text: `${t.name} visited unannounced and stayed for dinner. The house liked the noise.`,
        tone: "good",
      });
    }
  }
}

// ---------- Succession: the tree resolves around the heir ----------

/**
 * Called from createHeir. The heir's own background family becomes real:
 * their spouse becomes a partner, their children become actual children with
 * upbringing records. Everyone else stays in the tree as extended family —
 * cousins with names, not just a number.
 */
export function settleFamilyTree(
  dead: Character,
  heir: Character,
  chosen: Relationship | undefined,
  dynasty: Dynasty,
  drama: string[],
) {
  const tree = ensureDescendants(dynasty);
  const rec = chosen
    ? dead.children?.find((k) => k.relId === chosen.id)
    : undefined;

  // The heir's spouse from a background marriage becomes their partner.
  if (rec?.spouseName && chosen) {
    heir.relationships.push({
      id: `partner-${Date.now()}-${randInt(100, 999)}`,
      name: rec.spouseName,
      type: "partner",
      relationship: 70,
      age: Math.max(18, heir.age + randInt(-3, 3)),
      alive: true,
    });
    drama.push(
      `${rec.spouseName} stood beside the heir at the reading. Marriages made in the background hold up in the foreground.`,
    );
  }

  // The heir's background children become real children.
  if (chosen) {
    const own = tree.filter(
      (t) => t.branch === chosen.id && t.parentName === chosen.name && t.alive,
    );
    for (const t of own) {
      const rel: Relationship = {
        id: `child-${Date.now()}-${randInt(100, 999)}-${randInt(10, 99)}`,
        name: t.name,
        type: "child",
        relationship: 80,
        age: t.age,
        alive: true,
      };
      heir.relationships.push(rel);
      ensureChildren(heir);
      const k = heir.children!.find((x) => x.relId === rel.id);
      if (k) {
        k.affection = 65;
        k.resentment = randInt(0, 15);
        k.academics = clamp(randInt(30, 60) + Math.round(t.age * 1.5));
      }
    }
    if (own.length) {
      drama.push(
        `The heir's ${own.length === 1 ? "child" : `${own.length} children`} — ${own.map((t) => t.name.split(" ")[0]).join(", ")} — moved into the house. The next generation was already underway.`,
      );
      // Remove converted children from the tree; their own kids remain as extended family.
      dynasty.descendants = tree.filter((t) => !own.some((o) => o.id === t.id));
    }
  }

  // Everyone left becomes extended family — stale branch ids retagged.
  for (const t of dynasty.descendants ?? []) t.branch = "extended";
  const cousins = (dynasty.descendants ?? []).filter((t) => t.alive).length;
  if (cousins > 0) {
    drama.push(
      `${cousins} relative${cousins === 1 ? "" : "s"} attended the funeral — the extended family, in dark coats, all of them the founder's doing.`,
    );
  }
}
