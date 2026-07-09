import type {
  ActingCareer,
  BizEvent,
  Character,
  EntertainmentState,
  InfluencerCareer,
  LogEntry,
  LogTone,
  MusicCareer,
} from "./types";
import { clamp, randInt, randItem, uid } from "./util";

// ---------------------------------------------------------------------------
// Entertainment path (Build 13). Three lanes sharing one engine:
//   Music      — releases, fans, label deals, tours
//   Acting     — auditions, roles, flops, awards
//   Influencer — compounding followers, brand deals, cancellation risk
// Fame is the connective stat: it feeds all three and is fed by all three.
// Scandals come from the player's choices, never pure RNG.
// ---------------------------------------------------------------------------

export interface EntResult {
  character: Character;
  message: string;
  tone: LogTone;
  ok: boolean;
}

const fail = (input: Character, message: string): EntResult => ({
  character: input,
  message,
  tone: "bad",
  ok: false,
});

type Spend = (c: Character) => boolean;

export function ensureEnt(c: Character): EntertainmentState {
  if (!c.entertainment) c.entertainment = { awards: 0, scandals: 0, lifetimeEarnings: 0 };
  return c.entertainment;
}

function earn(c: Character, ent: EntertainmentState, amount: number) {
  c.money += amount;
  ent.lifetimeEarnings += amount;
}

export function hasAgent(c: Character): boolean {
  return c.contacts?.some((x) => x.type === "agent" && x.relationship >= 50) ?? false;
}

/** Retired athletes and the already-famous start with a real head start. */
function fameHeadStart(c: Character): number {
  let f = c.fame;
  if (c.athlete?.retiredAge && (c.athlete.majors > 0 || c.athlete.hallOfFame)) f += 15;
  return f;
}

export const MUSIC_STAGES = [
  "Garage Act",
  "Local Gigs",
  "Regional Name",
  "Signed Artist",
  "Headliner",
  "Stadium Icon",
];
export const ACTING_STAGES = [
  "Background Extra",
  "Commercials",
  "TV Bit Parts",
  "Recurring Roles",
  "Film Lead",
  "A-List",
];

// ---------- Music ----------

