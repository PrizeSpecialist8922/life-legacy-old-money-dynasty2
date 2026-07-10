import type { Character, Dynasty, LogEntry, LogTone } from "./types";
import { ensureRecords, recordArchive } from "./records";
import { clamp, formatMoney, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// The Family Bank, the Family Office & the Society Pages (Build 11B.3).
// Money managed, relatives financed, stories killed. The office costs a
// percentage and earns its keep; the press costs nothing and takes plenty.
// ---------------------------------------------------------------------------

export interface BankResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): BankResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export function ensureBank(c: Character) {
  const d = ensureRecords(c);
  if (!d.bank) d.bank = { loans: [], lifetimeLent: 0, lifetimeForgiven: 0 };
  if (!d.press) d.press = { suppressed: 0, weathered: 0 };
  if (!d.office)
    d.office = { tier: 0, feesPaid: 0, earned: 0, scandalsKilled: 0 };
  return d.bank;
}

// ---------- Family Bank ----------

const LOAN_REASONS = [
  "a first house in a neighborhood with opinions",
  "a business that needs one more year",
  "a medical bill nobody planned for",
  "a divorce that got expensive",
  "a renovation that found problems behind the walls",
  "tuition for a school with ivy in the brochure",
];

export function approveLoan(input: Character, rate: number): BankResult {
  const c = structuredClone(input);
  const bank = ensureBank(c);
  const req = bank.pendingRequest;
  if (!req) return fail(input, "Nobody is at the Bank's window.");
  if (c.money < req.amount)
    return fail(
      input,
      `The Bank can't fund ${formatMoney(req.amount)} right now.`,
    );
  const r = clamp(rate, 0, 10);
  c.money -= req.amount;
  bank.loans.push({
    id: uid(),
    borrower: req.borrower,
    amount: req.amount,
    rate: r,
    yearsLeft: 5,
    owed: Math.round(req.amount * (1 + (r / 100) * 5)),
  });
  bank.lifetimeLent += req.amount;
  bank.pendingRequest = undefined;
  c.dynasty!.unity = clamp((c.dynasty!.unity ?? 60) + (r === 0 ? 3 : 1));
  const msg = `${formatMoney(req.amount)} to ${req.borrower} at ${r}% over five years — for ${req.reason}. The Family Bank stamps quietly.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function giftInstead(input: Character): BankResult {
  const c = structuredClone(input);
  const bank = ensureBank(c);
  const req = bank.pendingRequest;
  if (!req) return fail(input, "Nobody is at the Bank's window.");
  if (c.money < req.amount)
    return fail(input, `You can't spare ${formatMoney(req.amount)}.`);
  c.money -= req.amount;
  bank.lifetimeForgiven += req.amount;
  bank.pendingRequest = undefined;
  c.dynasty!.unity = clamp((c.dynasty!.unity ?? 60) + 4);
  const msg = `${formatMoney(req.amount)} to ${req.borrower}, no papers, no terms. "Pay it forward" was said; both of you knew it meant "never mention this."`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function refuseLoan(input: Character): BankResult {
  const c = structuredClone(input);
  const bank = ensureBank(c);
  const req = bank.pendingRequest;
  if (!req) return fail(input, "Nobody is at the Bank's window.");
  bank.pendingRequest = undefined;
  c.dynasty!.unity = clamp((c.dynasty!.unity ?? 60) - 3);
  const msg = `The Bank's window closed on ${req.borrower}. The word travels through the family faster than money ever did.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function forgiveLoan(input: Character, loanId: string): BankResult {
  const c = structuredClone(input);
  const bank = ensureBank(c);
  const idx = bank.loans.findIndex((l) => l.id === loanId);
  if (idx < 0) return fail(input, "No such loan on the books.");
  const loan = bank.loans[idx];
  bank.lifetimeForgiven += loan.owed;
  bank.loans.splice(idx, 1);
  c.dynasty!.unity = clamp((c.dynasty!.unity ?? 60) + 3);
  const msg = `${loan.borrower}'s remaining ${formatMoney(loan.owed)} torn up at the table. Some ledgers balance in loyalty.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function pressLoan(input: Character, loanId: string): BankResult {
  const c = structuredClone(input);
  const bank = ensureBank(c);
  const loan = bank.loans.find((l) => l.id === loanId);
  if (!loan?.delinquent)
    return fail(input, "That loan is current — nothing to press.");
  const recovered = Math.round(loan.owed * 0.6);
  c.money += recovered;
  bank.loans.splice(bank.loans.indexOf(loan), 1);
  c.dynasty!.unity = clamp((c.dynasty!.unity ?? 60) - 4);
  const msg = `Lawyers recovered ${formatMoney(recovered)} of ${loan.borrower}'s debt. The money came back; the Thanksgiving invitations won't.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Family Office ----------

export interface OfficeTierDef {
  tier: number;
  name: string;
  feePct: number; // of liquid cash, yearly
  hint: string;
}

export const OFFICE_TIERS: OfficeTierDef[] = [
  {
    tier: 1,
    name: "Two Accountants Above a Bank",
    feePct: 0.5,
    hint: "Idle cash earns 3%/yr",
  },
  {
    tier: 2,
    name: "A Proper Family Office",
    feePct: 1.0,
    hint: "+ small scandals die before print; loans collected",
  },
  {
    tier: 3,
    name: "The Kind of Office With Its Own Office",
    feePct: 1.5,
    hint: "+ portfolio drift +1%/yr; will contests halved; rival files decay",
  },
];

export function setOfficeTier(input: Character, tier: number): BankResult {
  const c = structuredClone(input);
  ensureBank(c);
  const d = c.dynasty!;
  const t = clamp(tier, 0, 3);
  if (t > 0 && c.money < 1000000)
    return fail(
      input,
      "A family office manages fortunes, not balances. Come back with $1M liquid.",
    );
  d.office!.tier = t;
  const def = OFFICE_TIERS.find((x) => x.tier === t);
  const msg =
    t === 0
      ? "The family office is dissolved. The accountants left with excellent references and better stories."
      : `Engaged: ${def!.name} — ${def!.feePct}% of liquid assets per year. ${def!.hint}.`;
  c.log.push({
    age: c.age,
    text: msg,
    tone: t === 0 ? "neutral" : "milestone",
  });
  return {
    character: c,
    message: msg,
    tone: t === 0 ? "neutral" : "milestone",
    ok: true,
  };
}

// ---------- Scandal & the Society Pages ----------

const HEADLINES = [
  "THE %NAME% AFFAIR: What the Staff Saw",
  "Trouble in the House of %NAME%: A Relative's Arrest",
  "The %NAME% Millions: Where Did They Really Come From?",
  "EXCLUSIVE: Inside the %NAME% Feud",
  "A %NAME% Wedding, A Missing Guest, A Story",
  "The Butler's Notebook: Life Inside the %NAME% Estate",
];

export function suppressScandal(input: Character): BankResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const s = d?.press?.active;
  if (!d || !s) return fail(input, "There's no story running.");
  const officeDiscount = (d.office?.tier ?? 0) >= 2 ? 0.7 : 1;
  const cost = Math.round(s.heat * 40000 * officeDiscount);
  if (c.money < cost)
    return fail(input, `Killing this story quotes at ${formatMoney(cost)}.`);
  c.money -= cost;
  if (randInt(1, 100) <= 70) {
    d.press!.active = undefined;
    d.press!.suppressed += 1;
    const msg = `${formatMoney(cost)} later, the story died in legal review. The editor got a wine club membership; the writer got a book deal about something else.`;
    c.log.push({ age: c.age, text: msg, tone: "good" });
    return { character: c, message: msg, tone: "good", ok: true };
  }
  s.heat = clamp(s.heat + 10);
  const msg = `The suppression leaked. "FAMILY TRIES TO KILL STORY" is a better headline than the story. Heat rising.`;
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

export function spinScandal(
  input: Character,
  spend: (c: Character) => boolean,
): BankResult {
  const c = structuredClone(input);
  const d = c.dynasty;
  const s = d?.press?.active;
  if (!d || !s) return fail(input, "There's no story running.");
  if (!spend(c)) return fail(input, "No energy left this year.");
  const chance = clamp(40 + (c.networking ?? 0) / 3, 30, 80);
  if (randInt(1, 100) <= chance) {
    d.press!.active = undefined;
    d.press!.weathered += 1;
    d.reputation = clamp(d.reputation + 2);
    const msg =
      "You gave one interview, at home, with the good light. By Sunday the scandal was a profile and the profile was flattering.";
    c.log.push({ age: c.age, text: msg, tone: "good" });
    return { character: c, message: msg, tone: "good", ok: true };
  }
  s.heat = clamp(s.heat + 8);
  d.reputation = clamp(d.reputation - 2);
  const msg =
    "The interview produced a worse quote than the scandal. It's on tote bags now.";
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

// ---------- Yearly advance ----------

export function advanceBankOfficePress(c: Character, log: LogEntry[]) {
  const d = c.dynasty;
  if (!d) return;
  ensureBank(c);
  const bank = d.bank!;
  const press = d.press!;
  const office = d.office!;

  // --- Office: fees and services ---
  if (office.tier > 0) {
    const def = OFFICE_TIERS.find((x) => x.tier === office.tier)!;
    const fee = Math.round(Math.max(0, c.money) * (def.feePct / 100));
    if (c.money >= fee) {
      c.money -= fee;
      office.feesPaid += fee;
      const yieldOn = Math.round(Math.max(0, c.money) * 0.03);
      c.money += yieldOn;
      office.earned += yieldOn;
      if (office.tier >= 3 && c.investing) {
        for (const h of c.investing.holdings)
          h.value = Math.round(h.value * 1.01);
      }
      if (office.tier >= 3 && d.rivals) {
        for (const r of d.rivals) r.leverageOnYou = clamp(r.leverageOnYou - 2);
      }
    } else {
      office.tier = 0;
      log.push({
        age: c.age,
        text: "The family office resigned the mandate — fees unpaid. They were polite about it, which stung more.",
        tone: "bad",
      });
    }
  }

  // --- Bank: repayments, delinquency, new requests ---
  for (const loan of [...bank.loans]) {
    if (loan.yearsLeft <= 0) continue;
    const installment = Math.round(loan.owed / loan.yearsLeft);
    const delinquencyChance = loan.delinquent ? 35 : office.tier >= 2 ? 8 : 15;
    if (randInt(1, 100) <= delinquencyChance) {
      loan.delinquent = true;
      log.push({
        age: c.age,
        text: `${loan.borrower} missed a payment to the Family Bank. The apology was long; the cheque was absent.`,
        tone: "bad",
      });
    } else {
      c.money += installment;
      loan.owed -= installment;
      loan.yearsLeft -= 1;
      loan.delinquent = false;
      if (loan.yearsLeft <= 0 || loan.owed <= 0) {
        bank.loans = bank.loans.filter((l) => l.id !== loan.id);
        log.push({
          age: c.age,
          text: `${loan.borrower} repaid the Family Bank in full. The ledger closes; the standing rises.`,
          tone: "good",
        });
        d.unity = clamp((d.unity ?? 60) + 1);
      }
    }
  }
  if (!bank.pendingRequest && Math.random() < 0.18) {
    const kin = [
      ...c.relationships
        .filter((r) => r.type === "child" && r.alive && r.age >= 22)
        .map((r) => r.name),
      ...(d.descendants ?? [])
        .filter((t) => t.alive && t.age >= 22)
        .map((t) => t.name),
    ];
    if (kin.length) {
      bank.pendingRequest = {
        id: uid(),
        borrower: randItem(kin),
        amount: randInt(2, 10) * 50000,
        reason: randItem(LOAN_REASONS),
      };
      log.push({
        age: c.age,
        text: `${bank.pendingRequest.borrower} has asked the Family Bank for ${formatMoney(bank.pendingRequest.amount)} — ${bank.pendingRequest.reason}. (Family tab → Bank)`,
        tone: "neutral",
      });
    }
  }

  // --- Press: scandals hunt prominent families ---
  if (press.active) {
    const s = press.active;
    s.yearsRunning += 1;
    d.reputation = clamp(d.reputation - 2);
    d.unity = clamp((d.unity ?? 60) - 1);
    s.heat = clamp(s.heat - 30);
    if (s.heat <= 5 || s.yearsRunning >= 3) {
      press.active = undefined;
      press.weathered += 1;
      log.push({
        age: c.age,
        text: "The story finally starved. The family outlasted the news cycle, which is the oldest trick there is.",
        tone: "neutral",
      });
    }
  } else {
    const lowLoyaltyStaff = (c.lifestyle?.staff ?? []).some(
      (s) => s.loyalty < 35,
    );
    const prominence = d.reputation >= 60 || c.fame >= 40;
    const chance =
      (prominence ? 10 : 3) +
      (lowLoyaltyStaff ? 5 : 0) +
      (d.sin && !d.sin.detonated && d.sin.exposure > 50 ? 5 : 0);
    if (randInt(1, 100) <= chance) {
      const heat = randInt(30, 70);
      if (office.tier >= 2 && heat <= 40) {
        office.scandalsKilled += 1;
        log.push({
          age: c.age,
          text: "The family office killed a small story before it had a headline. You'll read about it in their fee letter.",
          tone: "good",
        });
      } else {
        press.active = {
          id: uid(),
          headline: randItem(HEADLINES).replace(
            "%NAME%",
            d.familyName.toUpperCase(),
          ),
          heat,
          yearsRunning: 0,
        };
        recordArchive(
          c,
          "scandal",
          `The papers ran: "${press.active.headline}"`,
          `sc:${press.active.id}`,
        );
        log.push({
          age: c.age,
          text: `THE SOCIETY PAGES: "${press.active.headline}" — heat ${heat}. Suppress it, spin it, or outlast it. (Family tab → Overview)`,
          tone: "bad",
        });
      }
    }
  }
}
