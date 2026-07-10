import type {
  Character,
  Dynasty,
  LogEntry,
  LogTone,
  RivalDynasty,
} from "./types";
import { ensureRecords, recordArchive } from "./records";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Rival Dynasties & The Vault (Build 11B.3). Every old family has an
// opposite number. The rivalry is conducted in auction paddles, board votes
// and seating charts — and, when necessary, in what the Vault knows.
// ---------------------------------------------------------------------------

export interface RivalResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): RivalResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

const RIVAL_NAMES = [
  "the Ashworths",
  "the Hallorans",
  "the Pemberton-Vales",
  "the Ostrowskis",
  "the Delacroix-Mays",
  "the Winterbournes",
  "the Cavanaghs",
  "the Montrose-Blackwoods",
];

const LEVERAGE_LABELS = [
  "Ledger pages that shouldn't exist",
  "A witness to the boathouse incident",
  "Correspondence with a very wrong address",
  "The original survey of the disputed land",
  "A donation that bought exactly what it looked like it bought",
  "Photographs from the regatta afterparty",
];

export function ensureRivals(c: Character): RivalDynasty[] {
  const d = ensureRecords(c);
  if (!d.rivals) d.rivals = [];
  if (!d.vault) d.vault = [];
  if (d.rivals.length === 0 && (d.reputation >= 50 || d.seat)) {
    const picks = [...RIVAL_NAMES].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const name of picks) {
      d.rivals.push({
        id: uid(),
        name,
        wealth: randInt(20, 200) * 1000000,
        prestige: randInt(40, 75),
        relation: randInt(-40, 10),
        leverageOnYou: 0,
      });
    }
  }
  return d.rivals;
}

export function investigateRival(
  input: Character,
  rivalId: string,
  spend: (c: Character) => boolean,
): RivalResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const rival = d?.rivals?.find((r) => r.id === rivalId);
  if (!rival) return fail(input, "No such family worth the trouble.");
  const cost = 250000;
  if (c.money < cost)
    return fail(input, `Discreet inquiries run ${formatMoney(cost)}.`);
  if (!spend(c)) return fail(input, "No energy left this year.");
  c.money -= cost;
  const chance = clamp(35 + (c.networking ?? 0) / 2, 20, 85);
  if (randInt(1, 100) > chance) {
    // A botched inquiry teaches them about you.
    rival.relation = clamp(rival.relation - 8, -100, 100);
    rival.leverageOnYou = clamp(rival.leverageOnYou + 5);
    const msg = `The inquiry into ${rival.name} was noticed. Nothing gained; a little lost. They now return your Christmas card unopened.`;
    c.log.push({ age: c.age, text: msg, tone: "bad" });
    return { character: c, message: msg, tone: "bad", ok: true };
  }
  const item = {
    id: uid(),
    rivalId: rival.id,
    rivalName: rival.name,
    label: randItem(LEVERAGE_LABELS),
    potency: randInt(20, 60),
  };
  d!.vault!.push(item);
  const msg = `Into the Vault: ${item.label.toLowerCase()} concerning ${rival.name} (potency ${item.potency}). Filed, sealed, and patient.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export type LeverageUse = "scandal" | "board" | "relation" | "marriage";

export function useLeverage(
  input: Character,
  itemId: string,
  use: LeverageUse,
): RivalResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const idx = d?.vault?.findIndex((v) => v.id === itemId) ?? -1;
  if (!d || idx < 0) return fail(input, "The Vault doesn't hold that.");
  const item = d.vault![idx];
  const rival = d.rivals?.find((r) => r.id === item.rivalId);
  let msg = "";
  let tone: LogTone = "good";

  if (use === "scandal") {
    if (!d.press?.active)
      return fail(input, "There's no story running to kill.");
    d.press.active = undefined;
    d.press.suppressed += 1;
    msg = `One phone call, one folder from the Vault, and the story about your family died mid-print — replaced, curiously, by one about ${item.rivalName}.`;
    if (rival) rival.relation = clamp(rival.relation - 20, -100, 100);
  } else if (use === "board") {
    if (!c.boards?.length)
      return fail(input, "You hold no board seats to strengthen.");
    const seat = randItem(c.boards);
    seat.influence = clamp(seat.influence + item.potency / 2);
    msg = `A quiet word before the vote at ${seat.org}. ${item.rivalName}'s candidate withdrew for personal reasons. Influence +${Math.round(item.potency / 2)}.`;
    if (rival) rival.relation = clamp(rival.relation - 15, -100, 100);
  } else if (use === "relation") {
    if (!rival) return fail(input, "That family is beyond reach.");
    rival.relation = clamp(
      rival.relation + Math.round(item.potency * 0.8),
      -100,
      100,
    );
    rival.leverageOnYou = clamp(rival.leverageOnYou - 10);
    msg = `You showed ${rival.name} exactly what the Vault holds — then locked it again. Détente, on your terms.`;
    tone = "neutral";
  } else if (use === "marriage") {
    // Guarantee the next arranged courtship with this rival succeeds.
    const kid = c.children?.find(
      (k) => k.courtship && k.courtship.targetRivalId === item.rivalId,
    );
    if (!kid)
      return fail(
        input,
        `No courtship with ${item.rivalName} is in progress to secure.`,
      );
    kid.courtship!.yearsLeft = 0;
    (kid.courtship as { assured?: boolean }).assured = true;
    msg = `${item.rivalName} discovered, mid-negotiation, how much you know. The match was suddenly, warmly agreeable.`;
  }

  d.vault!.splice(idx, 1);
  recordArchive(c, "rival", msg, `lev:${item.id}`);
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Yearly advance ----------