export function startMusic(input: Character): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  if (ent.music) return fail(input, "You're already making music.");
  if (c.age < 14) return fail(input, "Learn an instrument first — come back at 14.");
  ent.music = {
    stage: 0,
    skill:
      15 +
      Math.round(c.stats.smarts / 10) +
      (c.edu.clubs?.some(
        (x) => x.toLowerCase().includes("band") || x.toLowerCase().includes("music"),
      )
        ? 10
        : 0),
    fans: 0,
    creativeControl: 100,
    singles: 0,
    albums: 0,
    hits: 0,
  };
  const msg =
    "You started making music. The garage acoustics are terrible and the dream is enormous.";
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function practiceMusic(input: Character, spend: Spend): EntResult {
  const c = structuredClone(input);
  const m = c.entertainment?.music;
  if (!m) return fail(input, "Start a music career first.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const gain = randInt(4, 9);
  m.skill = clamp(m.skill + gain);
  const msg = `A year of writing and woodshedding: +${gain} musicianship (now ${m.skill}).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function releaseMusic(input: Character, kind: "single" | "album", spend: Spend): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  const m = ent.music;
  if (!m) return fail(input, "Start a music career first.");
  if (kind === "album" && m.singles < 2)
    return fail(input, "Release a couple of singles before an album.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  const quality = clamp(
    Math.round(m.skill * 0.7 + randInt(-15, 25) + (m.label === "signed" ? 8 : 0)),
    5,
    100,
  );
  m.lastReleaseQuality = quality;
  const fameBoost = fameHeadStart(c);
  // Word-of-mouth compounds, but with diminishing returns.
  const momentum = 1 + (m.fans / (m.fans + 400)) * 4; // caps at 5x
  const reach = quality * (1 + fameBoost / 40) * momentum * (kind === "album" ? 2.2 : 1);
  const newFans = Math.round(reach * (m.label === "signed" ? 1.6 : 1) * (0.5 + Math.random()));
  m.fans += newFans;
  if (kind === "single") m.singles += 1;
  else m.albums += 1;

  const charted =
    quality >= 65 && Math.random() < 0.3 + fameBoost / 200 + (m.label === "signed" ? 0.15 : 0);
  const payingFans = m.fans < 3000 ? m.fans : 3000 + Math.sqrt(m.fans - 3000) * 25;
  let income = Math.round(
    payingFans * (kind === "album" ? 45 : 12) * (m.label === "signed" ? 0.4 : 1),
  );
  let msg: string;
  let tone: LogTone;
  if (charted) {
    m.hits += 1;
    income *= 4;
    c.fame += kind === "album" ? 6 : 3;
    msg = `Your ${kind} CHARTED (quality ${quality})! +${newFans.toLocaleString()}k fans, $${income.toLocaleString()} in royalties.`;
    tone = "milestone";
  } else if (quality >= 55) {
    c.fame += 1;
    msg = `Solid ${kind} (quality ${quality}). +${newFans.toLocaleString()}k fans, $${income.toLocaleString()} earned.`;
    tone = "good";
  } else {
    income = Math.round(income * 0.3);
    msg = `The ${kind} landed flat (quality ${quality}). +${newFans.toLocaleString()}k fans, $${income.toLocaleString()} scraped together.`;
    tone = "neutral";
  }
  if (m.label === "signed") msg += " The label kept its 60%.";
  earn(c, ent, income);
  progressMusicStage(c, m);
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

function progressMusicStage(c: Character, m: MusicCareer) {
  const thresholds = [0, 20, 100, 400, 1500, 5000]; // fans (k) per stage
  let target = 0;
  for (let i = 0; i < thresholds.length; i++) if (m.fans >= thresholds[i]) target = i;
  if (m.label !== "signed" && target > 3) target = Math.min(target, 4); // indie can still headline
  if (target > m.stage) {
    m.stage = target;
    c.log.push({
      age: c.age,
      text: `Your music career leveled up: ${MUSIC_STAGES[m.stage]}.`,
      tone: "milestone",
    });
    c.fame += 2;
  }
}

export function signLabel(input: Character): EntResult {
  const c = structuredClone(input);
  const m = c.entertainment?.music;
  if (!m) return fail(input, "Start a music career first.");
  if (m.label === "signed") return fail(input, "You're already signed.");
  if (m.fans < 40) return fail(input, "Labels want proof of an audience (40k+ fans).");
  m.label = "signed";
  m.creativeControl = 40;
  const advance = 50000 + m.fans * 300;
  const ent = ensureEnt(c);
  earn(c, ent, advance);
  const msg = `You signed with a major label: $${advance.toLocaleString()} advance. They own 60% of everything — and a say in your sound.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function goIndie(input: Character): EntResult {
  const c = structuredClone(input);
  const m = c.entertainment?.music;
  if (!m || m.label !== "signed") return fail(input, "You're not under a label deal.");
  m.label = "indie";
  m.creativeControl = 100;
  m.fans = Math.round(m.fans * 0.85); // some casual fans drift
  const msg =
    "You bought out your contract and went independent. Smaller machine, every dollar and every note yours.";
  c.log.push({ age: c.age, text: msg, tone: "neutral" });
  return { character: c, message: msg, tone: "neutral", ok: true };
}

export function tour(input: Character, spend: Spend): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  const m = ent.music;
  if (!m) return fail(input, "Start a music career first.");
  if (m.stage < 2) return fail(input, "Nobody tours empty rooms — reach Regional Name first.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const tourFans = m.fans < 3000 ? m.fans : 3000 + Math.sqrt(m.fans - 3000) * 25;
  const gross = Math.round(tourFans * randInt(80, 140) * (1 + m.stage / 4));
  const cut = m.label === "signed" ? 0.55 : 0.8;
  const income = Math.round(gross * cut);
  earn(c, ent, income);
  m.fans = Math.round(m.fans * 1.12);
  c.fame += 2;
  c.stats.health = clamp(c.stats.health - randInt(1, 4)); // the road takes
  const msg = `You toured all year: $${income.toLocaleString()} after costs${m.label === "signed" ? " and the label's cut" : ""}. Fans +12%.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  progressMusicStage(c, m);
  return { character: c, message: msg, tone: "good", ok: true };
}

// ---------- Acting ----------

export function startActing(input: Character): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  if (ent.acting) return fail(input, "You're already acting.");
  if (c.age < 16) return fail(input, "Casting for minors is a different world — come back at 16.");
  ent.acting = {
    stage: 0,
    craft:
      10 +
      (c.edu.clubs?.some(
        (x) => x.toLowerCase().includes("drama") || x.toLowerCase().includes("theatre"),
      )
        ? 15
        : 0),
    credits: 0,
    leads: 0,
    flops: 0,
    nominations: 0,
  };
  const msg = "You started acting — headshots, day jobs, and the long line outside every audition.";
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function actingClass(input: Character, spend: Spend): EntResult {
  const c = structuredClone(input);
  const a = c.entertainment?.acting;
  if (!a) return fail(input, "Start acting first.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const gain = randInt(4, 9);
  a.craft = clamp(a.craft + gain);
  const msg = `A year of scene study and coaching: +${gain} craft (now ${a.craft}).`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export type AuditionApproach = "safe" | "bold";

export function audition(input: Character, approach: AuditionApproach, spend: Spend): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  const a = ent.acting;
  if (!a) return fail(input, "Start acting first.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");

  const agent = hasAgent(c);
  let chance =
    25 +
    a.craft * 0.4 +
    c.stats.looks * 0.2 +
    fameHeadStart(c) * 0.3 +
    (agent ? 12 : 0) -
    a.stage * 5;
  if (approach === "bold") chance -= 10; // bold reads bomb more often…
  chance = clamp(Math.round(chance), 5, 90);
  const landed = randInt(1, 100) <= chance;

  if (!landed) {
    const msg =
      approach === "bold"
        ? "Your bold read confused the room. 'We'll call you.' They won't."
        : "Close, but the part went to someone else. Again.";
    c.log.push({ age: c.age, text: msg, tone: "neutral" });
    return { character: c, message: msg, tone: "neutral", ok: true };
  }

  a.credits += 1;
  const roleTier = Math.min(5, a.stage + (approach === "bold" ? 1 : 0)); // …but bold reads can jump you a tier
  const pay = [3000, 15000, 60000, 200000, 1000000, 4000000][roleTier];
  const project = Math.random();
  let msg: string;
  let tone: LogTone;
  if (project < 0.15 && roleTier >= 2) {
    a.flops += 1;
    earn(c, ent, Math.round(pay * 0.8));
    msg = `You booked a ${ACTING_STAGES[roleTier].toLowerCase()} role — and the project bombed spectacularly. Paid, but bruised.`;
    tone = "neutral";
  } else if (project > 0.88 && roleTier >= 2) {
    a.leads += 1;
    a.nominations += 1;
    earn(c, ent, pay * 2);
    c.fame += 4 + roleTier;
    a.stage = Math.min(5, Math.max(a.stage, roleTier) + 1);
    msg = `BREAKOUT: the project is a phenomenon and you're the story. $${(pay * 2).toLocaleString()}, an award nomination, and a new tier: ${ACTING_STAGES[a.stage]}.`;
    tone = "milestone";
  } else {
    earn(c, ent, pay);
    c.fame += 1 + Math.floor(roleTier / 2);
    if (a.credits >= (a.stage + 1) * 3 && a.stage < 5) {
      a.stage += 1;
      msg = `Booked and delivered: $${pay.toLocaleString()}. Enough credits now — you've moved up to ${ACTING_STAGES[a.stage]}.`;
      tone = "milestone";
    } else {
      msg = `You booked the part (${ACTING_STAGES[roleTier].toLowerCase()}): $${pay.toLocaleString()}.`;
      tone = "good";
    }
  }
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

// ---------- Influencer ----------

const NICHES = ["lifestyle", "fitness", "gaming", "finance", "comedy", "food", "fashion", "tech"];

export function startInfluencing(input: Character): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  if (ent.influencer) return fail(input, "You're already posting.");
  if (c.age < 14) return fail(input, "Platforms require 14+ — and honestly, go outside.");
  ent.influencer = {
    followers: 100 + fameHeadStart(c) * 2000,
    niche: randItem(NICHES),
    engagement: 50,
    cancelStrikes: 0,
    cancelled: false,
  };
  const msg = `You started creating ${ent.influencer.niche} content. ${ent.influencer.followers.toLocaleString()} followers and counting — mostly relatives, for now.`;
  c.log.push({ age: c.age, text: msg, tone: "milestone" });
  return { character: c, message: msg, tone: "milestone", ok: true };
}

export function createContent(
  input: Character,
  style: "authentic" | "clickbait",
  spend: Spend,
): EntResult {
  const c = structuredClone(input);
  const inf = c.entertainment?.influencer;
  if (!inf) return fail(input, "Start creating first.");
  if (inf.cancelled) return fail(input, "You're cancelled. Lay low or attempt the apology arc.");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const base = Math.max(200, Math.round(inf.followers * (inf.engagement / 100) * 0.4));
  let gained: number;
  let msg: string;
  let tone: LogTone;
  if (style === "clickbait") {
    gained = Math.round(base * (1.5 + Math.random() * 2));
    inf.engagement = clamp(inf.engagement - randInt(3, 7));
    inf.cancelStrikes += Math.random() < 0.25 ? 1 : 0;
    msg = `Rage-bait works: +${gained.toLocaleString()} followers. Engagement quality slipped, and you're playing with fire.`;
    tone = "neutral";
  } else {
    gained = Math.round(base * (0.6 + Math.random()));
    inf.engagement = clamp(inf.engagement + randInt(2, 5));
    msg = `A year of genuine ${inf.niche} content: +${gained.toLocaleString()} followers and a community that actually likes you.`;
    tone = "good";
  }
  const viral = Math.random() < 0.08 + c.fame / 400;
  if (viral) {
    gained *= 8;
    c.fame += 3;
    msg = `ONE OF YOUR POSTS WENT VIRAL. +${gained.toLocaleString()} followers overnight.`;
    tone = "milestone";
  }
  inf.followers += gained;
  c.log.push({ age: c.age, text: msg, tone });
  return { character: c, message: msg, tone, ok: true };
}

export function brandDeal(input: Character, spend: Spend): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  const inf = ent.influencer;
  if (!inf) return fail(input, "Start creating first.");
  if (inf.cancelled) return fail(input, "Brands don't touch cancelled creators.");
  if (inf.followers < 10000) return fail(input, "Brands start calling at 10k followers.");
  if (c.criminalRecord > 0)
    return fail(
      input,
      "Brand safety teams ran your background check. Every deal fell through — convictions are poison to sponsors.",
    );
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const agent = hasAgent(c);
  const rate = inf.followers * (0.02 + inf.engagement / 2000) * (agent ? 1.5 : 1);
  const income = Math.round(rate * randInt(2, 5));
  earn(c, ent, income);
  inf.engagement = clamp(inf.engagement - 2); // audiences smell ads
  const msg = `Sponsorships this year: $${income.toLocaleString()}${agent ? " (your agent squeezed the brands hard)" : ""}.`;
  c.log.push({ age: c.age, text: msg, tone: "good" });
  return { character: c, message: msg, tone: "good", ok: true };
}

