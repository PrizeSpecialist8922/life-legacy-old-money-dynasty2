import type { Character, CollectionItem, LogTone, LogEntry } from "./types";
import { ensureRecords } from "./records";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Luxury Collections (Build 11B). Stored on the Dynasty, so a Vermeer bought
// by the grandmother hangs in the grandson's hall. Art is patient money.
// ---------------------------------------------------------------------------

export interface CollectionResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): CollectionResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export interface CollectionCategoryDef {
  id: string;
  name: string;
  min: number;
  max: number;
  drift: number; // mean annual appreciation %
  pieces: string[];
}

export const COLLECTION_CATEGORIES: CollectionCategoryDef[] = [
  {
    id: "art",
    name: "Fine Art",
    min: 100000,
    max: 50000000,
    drift: 6,
    pieces: [
      "a Dutch Golden Age portrait",
      "a post-war abstract canvas",
      "an Impressionist river scene",
      "a modernist bronze-period sketch",
      "a contested-attribution Old Master",
    ],
  },
  {
    id: "watches",
    name: "Luxury Watches",
    min: 20000,
    max: 3000000,
    drift: 5,
    pieces: [
      "a mid-century perpetual calendar",
      "a hand-wound chronograph, first series",
      "a minute repeater in platinum",
      "a military-issue diver, papers intact",
    ],
  },
  {
    id: "cars",
    name: "Classic Cars",
    min: 80000,
    max: 20000000,
    drift: 5,
    pieces: [
      "a 1960s Italian grand tourer",
      "a pre-war roadster, matching numbers",
      "a homologation special, one of 200",
      "a coachbuilt cabriolet",
    ],
  },
  {
    id: "books",
    name: "Rare Books",
    min: 10000,
    max: 5000000,
    drift: 4,
    pieces: [
      "a first folio leaf",
      "a signed first edition",
      "an illuminated Book of Hours",
      "a suppressed first printing",
    ],
  },
  {
    id: "documents",
    name: "Historical Documents",
    min: 25000,
    max: 8000000,
    drift: 4,
    pieces: [
      "a founding-era letter",
      "a signed treaty draft",
      "an explorer's ship log",
      "a composer's working manuscript",
    ],
  },
  {
    id: "wine",
    name: "Wine Collection",
    min: 15000,
    max: 2000000,
    drift: 7,
    pieces: [
      "a first-growth vertical",
      "a pre-phylloxera claret",
      "a legendary vintage case, provenance sealed",
      "a cult Burgundy allocation",
    ],
  },
  {
    id: "jewelry",
    name: "Jewelry",
    min: 30000,
    max: 15000000,
    drift: 4,
    pieces: [
      "an Art Deco parure",
      "a Golconda diamond ring",
      "a maharaja's emerald brooch",
      "a natural pearl sautoir",
    ],
  },
  {
    id: "sculpture",
    name: "Sculptures",
    min: 50000,
    max: 25000000,
    drift: 5,
    pieces: [
      "a Renaissance bronze",
      "a marble torso, Roman copy",
      "a kinetic modernist piece",
      "a monumental garden figure",
    ],
  },
];

export function collectionCategory(
  id: string,
): CollectionCategoryDef | undefined {
  return COLLECTION_CATEGORIES.find((x) => x.id === id);
}

export function acquirePiece(
  input: Character,
  categoryId: string,
  budget: number,
): CollectionResult {
  const c = structuredClone(input);
  const cat = collectionCategory(categoryId);
  if (!cat) return fail(input, "Unknown category.");
  if (budget < cat.min)
    return fail(input, `${cat.name} starts around ${formatMoney(cat.min)}.`);
  if (budget > cat.max) budget = cat.max;
  if (c.money < budget)
    return fail(input, `You don't have ${formatMoney(budget)}.`);
  const d = ensureRecords(c);
  c.money -= budget;
  const significance = clamp(
    Math.round(20 + (budget / cat.max) * 60 + randInt(-10, 20)),
  );
  const piece: CollectionItem = {
    id: uid(),
    category: cat.id,
    name: `${randItem(cat.pieces)}`,
    value: budget,
    boughtFor: budget,
    significance,
  };
  d.collections!.push(piece);
  const curatorNote =
    significance >= 70
      ? " The curator's report used the word 'important', which in that trade is shouting."
      : "";
  const msg = `Acquired ${piece.name} for ${formatMoney(budget)}.${curatorNote}`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function sellPiece(input: Character, pieceId: string): CollectionResult {
  const c = structuredClone(input);
  const d = ensureRecords(c);
  const idx = d.collections!.findIndex((p) => p.id === pieceId);
  if (idx < 0) return fail(input, "Not in the collection.");
  const p = d.collections![idx];
  const price = Math.round(p.value * (0.85 + randInt(0, 20) / 100));
  c.money += price;
  d.collections!.splice(idx, 1);
  const gained = price - p.boughtFor;
  const msg = `${p.name} sold at auction for ${formatMoney(price)} (${gained >= 0 ? "+" : ""}${formatMoney(gained)} on cost). Every sale is a small obituary.`;
  c.log.push({ age: c.age, text: msg, tone: gained >= 0 ? "good" : "neutral" });
  return {
    character: c,
    message: msg,
    tone: gained >= 0 ? "good" : "neutral",
    ok: true,
  };
}

export function collectionsValue(c: Character): number {
  return (c.dynasty?.collections ?? []).reduce((s, p) => s + p.value, 0);
}

export function collectionsPrestige(c: Character): number {
  const items = c.dynasty?.collections ?? [];
  if (!items.length) return 0;
  return Math.min(
    25,
    Math.round(
      items.length * 1.5 + items.filter((p) => p.significance >= 70).length * 3,
    ),
  );
}

export function advanceCollections(c: Character, log: LogEntry[]) {
  const items = c.dynasty?.collections;
  if (!items?.length) return;
  const curator = c.lifestyle?.staff.find((s) => s.role === "curator");
  const sommelier = c.lifestyle?.staff.find((s) => s.role === "sommelier");
  for (const p of items) {
    const cat = collectionCategory(p.category);
    let drift = (cat?.drift ?? 5) + randInt(-4, 5);
    if (curator && p.category !== "wine") drift += curator.competence / 50;
    if (sommelier && p.category === "wine") drift += sommelier.competence / 40;
    p.value = Math.max(1000, Math.round(p.value * (1 + drift / 100)));
    p.significance = clamp(p.significance + (Math.random() < 0.1 ? 1 : 0));
  }
  if (Math.random() < 0.08) {
    const p = randItem(items);
    const jump = randInt(15, 40);
    p.value = Math.round(p.value * (1 + jump / 100));
    log.push({
      age: c.age,
      text: `A comparable piece to ${p.name} made headlines at auction — yours re-appraised +${jump}%.`,
      tone: "good",
    });
  }
}
