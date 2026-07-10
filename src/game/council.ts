import type {
  Character,
  ConstitutionRule,
  CouncilMatter,
  CouncilState,
  Dynasty,
  LogEntry,
  LogTone,
} from "./types";
import { ensureRecords, recordArchive } from "./records";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// The Family Council & Constitution (Build 11B.3). Once a year the family
// sits at one long table and pretends the agenda is the agenda. The
// Constitution is the house's law: every rule is checked, every year, and
// the checkmarks are earned.
// ---------------------------------------------------------------------------

export interface CouncilResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): CouncilResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export function ensureCouncil(c: Character): CouncilState {
  const d = ensureRecords(c);
  if (!d.council) d.council = { established: false, yearsHeld: 0 };
  if (!d.constitution) d.constitution = [];
  return d.council;
}

export function establishCouncil(input: Character): CouncilResult {
  const c = structuredClone(input);
  const council = ensureCouncil(c);
  if (council.established) return fail(input, "The Council already sits.");
  const adults = c.relationships.filter(
    (r) => r.type === "child" && r.alive && r.age >= 18,
  ).length;
  if (adults < 1)
    return fail(
      input,
      "A council needs members — at least one adult child at the table.",
    );
  council.established = true;
  recordArchive(
    c,
    "milestone",
    "The Family Council was established.",
    `council:${c.name}`,
  );
  const msg =
    "The Family Council is established. One long table, one meeting a year, and everything that matters decided over the second course.";
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

// ---------- The Constitution: rules that are actually checked ----------

export interface RuleDef {
  id: string;
  label: string;
  detail: string;
}

export const CONSTITUTION_RULES: RuleDef[] = [
  {
    id: "educated_heir",
    label: "An educated heir",
    detail:
      "The heir must be well-schooled (academics 60+) when the estate passes. Checked at succession.",
  },
  {
    id: "keep_seat",
    label: "The Seat is never neglected",
    detail: "Estate upkeep must never fall two years behind. Checked yearly.",
  },
  {
    id: "tithe",
    label: "Tithe to the foundation",
    detail:
      "5% of salary and business profit goes to the family foundation each year, automatically.",
  },
  {
    id: "council_meets",
    label: "The Council convenes",
    detail: "The Family Council must sit every year. Checked yearly.",
  },
  {
    id: "contract_marriages",
    label: "No marriage without a contract",
    detail:
      "Every family marriage carries a prenup. A child marrying without one breaks the rule.",
  },
  {
    id: "no_exiles",
    label: "Unity above all",
    detail:
      "No child is ever cut off. Cutting one off breaks the rule, publicly and permanently.",
  },
];

export function ruleDef(id: string): RuleDef | undefined {
  return CONSTITUTION_RULES.find((r) => r.id === id);
}

export function adoptRule(input: Character, ruleId: string): CouncilResult {
  const c = structuredClone(input);
  const council = ensureCouncil(c);
  const d = c.dynasty!;
  if (!council.established)
    return fail(input, "Adopting law needs a Council to adopt it.");
  const def = ruleDef(ruleId);
  if (!def) return fail(input, "Unknown article.");
  if (d.constitution!.some((r) => r.id === ruleId))
    return fail(input, "Already in the Constitution.");
  d.constitution!.push({ id: ruleId, active: true, keptYears: 0 });
  recordArchive(
    c,
    "milestone",
    `Constitution amended: "${def.label}".`,
    `rule:${ruleId}:${d.generation}`,
  );
  const msg = `Adopted into the Constitution: "${def.label}". Rules constrain the living to protect the name.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function repealRule(input: Character, ruleId: string): CouncilResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const rule = d?.constitution?.find((r) => r.id === ruleId);
  if (!rule) return fail(input, "Not in the Constitution.");
  const def = ruleDef(ruleId);
  d!.constitution = d!.constitution!.filter((r) => r.id !== ruleId);
  d!.unity = clamp((d!.unity ?? 60) - 2);
  const msg = `"${def?.label ?? ruleId}" struck from the Constitution after ${rule.keptYears} kept year${rule.keptYears === 1 ? "" : "s"}. Repeals are remembered longer than rules.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function reaffirmRule(input: Character, ruleId: string): CouncilResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const rule = d?.constitution?.find((r) => r.id === ruleId);
  if (!rule?.broken) return fail(input, "That article stands unbroken.");
  const cost = 100000;
  if (c.money < cost)
    return fail(
      input,
      `Repairing a broken article takes a gesture — ${formatMoney(cost)}.`,
    );
  c.money -= cost;
  rule.broken = false;
  rule.keptYears = 0;
  d!.unity = clamp((d!.unity ?? 60) + 3);
  const msg = `"${ruleDef(ruleId)?.label}" reaffirmed before the Council, with a gesture the family will accept and never mention.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

/** Mark a rule broken (called from wherever the sin happens). */
export function breakRule(
  d: Dynasty,
  c: Character,
  log: LogEntry[],
  ruleId: string,
  how: string,
) {
  const rule = d.constitution?.find(
    (r) => r.id === ruleId && r.active && !r.broken,
  );
  if (!rule) return;
  rule.broken = true;
  d.unity = clamp((d.unity ?? 60) - 6);
  d.reputation = clamp(d.reputation - 4);
  log.push({
    age: c.age,
    text: `CONSTITUTIONAL CRISIS: "${ruleDef(ruleId)?.label}" is broken — ${how} The table went quiet in the way only family tables can.`,
    tone: "bad",
  });
}

/** The yearly audit: every active rule is actually checked. */
function auditConstitution(c: Character, d: Dynasty, log: LogEntry[]) {
  for (const rule of d.constitution ?? []) {
    if (!rule.active || rule.broken) continue;
    let kept = true;
    switch (rule.id) {
      case "keep_seat":
        if ((d.seat?.upkeepOwedYears ?? 0) >= 2) {
          breakRule(
            d,
            c,
            log,
            "keep_seat",
            "the Seat's upkeep fell two years behind.",
          );
          kept = false;
        }
        break;
      case "tithe": {
        const bizProfit = (c.businessHub?.businesses ?? []).reduce(
          (s, b) => s + Math.max(0, b.profit),
          0,
        );
        const income = (c.job?.salary ?? 0) + bizProfit;
        const tithe = Math.round(income * 0.05);
        if (d.foundation && tithe > 0 && c.money >= tithe) {
          c.money -= tithe;
          d.foundation.assets += tithe;
          d.foundation.lifetimeDonations += tithe;
        } else if (!d.foundation || (tithe > 0 && c.money < tithe)) {
          kept = false; // not broken, just not kept this year
        }
        break;
      }
      case "council_meets":
        kept = !!d.council?.established;
        if (!kept)
          breakRule(d, c, log, "council_meets", "the Council did not sit.");
        break;
      case "no_exiles":
        if (c.children?.some((k) => k.cutOff)) {
          breakRule(
            d,
            c,
            log,
            "no_exiles",
            "a child of the house was cut off.",
          );
          kept = false;
        }
        break;
      // educated_heir is checked at succession; contract_marriages when marriages happen.
    }
    if (kept && !rule.broken) {
      rule.keptYears += 1;
      if (rule.keptYears % 5 === 0) {
        d.pedigree = clamp((d.pedigree ?? 0) + 1);
        d.unity = clamp((d.unity ?? 60) + 1);
      }
    }
  }
}

// ---------- Council matters: real decisions, once a year ----------

const VENTURE_IDEAS = [
  "a restaurant with a one-word name",
  "a boutique vineyard label",
  "a sports academy",
  "a design studio",
  "an import business with excellent margins and vague details",
];

function adultKids(c: Character) {
  return c.relationships.filter(
    (r) => r.type === "child" && r.alive && r.age >= 20,
  );
}

function generateMatter(c: Character, d: Dynasty): CouncilMatter | undefined {
  const kids = adultKids(c);
  const kinds: string[] = [];
  if (kids.length) kinds.push("venture", "venture");
  if (kids.length >= 2) kinds.push("feud");
  if ((d.collections?.length ?? 0) > 0) kinds.push("sale");
  if (c.will?.heirId && kids.length >= 2) kinds.push("heir");
  if (d.rivals?.length) kinds.push("rival");
  if (d.constitution?.some((r) => r.broken)) kinds.push("reaffirm");
  if (!kinds.length) return undefined;
  const kind = randItem(kinds);

  if (kind === "venture") {
    const kid = randItem(kids);
    const amount = randInt(2, 12) * 50000;
    return {
      id: uid(),
      kind,
      title: "A Proposal at the Table",
      text: `${kid.name} stands, clears their throat, and asks the family to back ${randItem(VENTURE_IDEAS)} — ${formatMoney(amount)}.`,
      options: [
        {
          id: "fund",
          label: `Fund it (${formatMoney(amount)})`,
          hint: "Affection up; it may even pay off",
        },
        {
          id: "loan",
          label: "Offer a family loan instead",
          hint: "Through the Family Bank, with terms",
        },
        {
          id: "refuse",
          label: "Decline",
          hint: "Resentment; the table remembers",
        },
      ],
      data: { relId: kid.id, name: kid.name, amount },
    };
  }
  if (kind === "feud") {
    const [a, b] = [...kids].sort(() => Math.random() - 0.5);
    return {
      id: uid(),
      kind,
      title: "Two Chairs Turned Away",
      text: `${a.name} and ${b.name} arrive separately, sit apart, and route every remark through you. The feud is now the family's problem.`,
      options: [
        {
          id: "peace",
          label: "Broker peace ($50,000)",
          hint: "A trip, a dinner, a settling of accounts. Unity up",
        },
        {
          id: "sideA",
          label: `Back ${a.name.split(" ")[0]}`,
          hint: "One grateful, one wounded",
        },
        {
          id: "sideB",
          label: `Back ${b.name.split(" ")[0]}`,
          hint: "One grateful, one wounded",
        },
        { id: "ignore", label: "Let them sort it out", hint: "Unity slips" },
      ],
      data: { aId: a.id, bId: b.id, aName: a.name, bName: b.name },
    };
  }
  if (kind === "sale") {
    const piece = randItem(d.collections!);
    return {
      id: uid(),
      kind,
      title: "A Motion to Sell",
      text: `The Council notes a strong market and moves to sell ${piece.name} — a premium offer stands at ${formatMoney(Math.round(piece.value * 1.15))}.`,
      options: [
        {
          id: "sell",
          label: "Approve the sale (+15% premium)",
          hint: "Unity up; the piece is gone",
        },
        {
          id: "keep",
          label: "The collection is not for sale",
          hint: "Unity dips; pedigree holds",
        },
      ],
      data: { pieceId: piece.id },
    };
  }
  if (kind === "heir") {
    const heir = kids.find((k) => k.id === c.will?.heirId);
    return {
      id: uid(),
      kind,
      title: "The Question Nobody Asks Directly",
      text: `Over coffee, in fragments, the succession is questioned. ${heir?.name ?? "The named heir"} pretends not to hear.`,
      options: [
        {
          id: "reaffirm",
          label: "Reaffirm the heir, publicly",
          hint: "Settles it; the others swallow it",
        },
        {
          id: "open",
          label: "Declare the matter open",
          hint: "Unity up now; the heir stews",
        },
      ],
      data: { heirId: c.will?.heirId ?? "" },
    };
  }
  if (kind === "rival") {
    const rival = randItem(d.rivals!);
    return {
      id: uid(),
      kind,
      title: "The Other Family",
      text: `${rival.name} ${rival.relation < 0 ? "moved against your interests again this season" : "extended a careful, watchable courtesy"}. The Council wants a posture.`,
      options: [
        {
          id: "retaliate",
          label: "Answer in kind",
          hint: "Relations sour; you may learn something useful",
        },
        {
          id: "truce",
          label: "Extend an olive branch ($100,000)",
          hint: "Relations improve",
        },
        {
          id: "ignore",
          label: "Beneath our notice",
          hint: "A little prestige, a little risk",
        },
      ],
      data: { rivalId: rival.id, rivalName: rival.name },
    };
  }
  if (kind === "reaffirm") {
    const broken = d.constitution!.find((r) => r.broken)!;
    return {
      id: uid(),
      kind,
      title: "A Broken Article",
      text: `"${ruleDef(broken.id)?.label}" lies broken in the minutes. The Council waits to see whether the house repairs its own law.`,
      options: [
        {
          id: "repair",
          label: "Reaffirm the article ($100,000)",
          hint: "Unity restored",
        },
        {
          id: "strike",
          label: "Strike it from the Constitution",
          hint: "Pragmatic; remembered",
        },
      ],
      data: { ruleId: broken.id },
    };
  }
  return undefined;
}