export function apologyArc(input: Character, spend: Spend): EntResult {
  const c = structuredClone(input);
  const inf = c.entertainment?.influencer;
  if (!inf?.cancelled) return fail(input, "You're not cancelled. Congratulations?");
  if (!spend(c)) return fail(input, "No energy left this year. Age up first.");
  const sincere = Math.random() < 0.4 + c.stats.smarts / 300;
  if (sincere) {
    inf.cancelled = false;
    inf.cancelStrikes = Math.max(0, inf.cancelStrikes - 1);
    inf.followers = Math.round(inf.followers * 1.1);
    const msg =
      "The apology landed as genuine. Redemption arcs are content too — you're back, bigger.";
    c.log.push({ age: c.age, text: msg, tone: "milestone" });
    return { character: c, message: msg, tone: "milestone", ok: true };
  }
  inf.followers = Math.round(inf.followers * 0.85);
  const msg = "The ukulele apology video made everything worse. Try again next year.";
  c.log.push({ age: c.age, text: msg, tone: "bad" });
  return { character: c, message: msg, tone: "bad", ok: true };
}

// ---------- Shared: awards & tabloids ----------

function tabloidEvent(c: Character, ent: EntertainmentState): BizEvent | null {
  const famous = c.fame >= 25;
  if (!famous) return null;
  const pool: BizEvent[] = [
    {
      id: `tabloid-romance-${uid()}`,
      title: "Tabloid Romance Rumors",
      description:
        "Paparazzi shots of you at dinner with another celebrity. The internet has decided you're dating.",
      options: [
        {
          label: "Lean into it publicly",
          text: "The 'relationship' dominated headlines for months. All press is press.",
          tone: "neutral",
        },
        {
          label: "Issue a firm denial",
          text: "The story died in a week. Boring wins sometimes.",
          tone: "good",
        },
        {
          label: "Say nothing",
          text: "The mystery kept the story alive — and kept your name trending.",
          tone: "neutral",
        },
      ],
    },
    {
      id: `tabloid-feud-${uid()}`,
      title: "A Rival Takes a Shot",
      description:
        "Another star mocked you in an interview. Clips are everywhere and everyone wants your response.",
      options: [
        {
          label: "Fire back with a devastating one-liner",
          text: "Your reply became the moment of the week. The feud is now content.",
          tone: "neutral",
        },
        {
          label: "Kill it with graciousness",
          text: "You praised them warmly. They looked petty; you looked untouchable.",
          tone: "good",
        },
        {
          label: "Escalate hard and personal",
          text: "It got ugly. Sponsors quietly took notes.",
          tone: "bad",
        },
      ],
    },
    {
      id: `tabloid-leak-${uid()}`,
      title: "Private Messages Leaked",
      description:
        "Old private messages of yours — embarrassing, not illegal — just hit the gossip sites.",
      options: [
        {
          label: "Own it with self-deprecating humor",
          text: "You roasted yourself before anyone else could. Crisis defused.",
          tone: "good",
        },
        {
          label: "Lawyer up and threaten the outlets",
          text: "The stories came down; the Streisand effect put them back up twice as loud.",
          tone: "bad",
        },
        {
          label: "Disappear from public view for a while",
          text: "You went quiet until the internet found a new main character.",
          tone: "neutral",
        },
      ],
    },
  ];
  return randItem(pool);
}

