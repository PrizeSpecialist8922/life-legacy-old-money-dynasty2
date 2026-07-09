import type { Character, GameEvent } from "./types";
import { clamp, randInt, randItem } from "./util";

// ---------------------------------------------------------------------------
// Yearly work events. When employed, each work year surfaces one meaningful
// decision that shapes performance, promotion readiness, burnout, pay, bonus,
// reputation and networking.
// ---------------------------------------------------------------------------

function j(c: Character) {
  return c.job!;
}

export const WORK_EVENTS: GameEvent[] = [
  {
    id: "work-difficult-client",
    title: "Difficult Client",
    description: "A high-stakes client is furious about a delay and threatening to walk.",
    minAge: 16,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Stay late and personally fix it",
        apply: (c) => {
          j(c).performance = clamp(j(c).performance + randInt(6, 12));
          j(c).burnout = clamp((j(c).burnout ?? 0) + randInt(6, 12));
          c.businessReputation += randInt(1, 3);
          return { text: "You saved the account. Leadership noticed — but you're drained.", tone: "good" };
        },
      },
      {
        label: "Delegate to a teammate",
        apply: (c) => {
          j(c).coworkerRel = clamp((j(c).coworkerRel ?? 50) - randInt(2, 6));
          j(c).performance = clamp(j(c).performance - randInt(0, 4));
          return { text: "It got handled, but a teammate resents the dump.", tone: "neutral" };
        },
      },
      {
        label: "Set firm boundaries with the client",
        apply: (c) => {
          if (Math.random() < 0.5) {
            j(c).managerRel = clamp((j(c).managerRel ?? 50) + randInt(2, 6));
            return { text: "Your manager respected the boundary. Balance preserved.", tone: "good" };
          }
          c.businessReputation -= randInt(1, 3);
          return { text: "The client escalated to your boss. Awkward.", tone: "bad" };
        },
      },
    ],
  },
  {
    id: "work-high-profile",
    title: "High-Profile Project",
    description: "A career-defining project needs a lead. It's visible — and risky.",
    minAge: 18,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Volunteer to lead it",
        apply: (c) => {
          const win = Math.random() < 0.5 + j(c).performance / 300;
          if (win) {
            j(c).performance = clamp(j(c).performance + randInt(8, 15));
            j(c).bonusPct = Math.min(0.4, (j(c).bonusPct ?? 0.1) + 0.05);
            c.businessReputation += randInt(2, 5);
            return { text: "The project was a hit — a major boost to your standing.", tone: "milestone" };
          }
          j(c).performance = clamp(j(c).performance - randInt(4, 9));
          j(c).burnout = clamp((j(c).burnout ?? 0) + randInt(4, 9));
          return { text: "It stumbled. A tough but visible learning experience.", tone: "bad" };
        },
      },
      {
        label: "Support from the sidelines",
        apply: (c) => {
          j(c).performance = clamp(j(c).performance + randInt(1, 4));
          return { text: "You contributed solidly without the spotlight.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "work-overtime",
    title: "Overtime Request",
    description: "Your manager asks the team to grind through a crunch weekend.",
    minAge: 16,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Put in the hours",
        apply: (c) => {
          j(c).managerRel = clamp((j(c).managerRel ?? 50) + randInt(4, 8));
          j(c).performance = clamp(j(c).performance + randInt(3, 7));
          j(c).burnout = clamp((j(c).burnout ?? 0) + randInt(8, 15));
          c.stats.happiness = clamp(c.stats.happiness - randInt(2, 5));
          return { text: "You delivered. Your manager owes you one — but you're wiped.", tone: "good" };
        },
      },
      {
        label: "Protect your weekend",
        apply: (c) => {
          j(c).managerRel = clamp((j(c).managerRel ?? 50) - randInt(3, 7));
          c.stats.happiness = clamp(c.stats.happiness + randInt(2, 5));
          c.mentalHealth = clamp(c.mentalHealth + randInt(2, 5));
          return { text: "You recharged, though your manager wasn't thrilled.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "work-coworker-conflict",
    title: "Coworker Conflict",
    description: "A colleague keeps taking credit for your work.",
    minAge: 18,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Address it directly and professionally",
        apply: (c) => {
          if (Math.random() < 0.6) {
            j(c).coworkerRel = clamp((j(c).coworkerRel ?? 50) + randInt(3, 8));
            return { text: "You cleared the air and earned respect.", tone: "good" };
          }
          j(c).coworkerRel = clamp((j(c).coworkerRel ?? 50) - randInt(4, 9));
          return { text: "It got tense. The friction lingers.", tone: "bad" };
        },
      },
      {
        label: "Escalate to your manager",
        apply: (c) => {
          j(c).managerRel = clamp((j(c).managerRel ?? 50) + randInt(0, 4));
          j(c).coworkerRel = clamp((j(c).coworkerRel ?? 50) - randInt(5, 10));
          return { text: "Your manager stepped in, but the team dynamic soured.", tone: "neutral" };
        },
      },
      {
        label: "Let it slide",
        apply: (c) => {
          j(c).performance = clamp(j(c).performance - randInt(1, 4));
          c.mentalHealth = clamp(c.mentalHealth - randInt(2, 5));
          return { text: "You avoided drama, but it eats at you.", tone: "bad" };
        },
      },
    ],
  },
  {
    id: "work-manager-feedback",
    title: "Manager Feedback",
    description: "Your annual review is in. Your manager has notes.",
    minAge: 18,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Ask for a growth plan",
        apply: (c) => {
          j(c).performance = clamp(j(c).performance + randInt(4, 9));
          j(c).managerRel = clamp((j(c).managerRel ?? 50) + randInt(3, 7));
          return { text: "You turned feedback into a concrete plan. Manager impressed.", tone: "good" };
        },
      },
      {
        label: "Negotiate a raise",
        apply: (c) => {
          if (j(c).performance >= 65 && Math.random() < 0.55) {
            j(c).salary = Math.round(j(c).salary * (1 + randInt(4, 9) / 100));
            return { text: `You made your case and earned a raise to $${j(c).salary.toLocaleString()}.`, tone: "milestone" };
          }
          j(c).managerRel = clamp((j(c).managerRel ?? 50) - randInt(0, 3));
          return { text: "The timing wasn't right — no raise this cycle.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "work-conference",
    title: "Conference Invitation",
    description: "You're invited to speak at an industry conference.",
    minAge: 20,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Attend and network",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + randInt(6, 12));
          c.businessReputation += randInt(1, 4);
          c.fame += randInt(0, 2);
          return { text: "You made valuable connections and raised your profile.", tone: "good" };
        },
      },
      {
        label: "Skip it — focus on delivery",
        apply: (c) => {
          j(c).performance = clamp(j(c).performance + randInt(2, 5));
          return { text: "You stayed heads-down and shipped good work.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "work-networking-dinner",
    title: "Networking Dinner",
    description: "A senior leader invites you to a small dinner with key players.",
    minAge: 20,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Go and make an impression",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + randInt(5, 10));
          j(c).managerRel = clamp((j(c).managerRel ?? 50) + randInt(2, 6));
          return { text: "You charmed the room. Doors are opening.", tone: "good" };
        },
      },
      {
        label: "Politely decline",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness + randInt(1, 3));
          return { text: "You valued your evening — no harm done.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "work-promotion-interview",
    title: "Promotion Interview",
    description: "You're up for a promotion. The panel wants to see readiness.",
    minAge: 20,
    maxAge: 120,
    weight: 1,
    condition: (c) => !!c.job && c.job.performance >= 60,
    choices: [
      {
        label: "Make your case confidently",
        apply: (c) => {
          const ok = Math.random() < 0.4 + j(c).performance / 300 + (j(c).managerRel ?? 50) / 400;
          if (ok) {
            j(c).performance = clamp(j(c).performance + randInt(6, 12));
            return { text: "Strong showing — you're firmly on the promotion track.", tone: "milestone" };
          }
          return { text: "A solid interview, but they want another year of results.", tone: "neutral" };
        },
      },
      {
        label: "Downplay it to avoid pressure",
        apply: (c) => {
          j(c).performance = clamp(j(c).performance - randInt(1, 4));
          return { text: "You took the pressure off, but missed a chance to shine.", tone: "bad" };
        },
      },
    ],
  },
];

/** Pick a relevant work event for the year. */
export function pickWorkEvent(c: Character): GameEvent | null {
  if (!c.job) return null;
  const pool = WORK_EVENTS.filter((e) => !e.condition || e.condition(c));
  if (!pool.length) return null;
  return randItem(pool);
}