export function advanceRivals(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return;
  ensureRivals(c);
  if (!d.rivals?.length) return;

  for (const rival of d.rivals) {
    rival.wealth = Math.round(rival.wealth * (1 + randInt(-3, 6) / 100));
    rival.prestige = clamp(rival.prestige + randInt(-2, 2));

    // They study you as your profile rises — the Family Sin makes it easy.
    if (
      d.sin &&
      !d.sin.detonated &&
      d.sin.exposure > 40 &&
      Math.random() < 0.2
    ) {
      rival.leverageOnYou = clamp(rival.leverageOnYou + randInt(5, 12));
      log.push({
        age: c.age,
        text: `${rival.name} have been asking careful questions in the right rooms. The Vault suspects they're building a file.`,
        tone: "bad",
      });
    }

    // Blackmail: enough leverage, bad relations, and they use it.
    if (
      rival.leverageOnYou >= 40 &&
      rival.relation < -20 &&
      Math.random() < 0.25
    ) {
      const demand = Math.min(Math.round(c.money * 0.05), 2000000);
      if (demand > 50000 && c.money >= demand) {
        c.money -= demand;
        rival.leverageOnYou = clamp(rival.leverageOnYou - 25);
        log.push({
          age: c.age,
          text: `A courtesy note from ${rival.name} referencing what they know, and a charitable cause of theirs that welcomed ${formatMoney(demand)}. You paid. This time.`,
          tone: "bad",
        });
      } else {
        d.reputation = clamp(d.reputation - 4);
        rival.leverageOnYou = clamp(rival.leverageOnYou - 15);
        log.push({
          age: c.age,
          text: `${rival.name} let something slip at a dinner that traveled. The family's name took the hit.`,
          tone: "bad",
        });
      }
    }

    // Open contests: auctions and committee fights.
    if (Math.random() < 0.15 && rival.relation < 20) {
      if ((d.collections?.length ?? 0) > 0 && Math.random() < 0.5) {
        const piece = randItem(d.collections!);
        piece.value = Math.round(piece.value * 1.08);
        log.push({
          age: c.age,
          text: `${rival.name} bid against the family at auction out of pure spite — and drove your ${piece.name} comparables up 8%. Thank them never.`,
          tone: "good",
        });
      } else if (c.boards?.length) {
        const seat = randItem(c.boards);
        seat.influence = clamp(seat.influence - 4);
        log.push({
          age: c.age,
          text: `${rival.name} outmaneuvered you on a committee at ${seat.org}. A small cut; they collect those.`,
          tone: "bad",
        });
      }
    }

    // Marriage alliances soften everything.
    if (rival.alliedByMarriage) {
      rival.relation = clamp(rival.relation + 2, -100, 100);
      rival.leverageOnYou = clamp(rival.leverageOnYou - 3);
    }
  }
}