export function resolveEntEvent(input: Character, optionIndex: number): EntResult {
  const c = structuredClone(input);
  const ent = ensureEnt(c);
  const ev = ent.pendingEvent;
  const opt = ev?.options[optionIndex];
  if (!ev || !opt) return fail(input, "No event pending.");
  ent.pendingEvent = undefined;

  if (ev.id.startsWith("tabloid-romance")) {
    if (optionIndex === 0) c.fame += 4;
    if (optionIndex === 2) c.fame += 2;
  } else if (ev.id.startsWith("tabloid-feud")) {
    if (optionIndex === 0) c.fame += 3;
    if (optionIndex === 1) c.fame += 2;
    if (optionIndex === 2) {
      ent.scandals += 1;
      if (ent.influencer) ent.influencer.cancelStrikes += 1;
      c.fame += 1;
    }
  } else if (ev.id.startsWith("tabloid-leak")) {
    if (optionIndex === 0) c.fame += 2;
    if (optionIndex === 1) {
      ent.scandals += 1;
      c.fame += 1;
    }
    if (optionIndex === 2) c.fame = Math.max(0, c.fame - 3);
  }
  c.log.push({ age: c.age, text: `${ev.title} — ${opt.text}`, tone: opt.tone });
  return { character: c, message: opt.text, tone: opt.tone, ok: true };
}

