import { FIRST_NAMES_POOL, POLITICIAN_SURNAMES } from "./politicsData";
import { ensurePolitics } from "./politics";
import type { Character, ContactType, LogTone, NamedContact } from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Named networking contacts (Build 10). The old networking *stat* still
// exists; this layer adds specific people whose relationship you build and
// whose help produces concrete, type-specific benefits.
// ---------------------------------------------------------------------------

export interface ContactResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): ContactResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

export const CONTACT_TYPES: { id: ContactType; label: string; help: string }[] = [
  { id: "professor", label: "Professor", help: "Public endorsement — boosts political reputation" },
  {
    id: "boss",
    label: "Former Boss",
    help: "Glowing reference — job performance & business reputation",
  },
  {
    id: "recruiter",
    label: "Recruiter",
    help: "Salary bump at your current job, or a foot in the door",
  },
  { id: "investor", label: "Investor", help: "Invests cash into your best business" },
  { id: "politician", label: "Politician", help: "Party support and campaign funds" },
  { id: "agent", label: "Sports/Talent Agent", help: "Fame and endorsement money" },
  { id: "wealthy", label: "Wealthy Friend", help: "A generous gift or campaign donation" },
  { id: "partner", label: "Business Partner", help: "Hands-on help improving a business" },
  { id: "lawyer", label: "Lawyer", help: "Fights charges — can clear a criminal record entry" },
];

const HELP_COOLDOWN = 3; // years
const MIN_REL_FOR_HELP = 60;

export function ensureContacts(c: Character): NamedContact[] {
  if (!c.contacts) c.contacts = [];
  return c.contacts;
}

/** Contact types you're most likely to meet, weighted by the life you lead. */
function weightedType(c: Character): ContactType {
  const pool: ContactType[] = ["professor", "boss", "recruiter", "wealthy", "lawyer"];
  if (c.businessHub?.businesses.length) pool.push("investor", "investor", "partner", "partner");
  if (c.politics?.office || c.politics?.campaign) pool.push("politician", "politician", "wealthy");
  if (c.fame > 20) pool.push("agent", "agent");
  if (c.education === "graduated" || c.edu.degrees?.length) pool.push("professor", "recruiter");
  if ((c.investing?.holdings.length ?? 0) > 0) pool.push("investor");
  return randItem(pool);
}

