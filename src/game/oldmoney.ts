import type { Character, Dynasty, FamilySin, LogEntry, LogTone } from "./types";
import { ensureDynasty } from "./legacy";
import { clamp, randInt, randItem } from "./util";

// ---------------------------------------------------------------------------
// Old Money (Build 16). New money spends; old money curates. Pedigree is the
// score only time can buy, the Seat is the dynasty made of stone, the Trust
// is armor against your own descendants, and every fortune has a first
// chapter nobody reads aloud.
// ---------------------------------------------------------------------------

export interface OldMoneyResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): OldMoneyResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

type Spend = (c: Character) => boolean;

export function ensurePedigree(d: Dynasty): Dynasty {
  if (d.pedigree === undefined) d.pedigree = 0;
  if (!d.patronage) d.patronage = [];
  return d;
}

// ---------- The Family Sin ----------

const SINS: { text: string; severity: number }[] = [
  {
    text: "The founding fortune came from insurance money on a warehouse fire that was no accident — and a night watchman was inside.",
    severity: 9,
  },
  {
    text: "The family name is not the family's. It was taken from a dead man on a ship's manifest in 1923, along with his papers and his savings.",
    severity: 7,
  },
  {
    text: "The first great land purchase was made with a forged deed. The family it was taken from went north, then nowhere.",
    severity: 8,
  },
  {
    text: "The founder's brother did not drown by accident. The inheritance did not split by accident either.",
    severity: 10,
  },
  {
    text: "The company's first fortune was made selling diluted medicine during an epidemic. The ledger from that year is the one that's missing.",
    severity: 8,
  },
  {
    text: "The founder informed on his partners to the authorities and bought their shares at auction with a bank loan arranged by the same authorities.",
    severity: 7,
  },
];

export function ensureSin(c: Character): FamilySin {
  const d = ensurePedigree(ensureDynasty(c));
  if (!d.sin) {
    const s = randItem(SINS);
    d.sin = {
      text: s.text,
      severity: s.severity,
      sealed: true,
      known: false,
      exposure: 0,
      detonated: false,
    };
  }
  return d.sin;
}