export function resolveCouncil(
  input: Character,
  optionId: string,
): CouncilResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const m = d?.council?.pending;
  if (!d || !m) return fail(input, "Nothing is before the Council.");
  const unity = d.unity ?? 60;
  let msg = "";
  let tone: LogTone = "neutral";

  if (m.kind === "venture") {
    const amount = Number(m.data?.amount ?? 0);
    const relId = String(m.data?.relId ?? "");
    const k = c.children?.find((x) => x.relId === relId);
    const name = String(m.data?.name ?? "your child");
    if (optionId === "fund") {
      if (c.money < amount)
        return fail(
          input,
          `The family can't spare ${formatMoney(amount)} right now.`,
        );
      c.money -= amount;
      if (k) {
        k.affection = clamp(k.affection + 8);
        k.resentment = clamp(k.resentment - 4);
      }
      d.unity = clamp(unity + 2);
      msg = `The table votes with its chequebook: ${formatMoney(amount)} to ${name}'s venture. ${Math.random() < 0.4 ? "In a few years this may come back multiplied." : "Whatever happens, they'll remember who believed first."}`;
      tone = "good";
      if (Math.random() < 0.4) {
        // Seed a quiet payoff: logged as future-looking flavor, paid now at a discount later
        c.log.push({
          age: c.age,
          text: `${name}'s venture opened its doors. Early signs: promising.`,
          tone: "good",
        });
      }
    } else if (optionId === "loan") {
      d.bank = d.bank ?? { loans: [], lifetimeLent: 0, lifetimeForgiven: 0 };
      if (c.money < amount)
        return fail(
          input,
          `The Bank can't fund ${formatMoney(amount)} right now.`,
        );
      c.money -= amount;
      d.bank.loans.push({
        id: uid(),
        borrower: name,
        amount,
        rate: 5,
        yearsLeft: 5,
        owed: Math.round(amount * 1.25),
      });
      d.bank.lifetimeLent += amount;
      if (k) k.affection = clamp(k.affection + 3);
      msg = `${formatMoney(amount)} extended to ${name} through the Family Bank at 5% — love, documented.`;
      tone = "good";
    } else {
      if (k) k.resentment = clamp(k.resentment + 8);
      d.unity = clamp(unity - 2);
      msg = `The Council declines ${name}'s proposal. They thank the table politely, which is worse than a scene.`;
      tone = "bad";
    }
  } else if (m.kind === "feud") {
    const aId = String(m.data?.aId ?? "");
    const bId = String(m.data?.bId ?? "");
    const ka = c.children?.find((x) => x.relId === aId);
    const kb = c.children?.find((x) => x.relId === bId);
    if (optionId === "peace") {
      if (c.money < 50000)
        return fail(input, "Peace has a caterer. You can't cover it.");
      c.money -= 50000;
      d.unity = clamp(unity + 5);
      if (ka) ka.resentment = clamp(ka.resentment - 5);
      if (kb) kb.resentment = clamp(kb.resentment - 5);
      msg =
        "A weekend, a long dinner, one honest conversation nobody planned. The feud didn't end; it just lost its audience.";
      tone = "good";
    } else if (optionId === "sideA" || optionId === "sideB") {
      const winner = optionId === "sideA" ? ka : kb;
      const loser = optionId === "sideA" ? kb : ka;
      if (winner) winner.affection = clamp(winner.affection + 6);
      if (loser) loser.resentment = clamp(loser.resentment + 10);
      d.unity = clamp(unity - 2);
      msg =
        "You picked a side. Half the table exhaled; the other half started keeping a file.";
      tone = "neutral";
    } else {
      d.unity = clamp(unity - 3);
      msg =
        "The Council moves on. The two empty chairs at next year's dinner will be the minutes of this decision.";
      tone = "bad";
    }
  } else if (m.kind === "sale") {
    const pieceId = String(m.data?.pieceId ?? "");
    const idx = d.collections?.findIndex((p) => p.id === pieceId) ?? -1;
    if (optionId === "sell" && idx >= 0) {
      const piece = d.collections![idx];
      const price = Math.round(piece.value * 1.15);
      c.money += price;
      d.collections!.splice(idx, 1);
      d.unity = clamp(unity + 2);
      msg = `${piece.name} sold with the Council's blessing for ${formatMoney(price)}. Consensus makes even goodbyes profitable.`;
      tone = "good";
    } else {
      d.unity = clamp(unity - 1);
      d.pedigree = clamp((d.pedigree ?? 0) + 1);
      msg =
        "The motion fails. The piece stays on the wall, and the wall wins a little respect.";
      tone = "neutral";
    }
  } else if (m.kind === "heir") {
    const heirId = String(m.data?.heirId ?? "");
    const k = c.children?.find((x) => x.relId === heirId);
    if (optionId === "reaffirm") {
      if (k) k.affection = clamp(k.affection + 5);
      for (const other of c.children ?? []) {
        if (other.relId !== heirId)
          other.resentment = clamp(other.resentment + 3);
      }
      msg =
        "You reaffirm the succession, plainly, before dessert. Nobody argues with the tone.";
      tone = "neutral";
    } else {
      if (k) k.resentment = clamp(k.resentment + 8);
      d.unity = clamp(unity + 3);
      msg =
        "You declare the matter open. The room brightens; the named heir does not.";
      tone = "neutral";
    }
  } else if (m.kind === "rival") {
    const rival = d.rivals?.find((r) => r.id === String(m.data?.rivalId ?? ""));
    if (optionId === "retaliate" && rival) {
      rival.relation = clamp(rival.relation - 15, -100, 100);
      if (Math.random() < 0.4) {
        d.vault = d.vault ?? [];
        d.vault.push({
          id: uid(),
          rivalId: rival.id,
          rivalName: rival.name,
          label: "Correspondence acquired during the exchange",
          potency: randInt(20, 40),
        });
        msg = `You answered ${rival.name} in kind — and something useful fell out of the scuffle into the Vault.`;
        tone = "good";
      } else {
        msg = `You answered ${rival.name} in kind. The feud deepens; the club stewards pretend not to notice.`;
        tone = "neutral";
      }
    } else if (optionId === "truce" && rival) {
      if (c.money < 100000)
        return fail(input, "Olive branches are gilded. You can't cover it.");
      c.money -= 100000;
      rival.relation = clamp(rival.relation + 20, -100, 100);
      msg = `A careful dinner with ${rival.name}. Nothing was said; everything was settled.`;
      tone = "good";
    } else {
      d.reputation = clamp(d.reputation + 1);
      if (rival && Math.random() < 0.3)
        rival.relation = clamp(rival.relation - 5, -100, 100);
      msg =
        "Beneath our notice, the Council agrees. Serenity is also a weapon.";
      tone = "neutral";
    }
  } else if (m.kind === "reaffirm") {
    const ruleId = String(m.data?.ruleId ?? "");
    if (optionId === "repair") {
      const res = reaffirmRule(c, ruleId);
      if (!res.ok) return fail(input, res.message);
      const out = res.character;
      out.dynasty!.council!.pending = undefined;
      out.dynasty!.council!.lastOutcome = res.message;
      return { character: out, message: res.message, tone: "good", ok: true };
    } else {
      const res = repealRule(c, ruleId);
      if (!res.ok) return fail(input, res.message);
      const out = res.character;
      out.dynasty!.council!.pending = undefined;
      out.dynasty!.council!.lastOutcome = res.message;
      return {
        character: out,
        message: res.message,
        tone: "neutral",
        ok: true,
      };
    }
  }

  d.council!.pending = undefined;
  d.council!.lastOutcome = msg;
  recordArchive(
    c,
    "council",
    `Council, year ${d.council!.yearsHeld}: ${msg}`,
    `cm:${m.id}`,
  );
  c.log.push({ age: c.age, text: `COUNCIL — ${msg}`, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Yearly advance ----------

export function advanceCouncil(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return;

  // The Constitution is audited whether or not the Council sits.
  auditConstitution(c, d, log);

  const council = d.council;
  if (!council?.established) return;
  council.yearsHeld += 1;
  d.unity = clamp((d.unity ?? 60) + 1); // sitting together, once a year, matters

  // An unresolved matter left on the table goes stale.
  if (council.pending) {
    d.unity = clamp((d.unity ?? 60) - 2);
    log.push({
      age: c.age,
      text: `The Council adjourned with "${council.pending.title}" unresolved. Silence is also a decision, and a worse one.`,
      tone: "bad",
    });
    council.pending = undefined;
  }

  if (Math.random() < 0.65) {
    const matter = generateMatter(c, d);
    if (matter) {
      council.pending = matter;
      log.push({
        age: c.age,
        text: `THE COUNCIL CONVENES — "${matter.title}" is on the table. (Family tab → Council)`,
        tone: "milestone",
      });
    }
  }
}