export function meetContact(input: Character, spend: (c: Character) => boolean): ContactResult {
  const c = structuredClone(input);
  const contacts = ensureContacts(c);
  if (c.age < 16) return fail(input, "A little young to be working a room.");
  if (contacts.length >= 12)
    return fail(input, "Your circle is full — twelve real relationships is the human limit here.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const type = weightedType(c);
  const label = CONTACT_TYPES.find((t) => t.id === type)!.label;
  const contact: NamedContact = {
    id: uid(),
    name: `${randItem(FIRST_NAMES_POOL)} ${randItem(POLITICIAN_SURNAMES)}`,
    type,
    relationship: 25 + Math.round((c.networking ?? 0) / 5) + randInt(0, 10),
    metAge: c.age,
  };
  contacts.push(contact);
  c.networking = clamp((c.networking ?? 0) + randInt(2, 4));
  const msg = `You hit it off with ${contact.name}, a ${label.toLowerCase()}. A useful person to know.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function catchUp(
  input: Character,
  id: string,
  spend: (c: Character) => boolean,
): ContactResult {
  const c = structuredClone(input);
  const contact = c.contacts?.find((x) => x.id === id);
  if (!contact) return fail(input, "No such contact.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const gain = randInt(8, 16);
  contact.relationship = clamp(contact.relationship + gain);
  c.networking = clamp((c.networking ?? 0) + 1);
  const msg = `You caught up with ${contact.name} (+${gain} relationship).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function canAskHelp(c: Character, contact: NamedContact): { ok: boolean; reason?: string } {
  if (contact.relationship < MIN_REL_FOR_HELP)
    return {
      ok: false,
      reason: `Needs ${MIN_REL_FOR_HELP}+ relationship (now ${contact.relationship})`,
    };
  if (contact.lastHelpAge !== undefined && c.age - contact.lastHelpAge < HELP_COOLDOWN)
    return {
      ok: false,
      reason: `Already helped recently — ask again in ${HELP_COOLDOWN - (c.age - contact.lastHelpAge)} yr`,
    };
  return { ok: true };
}

export function askForHelp(input: Character, id: string): ContactResult {
  const c = structuredClone(input);
  const contact = c.contacts?.find((x) => x.id === id);
  if (!contact) return fail(input, "No such contact.");
  const gate = canAskHelp(c, contact);
  if (!gate.ok) return fail(input, gate.reason!);

  contact.lastHelpAge = c.age;
  contact.relationship = clamp(contact.relationship - randInt(5, 12)); // favours spend goodwill
  let msg = "";
  let tone: LogTone = "good";

  switch (contact.type) {
    case "professor": {
      const p = ensurePolitics(c);
      p.reputation = clamp(p.reputation + randInt(4, 8));
      p.publicTrust = clamp(p.publicTrust + randInt(2, 5));
      msg = `${contact.name} publicly vouched for your character. Your political reputation rose.`;
      break;
    }
    case "boss": {
      c.businessReputation = clamp(c.businessReputation + randInt(5, 10));
      if (c.job) c.job.performance = clamp(c.job.performance + randInt(5, 10));
      msg = `${contact.name} made calls on your behalf. Doors are opening.`;
      break;
    }
    case "recruiter": {
      if (c.job && c.job.careerGroup !== "political-office") {
        const bump = Math.round(c.job.salary * (0.06 + randInt(0, 6) / 100));
        c.job.salary += bump;
        msg = `${contact.name} shopped a competing offer — your employer matched with a $${bump.toLocaleString()} raise.`;
      } else {
        c.networking = clamp((c.networking ?? 0) + randInt(4, 8));
        msg = `${contact.name} introduced you around the industry. Your network deepened.`;
      }
      break;
    }
    case "investor": {
      const biz = c.businessHub?.businesses.slice().sort((a, b) => b.valuation - a.valuation)[0];
      if (biz) {
        const cheque = Math.round(Math.max(40000, biz.valuation * 0.12));
        biz.cash += cheque;
        biz.investorOwned = Math.min(0.49, Math.round((biz.investorOwned + 0.08) * 100) / 100);
        msg = `${contact.name} wired $${cheque.toLocaleString()} into ${biz.name} for an 8% stake.`;
      } else {
        c.money += randInt(8000, 20000);
        msg = `${contact.name} cut you in on a small deal. A tidy cheque arrived.`;
      }
      break;
    }
    case "politician": {
      const p = ensurePolitics(c);
      p.partySupport = clamp(p.partySupport + randInt(8, 15));
      p.funds += randInt(15000, 40000);
      msg = `${contact.name} rallied donors and party insiders behind you.`;
      break;
    }
    case "agent": {
      c.fame += randInt(3, 7);
      const endorsement = randInt(10000, 40000) + c.fame * 500;
      c.money += endorsement;
      msg = `${contact.name} landed you an endorsement worth $${endorsement.toLocaleString()}.`;
      break;
    }
    case "wealthy": {
      if (c.politics?.campaign) {
        const gift = randInt(30000, 80000);
        ensurePolitics(c).funds += gift;
        msg = `${contact.name} maxed out for your campaign: $${gift.toLocaleString()}.`;
      } else {
        const gift = randInt(15000, 50000);
        c.money += gift;
        msg = `${contact.name} insisted on helping out: a $${gift.toLocaleString()} gift.`;
      }
      break;
    }
    case "partner": {
      const biz = c.businessHub?.businesses[0];
      if (biz) {
        biz.quality = clamp(biz.quality + randInt(6, 12));
        biz.marketing = clamp(biz.marketing + randInt(4, 10));
        msg = `${contact.name} spent a month inside ${biz.name}, tightening everything.`;
      } else {
        c.businessReputation = clamp(c.businessReputation + randInt(4, 8));
        msg = `${contact.name} coached you through business plans over long dinners.`;
      }
      break;
    }
    case "lawyer": {
      if (c.criminalRecord > 0) {
        const cost = 40000;
        if (c.money < cost)
          return fail(
            input,
            `${contact.name} can fight it — but the retainer is $${cost.toLocaleString()}.`,
          );
        c.money -= cost;
        c.criminalRecord -= 1;
        msg = `${contact.name} got a conviction overturned on appeal. Your record is cleaner.`;
      } else if (c.politics && c.politics.scandalRisk > 0) {
        c.politics.scandalRisk = Math.max(0, c.politics.scandalRisk - randInt(15, 25));
        msg = `${contact.name} quietly papered over your exposure. Scandal risk reduced.`;
      } else {
        msg = `${contact.name} reviewed your affairs — everything is airtight. Peace of mind.`;
        tone = "neutral";
      }
      break;
    }
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

/** Yearly: relationships cool if neglected. */
export function advanceContacts(c: Character) {
  if (!c.contacts?.length) return;
  for (const contact of c.contacts) {
    contact.relationship = clamp(contact.relationship - 2);
  }
  c.contacts = c.contacts.filter((x) => x.relationship > 5);
}