export function openTheRoom(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const sin = ensureSin(c);
  if (sin.known) return fail(input, "You already know. You can't un-know.");
  sin.known = true;
  sin.sealed = false;
  const msg = `You opened the room. Now you know: ${sin.text} You will carry this. There may be uses for it — and costs.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  c.stats.happiness = clamp(c.stats.happiness - 5);
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function payQuietCosts(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const sin = c.dynasty?.sin;
  if (!sin || sin.exposure <= 0) return fail(input, "Nothing is stirring. Let it sleep.");
  const cost = 10000 + sin.exposure * 800;
  if (c.money < cost)
    return fail(input, `Keeping it quiet costs $${cost.toLocaleString()} this time.`);
  c.money -= cost;
  sin.exposure = clamp(sin.exposure - randInt(20, 35), 0, 100);
  const msg = `$${cost.toLocaleString()} moved quietly and the historian's book found a different subject. The seal holds — for now.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- The Family Seat ----------

const SEAT_NAMES = [
  "Ravenshall",
  "Thornfield",
  "Ashcombe",
  "Halloway House",
  "The Cedars",
  "Wrenmoor",
  "Blackwood Hall",
];

export function acquireSeat(
  input: Character,
  name: string | undefined,
  spend: Spend,
): OldMoneyResult {
  const c = structuredClone(input);
  const d = ensurePedigree(ensureDynasty(c));
  if (d.seat) return fail(input, `The family already has its Seat: ${d.seat.name}.`);
  const price = 2500000;
  if (c.money < price)
    return fail(input, `A house worthy of a dynasty starts at $${price.toLocaleString()}.`);
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  c.money -= price;
  d.seat = {
    name: name?.trim() || randItem(SEAT_NAMES),
    value: price,
    housePrestige: 5,
    yearsHeld: 0,
    upkeepOwedYears: 0,
    closedWings: 0,
    paintingsSold: 0,
    portraits: [],
    ancestorInvoked: false,
  };
  d.pedigree = clamp((d.pedigree ?? 0) + 5);
  const seatName = d.seat.name;
  const msg = `${seatName} belongs to the family now — not an asset, an anchor. Weddings, funerals, and the reading of wills happen here from now on.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function sellSeat(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  if (!d?.seat) return fail(input, "There is no Seat to sell.");
  const proceeds = Math.round(d.seat.value * 0.95);
  c.money += proceeds;
  const name = d.seat.name;
  d.seat = undefined;
  d.pedigree = clamp((d.pedigree ?? 0) - 25);
  d.reputation = clamp(d.reputation - 15);
  const msg = `${name} was sold for $${proceeds.toLocaleString()}. Strangers live there now. In certain rooms in this city, the family will be spoken of in the past tense for a generation.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function commissionPortrait(
  input: Character,
  emphasis: string,
  tier: number,
  spend: Spend,
): OldMoneyResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  if (!d?.seat) return fail(input, "Portraits hang at the Seat. Acquire one first.");
  if (d.seat.portraits.some((p) => p.generation === d.generation))
    return fail(input, "This generation's portrait already hangs.");
  const fees = [50000, 150000, 500000];
  const fee = fees[clamp(tier, 0, 2)];
  if (c.money < fee) return fail(input, `The painter's fee is $${fee.toLocaleString()}.`);
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  c.money -= fee;
  d.seat.portraits.push({ name: c.name, generation: d.generation, emphasis, tier });
  d.seat.housePrestige = clamp(d.seat.housePrestige + 3 + tier * 2);
  d.pedigree = clamp((d.pedigree ?? 0) + 1 + tier);
  const msg = `Your portrait now hangs in the hall at ${d.seat.name} — the ${emphasis} prominent, as instructed. Future generations will stand in front of it and wonder.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function invokeAncestor(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  if (!d?.seat) return fail(input, "The portraits hang at the Seat.");
  if (!d.ancestors.length) return fail(input, "The hall is empty — you ARE the ancestor.");
  if (d.seat.ancestorInvoked)
    return fail(input, "Once per lifetime. The hall has given what it gives.");
  d.seat.ancestorInvoked = true;
  const a = d.ancestors[d.ancestors.length - 1];
  let msg = `You stood before ${a.name}'s portrait a long time. ${a.headline}. `;
  const h = a.headline.toLowerCase();
  if (h.includes("hall of fame") || h.includes("champion")) {
    if (c.athlete) c.athlete.fitness = clamp(c.athlete.fitness + 15);
    c.stats.health = clamp(c.stats.health + 8);
    msg += "Something of their iron settled into you.";
  } else if (h.includes("nation") || h.includes("public service")) {
    if (c.politics) {
      c.politics.reputation = clamp(c.politics.reputation + 12);
      c.politics.partySupport = clamp(c.politics.partySupport + 10);
    }
    c.fame += 2;
    msg += "You left the hall carrying their name like a mandate.";
  } else if (h.includes("criminal") || h.includes("witness")) {
    if (c.crime) c.crime.notoriety = clamp(c.crime.notoriety + 12);
    msg +=
      "Their old associates will hear you stood there. That means something, in certain rooms.";
  } else if (h.includes("business") || h.includes("wealthy")) {
    c.businessReputation = clamp(c.businessReputation + 12);
    msg += "You walked out ready to negotiate like the dead.";
  } else {
    c.stats.happiness = clamp(c.stats.happiness + 10);
    msg += "They lived a full life. So can you. It helped, somehow.";
  }
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- The Trust ----------

export function createTrust(
  input: Character,
  allowancePct: number,
  conditions: { cleanRecord: boolean; mustGraduate: boolean; seatEntailed: boolean },
): OldMoneyResult {
  const c = structuredClone(input);
  const d = ensurePedigree(ensureDynasty(c));
  if (d.trust)
    return fail(
      input,
      "The trust already exists. It outlives everyone's opinions, including yours.",
    );
  if (c.age < 40)
    return fail(input, "Trusts are for people who've begun to see the end of the board. Age 40+.");
  if (c.money < 2000000)
    return fail(input, "A trust needs at least $2,000,000 of corpus to be worth its lawyers.");
  const corpus = Math.round(c.money * 0.8);
  c.money -= corpus;
  d.trust = {
    corpus,
    createdGen: d.generation,
    allowancePct: clamp(allowancePct, 2, 8),
    conditions,
    challengedOnce: false,
  };
  d.pedigree = clamp((d.pedigree ?? 0) + 8);
  const msg = `The ${d.familyName} Family Trust is executed: $${corpus.toLocaleString()} locked behind your rules${conditions.seatEntailed && d.seat ? `, ${d.seat.name} entailed forever` : ""}. Your heirs will draw an allowance and live under your dead hand — estate tax, lawsuits, and their own worst instincts can't touch the corpus.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function challengeTrust(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  if (!d?.trust) return fail(input, "There's no trust to break.");
  if (d.trust.createdGen === d.generation)
    return fail(input, "You wrote it. Breaking your own trust is just called spending.");
  if (d.trust.challengedOnce)
    return fail(input, "The courts have ruled once. They will not entertain the family again.");
  d.trust.challengedOnce = true;
  const lawyer = c.contacts?.some((x) => x.type === "lawyer" && x.relationship >= 50);
  const chance = clamp(20 + c.stats.smarts * 0.3 + (lawyer ? 15 : 0), 5, 70);
  if (randInt(1, 100) <= chance) {
    c.money += d.trust.corpus;
    const amt = d.trust.corpus;
    d.trust = undefined;
    d.reputation = clamp(d.reputation - 10);
    d.pedigree = clamp((d.pedigree ?? 0) - 8);
    const msg = `The court broke the trust. $${amt.toLocaleString()} is yours outright — and the fight was in every paper. Somewhere, the ancestor who wrote it is turning in a very well-appointed grave.`;
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  d.reputation = clamp(d.reputation - 6);
  const msg =
    "Petition denied. The dead hand holds, the allowance continues, and the lawyers sent flowers with their invoice.";
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

// ---------- Patronage ----------

export const ENDOWMENTS = [
  { id: "prize", label: "Endow a Prize", cost: 500000 },
  { id: "wing", label: "Hospital Wing", cost: 1000000 },
  { id: "chair", label: "University Chair", cost: 2000000 },
  { id: "gallery", label: "Museum Gallery", cost: 3000000 },
];

export function endow(input: Character, endowmentId: string, spend: Spend): OldMoneyResult {
  const c = structuredClone(input);
  const d = ensurePedigree(ensureDynasty(c));
  const e = ENDOWMENTS.find((x) => x.id === endowmentId);
  if (!e) return fail(input, "Unknown endowment.");
  if (c.money < e.cost) return fail(input, `${e.label} requires $${e.cost.toLocaleString()}.`);
  if ((d.patronage ?? []).includes(e.label))
    return fail(input, "The family's name is already on one of those.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  c.money -= e.cost;
  d.patronage = [...(d.patronage ?? []), e.label];
  d.pedigree = clamp((d.pedigree ?? 0) + 5);
  d.reputation = clamp(d.reputation + 4);
  const msg = `The ${d.familyName} ${e.label.replace("Endow a ", "")} exists now, in stone and in perpetuity. It will outlive every balance sheet you ever fretted over — which was, of course, the point.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- The Dowager ----------

export function visitDowager(input: Character, spend: Spend): OldMoneyResult {
  const c = structuredClone(input);
  const dw = c.dowager;
  if (!dw?.alive) return fail(input, "There is no Dowager to call on.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  dw.yearsSinceVisit = 0;
  dw.relationship = clamp(dw.relationship + randInt(8, 14));
  c.networking = clamp((c.networking ?? 0) + 4);
  if (c.society?.member) c.society.standing = clamp(c.society.standing + 3);
  let msg = `Tea with ${dw.name}. Two hours, one raised eyebrow that reorganized your entire strategy, and introductions money cannot buy.`;
  if (dw.relationship >= 60 && dw.loreShared < 3 && Math.random() < 0.5) {
    dw.loreShared += 1;
    const lore = [
      `"Your grandfather never trusted the Ashfords. He was right, incidentally."`,
      `"The east wing was closed in '61 for reasons your father invented a better story for."`,
      `"There is a box in the attic of ${c.dynasty?.seat?.name ?? "the old house"} that you should open before I die. Or possibly just after."`,
    ];
    msg += ` And then, over the second pot: ${lore[dw.loreShared - 1] ?? randItem(lore)}`;
    if (c.dynasty?.sin && !c.dynasty.sin.known && dw.loreShared >= 3) {
      msg += " She knows. She's known the whole time.";
    }
  }
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Genteel Poverty (losing it beautifully) ----------

export function closeWing(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const seat = c.dynasty?.seat;
  if (!seat) return fail(input, "There is no Seat.");
  if (seat.closedWings >= 2)
    return fail(
      input,
      "The family already lives in a third of the house. There is nothing left to close but the front door.",
    );
  seat.closedWings += 1;
  seat.housePrestige = clamp(seat.housePrestige - 2);
  const msg =
    seat.closedWings === 1
      ? `The east wing is closed — dust sheets over the furniture, one radiator left on for the pipes. Upkeep halves. Guests are received in the rooms that remain, with the manner fully intact.`
      : `The second wing closes. The family now occupies the old heart of ${seat.name}, which the staff — the one remaining member of it — keeps immaculate. Poverty is arriving; vulgarity is not.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

const PAINTINGS = [
  "the Turner",
  "the small Sargent",
  "grandmother's Whistler",
  "the disputed Vermeer",
  "the hunting Stubbs",
  "the portrait attributed to Lawrence",
];

export function sellPainting(input: Character): OldMoneyResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const seat = d?.seat;
  if (!seat) return fail(input, "The paintings hang at the Seat.");
  if (seat.paintingsSold >= PAINTINGS.length)
    return fail(
      input,
      "The walls are bare rectangles of brighter wallpaper. There is nothing left to sell.",
    );
  const name = PAINTINGS[seat.paintingsSold];
  seat.paintingsSold += 1;
  const price = randInt(150000, 600000);
  c.money += price;
  d!.pedigree = clamp((d!.pedigree ?? 0) - 2);
  seat.housePrestige = clamp(seat.housePrestige - 1);
  const msg = `${name.charAt(0).toUpperCase() + name.slice(1)} left on a Tuesday, in a truck, for $${price.toLocaleString()}. Nothing was said at dinner. The rectangle on the wall says it nightly.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

/** The great unfinished business: buying back what the family lost. */
export function buyBackSeat(input: Character, spend: Spend): OldMoneyResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  if (!d?.lostSeat) return fail(input, "The family never lost a Seat. May it stay that way.");
  if (d.seat) return fail(input, "The family has a Seat. The old one is someone else's story now.");
  const price = Math.round(d.lostSeat.price * 1.5);
  if (c.money < price)
    return fail(
      input,
      `The current owners know exactly who you are and exactly why you're calling. The price is $${price.toLocaleString()}.`,
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  c.money -= price;
  d.seat = {
    name: d.lostSeat.name,
    value: price,
    housePrestige: 15,
    yearsHeld: 0,
    upkeepOwedYears: 0,
    closedWings: 0,
    paintingsSold: 0,
    portraits: [],
    ancestorInvoked: false,
  };
  const name = d.lostSeat.name;
  d.lostSeat = undefined;
  d.pedigree = clamp((d.pedigree ?? 0) + 20);
  d.reputation = clamp(d.reputation + 12);
  const msg = `${name.toUpperCase()} IS OURS AGAIN. You paid half again what it was worth and would have paid triple. The keys are the same keys. Somewhere, every ancestor in the hall exhales. The dynasty's great unfinished business is finished.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- Yearly ----------

export function advanceOldMoney(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return;
  ensurePedigree(d);

  // The Seat: upkeep, prestige, and the slow arithmetic of belonging.
  if (d.seat) {
    const upkeep = Math.round(
      d.seat.value * 0.015 * (d.seat.closedWings === 0 ? 1 : d.seat.closedWings === 1 ? 0.5 : 0.3),
    );
    if (c.money >= upkeep) {
      c.money -= upkeep;
      d.seat.upkeepOwedYears = 0;
      d.seat.yearsHeld += 1;
      d.seat.housePrestige = clamp(d.seat.housePrestige + 1);
      if (d.seat.yearsHeld % 10 === 0) {
        d.pedigree = clamp((d.pedigree ?? 0) + 3);
        log.push({
          age: c.age,
          text: `${d.seat.name}: ${d.seat.yearsHeld} years in the family. The house is becoming the kind of fact people are born into.`,
          tone: "good",
        });
      }
    } else {
      d.seat.upkeepOwedYears += 1;
      log.push({
        age: c.age,
        text: `${d.seat.name}'s upkeep went unpaid (${d.seat.upkeepOwedYears}/3). The roof knows. Soon the bank will.`,
        tone: "bad",
      });
      const grace = d.seat.closedWings > 0 ? 5 : 3; // dignified retreat buys time
      if (d.seat.upkeepOwedYears >= grace) {
        const name = d.seat.name;
        const value = d.seat.value;
        c.money += Math.round(value * 0.6);
        d.lostSeat = { name, price: value };
        d.seat = undefined;
        d.pedigree = clamp((d.pedigree ?? 0) - 30);
        d.reputation = clamp(d.reputation - 20);
        log.push({
          age: c.age,
          text: `THE BANK TOOK ${name.toUpperCase()}. Sixty cents on the dollar and a century of standing, gone in an afternoon. Buying it back someday is now the dynasty's great unfinished business — the game remembers the address.`,
          tone: "bad",
        });
      }
    }
  }

  // Trust allowance flows to the current generation.
  if (d.trust && d.trust.createdGen !== d.generation) {
    let draw = Math.round(d.trust.corpus * (d.trust.allowancePct / 100));
    let note = "";
    if (d.trust.conditions.cleanRecord && c.criminalRecord > 0) {
      draw = Math.round(draw / 2);
      note =
        " (halved — the clean-record clause; the trustees enclosed a newspaper clipping, without comment)";
    }
    if (d.trust.conditions.mustGraduate && c.age >= 25 && c.education !== "graduated") {
      draw = Math.round(draw / 2);
      note += " (halved again — the education clause)";
    }
    c.money += draw;
    d.trust.corpus = Math.round(d.trust.corpus * 1.04); // professionally managed
    log.push({
      age: c.age,
      text: `Trust allowance: $${draw.toLocaleString()}${note}. The corpus grows regardless of you: $${d.trust.corpus.toLocaleString()}.`,
      tone: "neutral",
    });
  }

  // Pedigree erosion: loudness is noticed.
  if (c.fame > 40 && Math.random() < 0.3) {
    d.pedigree = clamp((d.pedigree ?? 0) - 1);
  }

  // The Sin ticks.
  if (d.sin && !d.sin.detonated) {
    if (Math.random() < 0.08) {
      d.sin.exposure = clamp(d.sin.exposure + randInt(10, 25), 0, 100);
      const stirs = [
        "A university historian has requested access to the family's early papers. Again. More insistently.",
        "A descendant of certain old associates has been asking around, politely, with a lawyer's patience.",
        "An archivist found a ledger page everyone believed burned. It's for sale, discreetly.",
        "A podcast has started a season on the city's founding fortunes. Episode four has a familiar shape.",
      ];
      log.push({
        age: c.age,
        text: `${randItem(stirs)} (The old matter stirs — exposure rising. The Legacy tab has options.)`,
        tone: "bad",
      });
    }
    if (d.sin.exposure >= 100) {
      d.sin.detonated = true;
      d.sin.known = true;
      d.reputation = clamp(d.reputation - 40);
      d.pedigree = clamp((d.pedigree ?? 0) - 25);
      c.fame += 8;
      log.push({
        age: c.age,
        text: `IT ALL CAME OUT: ${d.sin.text} Front page, then every page. The family name means something different now, and will for a generation.`,
        tone: "bad",
      });
    }
  }

  // The Dowager ages, remembers, and is not to be neglected.
  if (c.dowager?.alive) {
    const dw = c.dowager;
    dw.age += 1;
    dw.yearsSinceVisit += 1;
    if (dw.yearsSinceVisit === 5) {
      dw.relationship = clamp(dw.relationship - 20);
      log.push({
        age: c.age,
        text: `${dw.name} has noticed she is visited by everyone except you. Her opinions travel further than yours do.`,
        tone: "bad",
      });
      d.reputation = clamp(d.reputation - 3);
    }
    if (dw.age > 78 && Math.random() < (dw.age - 78) / 25) {
      dw.alive = false;
      c.stats.happiness = clamp(c.stats.happiness - 8);
      log.push({
        age: c.age,
        text: `${dw.name} died at ${dw.age}, at ${d.seat?.name ?? "home"}, holding court to the last. The family's memory has lost its keeper. The funeral filled the church twice over.`,
        tone: "bad",
      });
      if (d.seat) d.seat.housePrestige = clamp(d.seat.housePrestige + 3);
    }
  }
}

// ---------- The Third-Generation Curse (read at inheritance) ----------

export function curseAssessment(
  spoiled: number,
  grit: number,
  generation: number,
): { gilded: boolean; line: string | null } {
  if (generation < 3) return { gilded: false, line: null };
  if (spoiled >= 60 && grit < 45)
    return {
      gilded: true,
      line: "Shirtsleeves to shirtsleeves in three generations, they say. This heir was raised inside the bubble — soft hands, borrowed hunger. The Curse is real, and it is now their problem.",
    };
  if (spoiled < 35 && grit >= 55)
    return {
      gilded: false,
      line: "Third generation — the one that usually loses it all. Not this one. Someone made this heir earn things on purpose, and it shows.",
    };
  return { gilded: false, line: null };
}
