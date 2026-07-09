import type { GameEvent } from "./types";
import { clamp, randInt } from "./util";
import { chargeExpense } from "./economy";

function addLeadership(c: import("./types").Character, title: string) {
  c.edu.leadership = [...(c.edu.leadership ?? []), title];
}

export const EVENTS: GameEvent[] = [
  {
    id: "found_money",
    title: "Lucky Find",
    description: "You found a wallet stuffed with cash on the sidewalk. Nobody is around.",
    minAge: 8,
    maxAge: 90,
    weight: 3,
    choices: [
      {
        label: "Keep the cash",
        apply: (c) => {
          c.money += 400;
          c.stats.happiness = clamp(c.stats.happiness + 6);
          return { text: "You pocketed $400. Guilt? Never heard of her.", tone: "good" };
        },
      },
      {
        label: "Turn it in",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness + 10);
          return { text: "The owner rewarded your honesty. You feel great.", tone: "good" };
        },
      },
    ],
  },
  {
    id: "bully",
    title: "The Schoolyard Bully",
    description: "A bully is picking on a smaller kid during recess.",
    minAge: 7,
    maxAge: 15,
    weight: 3,
    choices: [
      {
        label: "Stand up to them",
        apply: (c) => {
          const win = Math.random() > 0.4;
          if (win) {
            c.stats.happiness = clamp(c.stats.happiness + 8);
            c.stats.looks = clamp(c.stats.looks + 2);
            return { text: "You backed the bully down. You're a legend now.", tone: "good" };
          }
          c.stats.health = clamp(c.stats.health - 8);
          return { text: "It ended in a scuffle. You got a black eye.", tone: "bad" };
        },
      },
      {
        label: "Walk away",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness - 4);
          return { text: "You avoided trouble, but felt uneasy.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "party_invite",
    title: "House Party",
    description: "You're invited to the biggest party of the year the night before a big exam.",
    minAge: 15,
    maxAge: 24,
    weight: 3,
    choices: [
      {
        label: "Go party",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness + 12);
          c.stats.smarts = clamp(c.stats.smarts - 4);
          return { text: "Unforgettable night. The exam? Less so.", tone: "neutral" };
        },
      },
      {
        label: "Study instead",
        apply: (c) => {
          c.stats.smarts = clamp(c.stats.smarts + 6);
          c.stats.happiness = clamp(c.stats.happiness - 5);
          return { text: "You aced the exam and felt slightly like a hermit.", tone: "good" };
        },
      },
    ],
  },
  {
    id: "stock_tip",
    title: "Hot Stock Tip",
    description: "A friend swears a tiny company is about to explode. Want in?",
    minAge: 20,
    maxAge: 90,
    weight: 2,
    condition: (c) => c.money > 2000,
    choices: [
      {
        label: "Invest $2,000",
        apply: (c) => {
          c.money -= 2000;
          const win = Math.random() > 0.5;
          if (win) {
            const gain = 2000 + Math.floor(Math.random() * 8000);
            c.money += 2000 + gain;
            return { text: `The stock soared! You made $${gain.toLocaleString()}.`, tone: "good" };
          }
          return { text: "The company tanked. Your $2,000 is gone.", tone: "bad" };
        },
      },
      {
        label: "Pass",
        apply: () => ({ text: "You kept your money safe.", tone: "neutral" }),
      },
    ],
  },
  {
    id: "promotion_offer",
    title: "Extra Responsibility",
    description: "Your boss offers you a demanding project that could fast-track your career.",
    minAge: 22,
    maxAge: 65,
    weight: 3,
    condition: (c) => !!c.job,
    choices: [
      {
        label: "Take it on",
        apply: (c) => {
          if (c.job) c.job.performance = clamp(c.job.performance + 15);
          c.stats.happiness = clamp(c.stats.happiness - 6);
          c.stats.health = clamp(c.stats.health - 4);
          return { text: "You impressed leadership, but you're exhausted.", tone: "good" };
        },
      },
      {
        label: "Decline politely",
        apply: (c) => {
          if (c.job) c.job.performance = clamp(c.job.performance - 5);
          return { text: "You protected your evenings, but got overlooked.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "illness",
    title: "Feeling Unwell",
    description: "You've been coughing for weeks and feeling drained.",
    minAge: 5,
    maxAge: 95,
    weight: 2,
    choices: [
      {
        label: "See a doctor ($300)",
        apply: (c) => {
          const res = chargeExpense(c, 300, { label: "medical bill" });
          c.stats.health = clamp(c.stats.health + 12);
          return {
            text: `${res.message} The doctor sorted you out — back to full strength.`,
            tone: res.paidBy === "family-debt" ? "neutral" : "good",
          };
        },
      },
      {
        label: "Tough it out",
        apply: (c) => {
          const bad = Math.random() > 0.5;
          c.stats.health = clamp(c.stats.health - (bad ? 15 : 4));
          return {
            text: bad
              ? "It got worse. You should have gone in."
              : "You slowly recovered on your own.",
            tone: bad ? "bad" : "neutral",
          };
        },
      },
    ],
  },
  {
    id: "crush",
    title: "Someone Caught Your Eye",
    description: "There's someone you can't stop thinking about. Make a move?",
    minAge: 16,
    maxAge: 70,
    weight: 3,
    condition: (c) => !c.relationships.some((r) => r.type === "partner" && r.alive),
    choices: [
      {
        label: "Ask them out",
        apply: (c) => {
          const yes = Math.random() < (c.stats.looks + c.stats.happiness) / 220 + 0.25;
          if (yes) {
            c.stats.happiness = clamp(c.stats.happiness + 15);
            return { text: "They said yes! A new relationship begins.", tone: "milestone" };
          }
          c.stats.happiness = clamp(c.stats.happiness - 8);
          return { text: "They turned you down. Ouch.", tone: "bad" };
        },
      },
      {
        label: "Keep it to yourself",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness - 3);
          return { text: "The moment passed.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "inheritance",
    title: "A Letter from a Lawyer",
    description: "A distant relative has passed and left you something in their will.",
    minAge: 25,
    maxAge: 90,
    weight: 1,
    choices: [
      {
        label: "Open the letter",
        apply: (c) => {
          const amount = 5000 + Math.floor(Math.random() * 45000);
          c.money += amount;
          return { text: `You inherited $${amount.toLocaleString()}!`, tone: "good" };
        },
      },
    ],
  },
  {
    id: "gym_dare",
    title: "Fitness Challenge",
    description: "A friend dares you to commit to a brutal 6-month training plan.",
    minAge: 16,
    maxAge: 60,
    weight: 2,
    choices: [
      {
        label: "Accept the challenge",
        apply: (c) => {
          c.stats.health = clamp(c.stats.health + 12);
          c.stats.looks = clamp(c.stats.looks + 8);
          c.stats.happiness = clamp(c.stats.happiness - 3);
          return { text: "You're in the best shape of your life.", tone: "good" };
        },
      },
      {
        label: "Nah, order pizza",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness + 4);
          c.stats.health = clamp(c.stats.health - 3);
          return { text: "Pizza won. It was delicious.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "shoplift",
    title: "Five-Finger Discount?",
    description: "You're broke and staring at something you really want in a store.",
    minAge: 13,
    maxAge: 40,
    weight: 1,
    choices: [
      {
        label: "Steal it",
        apply: (c) => {
          const caught = Math.random() > 0.6;
          if (caught) {
            c.criminalRecord += 1;
            c.stats.happiness = clamp(c.stats.happiness - 12);
            c.money -= 250;
            return { text: "You got caught and fined $250. Criminal record started.", tone: "bad" };
          }
          c.stats.happiness = clamp(c.stats.happiness + 4);
          return { text: "You got away with it this time.", tone: "neutral" };
        },
      },
      {
        label: "Walk out empty-handed",
        apply: () => ({ text: "You did the right thing.", tone: "neutral" }),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Campus life — university semesters present meaningful decisions. Events
// prefixed "campus_" are prioritized while enrolled in college.
// ---------------------------------------------------------------------------
export const CAMPUS_EVENTS: GameEvent[] = [
  {
    id: "campus_research",
    title: "Research Opportunity",
    description:
      "A professor was impressed by your work and offers you a research assistant position this semester.",
    minAge: 18,
    maxAge: 26,
    weight: 5,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Accept the research position",
        apply: (c) => {
          c.edu.research = (c.edu.research ?? 0) + 1;
          c.edu.studyHours += 8;
          c.stats.smarts = clamp(c.stats.smarts + 3);
          c.stats.happiness = clamp(c.stats.happiness - 2);
          return {
            text: "You joined the lab. Long hours, but your resume and grad-school odds just improved.",
            tone: "good",
          };
        },
      },
      {
        label: "Ask for a recommendation letter instead",
        apply: (c) => {
          if (Math.random() < 0.5) {
            c.edu.recLetters = (c.edu.recLetters ?? 0) + 1;
            return {
              text: "The professor happily wrote you a glowing recommendation letter.",
              tone: "good",
            };
          }
          return {
            text: "The professor politely suggested you earn it through the lab first.",
            tone: "neutral",
          };
        },
      },
      {
        label: "Decline — protect your GPA",
        apply: (c) => {
          c.edu.studyHours += 4;
          return { text: "You focused on coursework instead.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "campus_office_hours",
    title: "Office Hours",
    description:
      "A brutal midterm is coming. Your professor recommends attending office hours this week.",
    minAge: 18,
    maxAge: 26,
    weight: 4,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Attend office hours",
        apply: (c) => {
          c.edu.studyHours += 6;
          c.stats.smarts = clamp(c.stats.smarts + 2);
          c.networking = clamp((c.networking ?? 0) + 3);
          return {
            text: "The professor now knows your name — and the midterm made sense.",
            tone: "good",
          };
        },
      },
      {
        label: "Cram alone",
        apply: (c) => {
          c.edu.studyHours += 3;
          c.stats.happiness = clamp(c.stats.happiness - 2);
          return { text: "You survived on caffeine and flashcards.", tone: "neutral" };
        },
      },
      {
        label: "Wing it",
        apply: (c) => {
          c.edu.studyHours -= 2;
          return { text: "You winged it. The exam did not go great.", tone: "bad" };
        },
      },
    ],
  },
  {
    id: "campus_stugov",
    title: "Student Government Elections",
    description: "Nominations for student government open this week. Friends say you'd win.",
    minAge: 18,
    maxAge: 25,
    weight: 3,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Run for student government",
        apply: (c) => {
          if (Math.random() < 0.45 + (c.stats.happiness - 50) / 300) {
            addLeadership(c, "Student Government Representative (university)");
            c.networking = clamp((c.networking ?? 0) + 8);
            return {
              text: "You won the seat! Leadership on the resume, and half the campus knows you now.",
              tone: "milestone",
            };
          }
          c.stats.happiness = clamp(c.stats.happiness - 3);
          return {
            text: "You lost a close race — but made great connections campaigning.",
            tone: "neutral",
          };
        },
      },
      {
        label: "Manage a friend's campaign",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + 4);
          return { text: "Your friend won and owes you one.", tone: "good" };
        },
      },
      {
        label: "Stay out of politics",
        apply: () => ({ text: "You watched the debates with popcorn instead.", tone: "neutral" }),
      },
    ],
  },
  {
    id: "campus_greek",
    title: "Greek Life Rush",
    description: "A fraternity/sorority invites you to their recruitment event.",
    minAge: 18,
    maxAge: 23,
    weight: 3,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Rush and join",
        apply: (c) => {
          c.stats.happiness = clamp(c.stats.happiness + 6);
          c.networking = clamp((c.networking ?? 0) + 10);
          c.edu.studyHours -= 3;
          return {
            text: "You're in. The parties are legendary and the alumni network is real — but your study time shrank.",
            tone: "good",
          };
        },
      },
      {
        label: "Attend the event, skip pledging",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + 3);
          c.stats.happiness = clamp(c.stats.happiness + 2);
          return { text: "Great night, zero obligations.", tone: "neutral" };
        },
      },
      {
        label: "Pass entirely",
        apply: (c) => {
          c.edu.studyHours += 2;
          return { text: "Quiet semester. Your GPA thanks you.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "campus_recruiter",
    title: "Campus Recruiter Visit",
    description: "A major firm is holding a company presentation and resume screen on campus.",
    minAge: 19,
    maxAge: 26,
    weight: 4,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Attend and work the room",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + randInt(5, 10));
          return {
            text: "You collected business cards and left an impression. Recruiters remember names.",
            tone: "good",
          };
        },
      },
      {
        label: "Just drop a resume",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + 2);
          return { text: "Resume submitted. Low effort, low signal.", tone: "neutral" };
        },
      },
      {
        label: "Skip it",
        apply: () => ({ text: "You skipped the info session.", tone: "neutral" }),
      },
    ],
  },
  {
    id: "campus_mock_interview",
    title: "Career Center Workshop",
    description: "The career center is running mock interviews and a resume workshop this week.",
    minAge: 18,
    maxAge: 26,
    weight: 3,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Do the mock interview",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + 4);
          c.stats.smarts = clamp(c.stats.smarts + 1);
          return {
            text: "Brutal feedback, better answers. You interview noticeably stronger now.",
            tone: "good",
          };
        },
      },
      {
        label: "Polish the resume only",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + 2);
          return { text: "Your resume reads much sharper.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "campus_job_shifts",
    title: "Extra Shifts Offered",
    description: "Your campus job offers extra shifts during a busy stretch.",
    minAge: 18,
    maxAge: 26,
    weight: 2,
    condition: (c) => c.education === "college" && !!c.collegeFinance?.workStudyRole,
    choices: [
      {
        label: "Take the shifts",
        apply: (c) => {
          c.money += 900;
          c.stats.happiness = clamp(c.stats.happiness - 2);
          c.edu.studyHours -= 2;
          return {
            text: "You pocketed an extra $900, at the cost of some sleep and study time.",
            tone: "neutral",
          };
        },
      },
      {
        label: "Guard your study time",
        apply: (c) => {
          c.edu.studyHours += 2;
          return { text: "You kept your priorities straight.", tone: "good" };
        },
      },
    ],
  },
  {
    id: "campus_networking_dinner",
    title: "Alumni Networking Dinner",
    description: "An alumni association dinner has two open seats for current students.",
    minAge: 18,
    maxAge: 26,
    weight: 3,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Go and make connections",
        apply: (c) => {
          c.networking = clamp((c.networking ?? 0) + randInt(6, 12));
          if (Math.random() < 0.3) {
            c.edu.recLetters = (c.edu.recLetters ?? 0) + 1;
            return {
              text: "You hit it off with an alum who offered to vouch for you — a real recommendation in hand.",
              tone: "milestone",
            };
          }
          return { text: "Great conversations, stronger network.", tone: "good" };
        },
      },
      {
        label: "Skip — midterms",
        apply: (c) => {
          c.edu.studyHours += 3;
          return { text: "Books over banquets this time.", tone: "neutral" };
        },
      },
    ],
  },
  {
    id: "campus_volunteer",
    title: "Volunteer Drive",
    description: "A local nonprofit needs student volunteers for a weekend program.",
    minAge: 18,
    maxAge: 26,
    weight: 2,
    condition: (c) => c.education === "college",
    choices: [
      {
        label: "Volunteer",
        apply: (c) => {
          c.edu.volunteer = (c.edu.volunteer ?? 0) + 1;
          c.stats.happiness = clamp(c.stats.happiness + 4);
          return {
            text: "A meaningful weekend — and a resume line that shows character.",
            tone: "good",
          };
        },
      },
      {
        label: "Not this time",
        apply: () => ({ text: "You kept your weekend.", tone: "neutral" }),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Club leadership — clubs generate opportunities instead of sitting as labels.
// ---------------------------------------------------------------------------
export const CLUB_EVENTS: GameEvent[] = [
  {
    id: "club_president",
    title: "Club Elections",
    description: "Your club is electing next year's president, and members are urging you to run.",
    minAge: 12,
    maxAge: 25,
    weight: 4,
    condition: (c) => c.edu.clubs.length > 0 && ["middle", "high", "college"].includes(c.education),
    choices: [
      {
        label: "Run for president",
        apply: (c) => {
          const club = c.edu.clubs[0];
          if (Math.random() < 0.5 + c.stats.smarts / 400) {
            addLeadership(c, `President, ${club}`);
            c.stats.happiness = clamp(c.stats.happiness + 5);
            return {
              text: `You were elected president of the ${club}! Scholarships and admissions committees love this.`,
              tone: "milestone",
            };
          }
          return {
            text: "You lost the election, but members respected the campaign.",
            tone: "neutral",
          };
        },
      },
      {
        label: "Run for treasurer instead",
        apply: (c) => {
          const club = c.edu.clubs[0];
          if (Math.random() < 0.7) {
            addLeadership(c, `Treasurer, ${club}`);
            return {
              text: `You're the new treasurer of the ${club}. Quiet, reliable leadership.`,
              tone: "good",
            };
          }
          return { text: "Someone else got the role this year.", tone: "neutral" };
        },
      },
      {
        label: "Step back to focus on grades",
        apply: (c) => {
          c.edu.studyHours += 3;
          return {
            text: "You stayed a regular member and protected your study time.",
            tone: "neutral",
          };
        },
      },
    ],
  },
  {
    id: "club_tournament",
    title: "Regional Tournament",
    description: "Your club qualified for a regional competition this semester.",
    minAge: 12,
    maxAge: 25,
    weight: 3,
    condition: (c) => c.edu.clubs.length > 0 && ["middle", "high", "college"].includes(c.education),
    choices: [
      {
        label: "Compete",
        apply: (c) => {
          if (Math.random() < 0.35 + c.stats.smarts / 300) {
            c.edu.awards.push(`Regional ${c.edu.clubs[0]} Champion (age ${c.age})`);
            c.stats.happiness = clamp(c.stats.happiness + 6);
            return {
              text: `Your team won the regional ${c.edu.clubs[0]} tournament! Award added to your record.`,
              tone: "milestone",
            };
          }
          c.stats.smarts = clamp(c.stats.smarts + 2);
          return {
            text: "You placed mid-field, but the experience sharpened you.",
            tone: "neutral",
          };
        },
      },
      {
        label: "Sit this one out",
        apply: () => ({ text: "You cheered from the audience.", tone: "neutral" }),
      },
    ],
  },
  {
    id: "club_fundraiser",
    title: "Fundraiser Lead",
    description: "Your club needs someone to organize its annual fundraiser.",
    minAge: 12,
    maxAge: 25,
    weight: 3,
    condition: (c) => c.edu.clubs.length > 0 && ["middle", "high", "college"].includes(c.education),
    choices: [
      {
        label: "Lead the fundraiser",
        apply: (c) => {
          addLeadership(c, `Fundraiser Lead, ${c.edu.clubs[0]}`);
          c.edu.volunteer = (c.edu.volunteer ?? 0) + 1;
          return {
            text: "You ran the fundraiser and beat last year's total. Leadership, demonstrated.",
            tone: "good",
          };
        },
      },
      {
        label: "Help behind the scenes",
        apply: (c) => {
          c.edu.volunteer = (c.edu.volunteer ?? 0) + 1;
          return { text: "You pitched in without the spotlight.", tone: "neutral" };
        },
      },
      { label: "Pass", apply: () => ({ text: "Someone else stepped up.", tone: "neutral" }) },
    ],
  },
  {
    id: "club_mentor",
    title: "Mentor Younger Students",
    description: "The club advisor asks you to mentor incoming members this year.",
    minAge: 14,
    maxAge: 25,
    weight: 2,
    condition: (c) => c.edu.clubs.length > 0 && ["high", "college"].includes(c.education),
    choices: [
      {
        label: "Mentor them",
        apply: (c) => {
          addLeadership(c, `Peer Mentor, ${c.edu.clubs[0]}`);
          c.stats.happiness = clamp(c.stats.happiness + 3);
          return { text: "Your mentees thrived — and the advisor noticed.", tone: "good" };
        },
      },
      { label: "Decline politely", apply: () => ({ text: "Not this year.", tone: "neutral" }) },
    ],
  },
];

EVENTS.push(...CAMPUS_EVENTS, ...CLUB_EVENTS);
