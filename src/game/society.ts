import type { Character, LogEntry, LogTone, SocietyObligation, SocietyState } from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Secret Societies (Build 15). You never apply — invitations find you when
// you cross thresholds in other paths. Membership trades obligations for
// favors that reach into every system. Refuse too often and the society
// becomes an invisible enemy.
// ---------------------------------------------------------------------------

export interface SocietyResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): SocietyResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export function ensureSociety(c: Character): SocietyState {
  if (!c.society)
    c.society = {
      standing: 0,
      favors: 0,
      obligationsMet: 0,
      obligationsRefused: 0,
      expelled: false,
      enemy: false,
    };
  return c.society;
}

const SOCIETIES = [
  { name: "The Ivory Chamber", flavor: "old money and older secrets" },
  { name: "The Meridian Order", flavor: "the hands behind the handshakes" },
  { name: "The Velvet Circle", flavor: "fame's quiet landlords" },
];

/** Which society (if any) would extend an invitation this year. */
function invitationFor(c: Character): string | null {
  const nw = c.money + (c.investing?.holdings.reduce((s, h) => s + h.value, 0) ?? 0);
  const bizValue = c.businessHub?.businesses.reduce((s, b) => s + b.valuation, 0) ?? 0;
  if (nw + bizValue > 2000000 || (c.businessHub?.soldFor ?? 0) > 1500000)
    return "The Ivory Chamber";
  if ((c.politics?.highestLevelWon ?? -1) >= 4 || (c.politics?.prestige ?? 0) >= 60)
    return "The Meridian Order";
  if (c.fame >= 60 || (c.entertainment?.awards ?? 0) >= 2) return "The Velvet Circle";
  if ((c.networking ?? 0) >= 80 && (c.dynasty?.reputation ?? 0) >= 70) return "The Ivory Chamber";
  return null;
}