// ---------- Yearly ----------

export function advanceEntertainment(c: Character, log: LogEntry[]) {
  const ent = c.entertainment;
  if (!ent) return;

  // Music royalties trickle yearly; fans drift without releases.
  if (ent.music) {
    const m = ent.music;
    const royaltyFans = m.fans < 3000 ? m.fans : 3000 + Math.sqrt(m.fans - 3000) * 25;
    const royalties = Math.round(royaltyFans * 3 * (1 + m.hits) * (m.label === "signed" ? 0.4 : 1));
    if (royalties > 500) {
      earn(c, ent, royalties);
      log.push({
        age: c.age,
        text: `Streaming royalties: $${royalties.toLocaleString()}.`,
        tone: "neutral",
      });
    }
    m.fans = Math.round(m.fans * 0.94); // attention decays
  }

  // Influencer compounding & cancellation (strikes are all player-earned).
  if (ent.influencer && !ent.influencer.cancelled) {
    const inf = ent.influencer;
    inf.followers = Math.round(inf.followers * (1 + (inf.engagement - 45) / 300));
    if (inf.cancelStrikes >= 3 && Math.random() < 0.5) {
      inf.cancelled = true;
      inf.followers = Math.round(inf.followers * 0.6);
      ent.scandals += 1;
      log.push({
        age: c.age,
        text: "IT HAPPENED: an old clip resurfaced and the pile-on began. You've been cancelled.",
        tone: "bad",
      });
    }
  }

  // Aging bites the camera-facing lanes.
  if (ent.acting && c.age > 45 && Math.random() < 0.3) {
    log.push({
      age: c.age,
      text: "The roles coming in are 'the parent' now. Hollywood's calendar is crueler than everyone else's.",
      tone: "neutral",
    });
  }

  // Award season: nominations convert on quality + fame.
  if (ent.acting && ent.acting.nominations > ent.awards && Math.random() < 0.25) {
    ent.awards += 1;
    c.fame += 8;
    log.push({
      age: c.age,
      text: "🏆 YOU WON. The speech, the statue, the standing ovation — a career summit.",
      tone: "milestone",
    });
  }
  if (ent.music && ent.music.hits >= 3 && Math.random() < 0.12) {
    ent.awards += 1;
    c.fame += 8;
    log.push({
      age: c.age,
      text: "🏆 Album of the Year. They said the garage years would never pay off.",
      tone: "milestone",
    });
  }

  // Tabloids find the famous.
  if (!ent.pendingEvent && Math.random() < 0.2) {
    const ev = tabloidEvent(c, ent);
    if (ev) {
      ent.pendingEvent = ev;
      log.push({
        age: c.age,
        text: `${ev.title} — respond in the Entertainment hub.`,
        tone: "neutral",
      });
    }
  }
}