export function acceptInvite(input: Character): SocietyResult {
  const c = structuredClone(input);
  const s = ensureSociety(c);
  if (!s.pendingInvite) return fail(input, "No invitation on the table.");
  s.member = s.pendingInvite;
  s.pendingInvite = undefined;
  s.standing = 30;
  s.invitedAge = c.age;
  s.expelled = false;
  const msg = `You were initiated into ${s.member}. No records, no photos — just obligations and reach.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function declineInvite(input: Character): SocietyResult {
  const c = structuredClone(input);
  const s = ensureSociety(c);
  if (!s.pendingInvite) return fail(input, "No invitation on the table.");
  const name = s.pendingInvite;
  s.pendingInvite = undefined;
  const msg = `You declined ${name}. The envelope, and the option, quietly disappeared.`;
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

// ---------- Obligations ----------

function buildObligation(c: Character): SocietyObligation {
  const pool: SocietyObligation[] = [
    {
      id: `ob-fund-${uid()}`,
      title: "The Annual Contribution",
      description:
        "The Chamber's 'philanthropic fund' expects its yearly consideration. Amounts are never discussed; they are simply known.",
      complyText: "The transfer cleared. Doors elsewhere clicked quietly open.",
      refuseText: "Your empty envelope was noted. Nothing was said, which said everything.",
      cost: { money: 25000 + Math.round(Math.max(0, c.money) * 0.02) },
    },
    {
      id: `ob-favor-${uid()}`,
      title: "A Member Needs a Favor",
      description:
        "A fellow member's protégé needs an introduction, a reference, a nudge. Your name would carry it.",
      complyText: "You made the calls. The favor bank remembers deposits.",
      refuseText: "You begged off. Members who don't give don't get.",
      cost: {},
    },
    {
      id: `ob-influence-${uid()}`,
      title: "The Society Has a Position",
      description:
        "On a matter you have influence over, the society has quietly reached a consensus. Your alignment is expected.",
      complyText: "You aligned. It cost you something public to gain something private.",
      refuseText: "You went your own way. Independence is admired everywhere except inside.",
      cost: { approval: 4 },
    },
  ];
  if (c.businessHub?.businesses.length) {
    pool.push({
      id: `ob-contract-${uid()}`,
      title: "Preferred Vendors",
      description:
        "Your business is expected to route contracts through member-owned firms. Their prices are... member prices.",
      complyText: "The invoices ran high, and your standing ran higher.",
      refuseText: "You shopped around like a civilian. It was noticed.",
      cost: { bizCash: 20000 },
    });
  }
  return randItem(pool);
}

export function resolveObligation(input: Character, comply: boolean): SocietyResult {
  const c = structuredClone(input);
  const s = ensureSociety(c);
  const ob = s.pendingObligation;
  if (!ob || !s.member) return fail(input, "Nothing is being asked of you.");
  s.pendingObligation = undefined;

  if (comply) {
    if (ob.cost.money) {
      if (c.money < ob.cost.money)
        return fail(
          input,
          `Compliance costs $${ob.cost.money.toLocaleString()} you don't have. Refuse, or find it.`,
        );
      c.money -= ob.cost.money;
    }
    if (ob.cost.approval && c.politics)
      c.politics.approval = clamp(c.politics.approval - ob.cost.approval);
    if (ob.cost.bizCash && c.businessHub?.businesses[0])
      c.businessHub.businesses[0].cash -= ob.cost.bizCash;
    s.obligationsMet += 1;
    s.standing = clamp(s.standing + randInt(8, 14));
    s.favors += 1;
    const msg = `${ob.complyText} (+1 favor, standing ${s.standing})`;
    c.log.push({ age: c.age, text: msg, tone: "good" });
    return { character: c, message: msg, tone: "good", ok: true };
  }

  s.obligationsRefused += 1;
  s.standing = clamp(s.standing - randInt(15, 25));
  let msg = ob.refuseText;
  let tone: LogTone = "neutral";
  if (s.obligationsRefused >= 2 && s.standing < 25) {
    s.expelled = true;
    s.enemy = true;
    const name = s.member;
    s.member = undefined;
    msg = `${ob.refuseText} Days later, your key stopped working. ${name} doesn't expel members — it forgets them, and then it works against them.`;
    tone = "bad";
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Favors (the payoff) ----------

export type FavorKind =
  "bury-scandal" | "whip-votes" | "court-friend" | "open-doors" | "polish-brand";

export const FAVORS: { id: FavorKind; label: string; hint: string }[] = [
  {
    id: "bury-scandal",
    label: "Bury a Scandal",
    hint: "Scandal risk −30, or clears a cancellation strike",
  },
  { id: "whip-votes", label: "Whip the Votes", hint: "A bill passes quietly (requires office)" },
  { id: "court-friend", label: "A Friend in the Courthouse", hint: "Active trial: evidence −15" },
  { id: "open-doors", label: "Open Doors", hint: "+10 networking, +8 party support" },
  {
    id: "polish-brand",
    label: "Polish the Name",
    hint: "+10 dynasty reputation, +5 business reputation",
  },
];

export function callInFavor(input: Character, kind: FavorKind): SocietyResult {
  const c = structuredClone(input);
  const s = ensureSociety(c);
  if (!s.member) return fail(input, "Favors are for members.");
  if (s.favors < 1) return fail(input, "You have no favors banked. Obligations earn them.");

  let msg = "";
  switch (kind) {
    case "bury-scandal": {
      const p = c.politics;
      const inf = c.entertainment?.influencer;
      if (p && p.scandalRisk > 0) {
        p.scandalRisk = Math.max(0, p.scandalRisk - 30);
        msg =
          "Three phone calls, and the story that was forming simply... stopped forming. Scandal risk −30.";
      } else if (inf && inf.cancelStrikes > 0) {
        inf.cancelStrikes -= 1;
        if (inf.cancelled) inf.cancelled = false;
        msg = "The clips vanished from every platform overnight. One strike, erased.";
      } else return fail(input, "There's nothing to bury right now — a rare and pleasant problem.");
      break;
    }
    case "whip-votes": {
      const p = c.politics;
      if (!p?.office) return fail(input, "You need to hold office to have votes worth whipping.");
      p.billsPassed += 1;
      p.domainApproval.economy = clamp(p.domainApproval.economy + 6);
      msg =
        "Your bill passed without a single speech from you. Somewhere, favors were traded above your pay grade.";
      break;
    }
    case "court-friend": {
      const t = c.crime?.trial;
      if (!t) return fail(input, "No active trial — keep this one banked.");
      t.evidence = clamp(t.evidence - 15, 5, 98);
      t.courtLog.push(
        "A society favor: key evidence developed 'chain of custody problems.' (evidence −15)",
      );
      msg = "The evidence developed problems nobody could quite explain. Evidence −15.";
      break;
    }
    case "open-doors": {
      c.networking = clamp((c.networking ?? 0) + 10);
      if (c.politics) c.politics.partySupport = clamp(c.politics.partySupport + 8);
      msg = "A week of introductions you couldn't have bought. Networking +10.";
      break;
    }
    case "polish-brand": {
      if (c.dynasty) c.dynasty.reputation = clamp(c.dynasty.reputation + 10);
      c.businessReputation = clamp(c.businessReputation + 5);
      msg = "Profiles, honors, a well-placed puff piece — the family name gleams.";
      break;
    }
  }
  s.favors -= 1;
  c.log.push({ age: c.age, text: `${s.member}: ${msg}`, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Yearly ----------

export function advanceSociety(c: Character, log: LogEntry[]) {
  const s = c.society;

  // Invitations find the worthy (and the legacies).
  if (!s?.member && !s?.pendingInvite && !s?.expelled && c.age >= 21) {
    const legacyInvite = c.dynasty?.legacySociety && c.age >= 21 && c.age <= 25;
    const earned = invitationFor(c);
    const offer = legacyInvite ? c.dynasty!.legacySociety! : Math.random() < 0.25 ? earned : null;
    if (offer) {
      const st = ensureSociety(c);
      st.pendingInvite = offer;
      log.push({
        age: c.age,
        text: legacyInvite
          ? `An unmarked envelope, the same seal your parent knew: ${offer} extends a legacy invitation.`
          : `An unmarked envelope with a wax seal: ${offer} requests the pleasure of your discretion.`,
        tone: "milestone",
      });
      if (legacyInvite) c.dynasty!.legacySociety = undefined; // one per generation
    }
  }

  if (!s) return;

  // Members receive obligations.
  if (s.member && !s.pendingObligation && Math.random() < 0.35) {
    s.pendingObligation = buildObligation(c);
    log.push({
      age: c.age,
      text: `${s.member} has expectations: "${s.pendingObligation.title}" — respond in the Network tab.`,
      tone: "neutral",
    });
  }

  // Enemies get sabotaged, quietly and forever (until reputation fades it).
  if (s.enemy && Math.random() < 0.3) {
    const strikes: (() => string)[] = [
      () => {
        if (c.politics) c.politics.approval = clamp(c.politics.approval - 4);
        return "a whisper campaign shaved your approval";
      },
      () => {
        const b = c.businessHub?.businesses[0];
        if (b) {
          b.reputation = clamp(b.reputation - 5);
          return `${b.name} lost a contract it should have won`;
        }
        c.money -= Math.min(c.money, 8000);
        return "an audit found paperwork problems that cost you";
      },
      () => {
        c.networking = clamp((c.networking ?? 0) - 3);
        return "doors that used to open now need appointments";
      },
    ];
    const text = randItem(strikes)();
    log.push({ age: c.age, text: `Old enemies, soft power: ${text}.`, tone: "bad" });
    if (Math.random() < 0.1) {
      s.enemy = false;
      log.push({
        age: c.age,
        text: "The society's attention finally moved on. The pressure lifts.",
        tone: "neutral",
      });
    }
  }
}
