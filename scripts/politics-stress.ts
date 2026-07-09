/* Full-lifetime stress: random political play from 18 to death, must never throw. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  canHoldVote,
  fundraise,
  holdVote,
  joinParty,
  launchCampaign,
  mediaAppearance,
  nextCampaignEvent,
  officeListings,
  playCampaignEvent,
  policyDecision,
  proposeBill,
  resolveCrisis,
  resolveDebate,
  debateQuestions,
  setIdeology,
  seekAppointment,
} from "../src/game/politics";
import { ISSUES, partiesFor } from "../src/game/politicsData";
import type { Character, PoliticalIssue } from "../src/game/types";

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Japan",
  "India",
  "Brazil",
  "Germany",
  "France",
  "Nigeria",
  "Australia",
];
const ri = (n: number) => Math.floor(Math.random() * n);

for (let run = 0; run < 10; run++) {
  const country = COUNTRIES[run % COUNTRIES.length];
  let c: Character = createCharacter({
    name: `Stress${run}`,
    gender: run % 2 ? "male" : "female",
    country,
  });
  let ideoSet = false;
  let ops = 0;
  while (c.alive && c.age < 95) {
    c = ageUp(c).character;
    if (c.age < 18 || !c.alive) continue;
    if (!ideoSet) {
      const ideo = {} as Record<PoliticalIssue, number>;
      for (const i of ISSUES) ideo[i.id] = ri(3);
      c = setIdeology(c, ideo).character;
      const ps = partiesFor(country);
      c = joinParty(c, ps[ri(ps.length)].id).character;
      ideoSet = true;
    }
    // Random political flailing every year
    for (let a = 0; a < 4; a++) {
      const p = c.politics!;
      ops++;
      if (p.pendingCrisis) {
        c = resolveCrisis(c, ri(p.pendingCrisis.options.length)).character;
        continue;
      }
      if (p.campaign) {
        const ev = nextCampaignEvent(c);
        if (ev && p.campaign.eventsDone < p.campaign.eventsTotal) {
          c = playCampaignEvent(c, ev.id, ri(ev.choices.length)).character;
          continue;
        }
        if (p.campaign.stage === "general" && !p.campaign.debateDone) {
          const ans = {} as Record<PoliticalIssue, number>;
          for (const q of debateQuestions(c)) ans[q.issue] = ri(3);
          c = resolveDebate(c, ans).character;
          continue;
        }
        if (canHoldVote(c).ok) {
          c = holdVote(c).character;
          continue;
        }
      } else {
        const open = officeListings(c).filter(
          (l) => l.status === "eligible" || l.status === "skip" || (l.status === "held" && false),
        );
        if (open.length && Math.random() < 0.6) {
          const pick = open[ri(open.length)];
          c = (
            pick.def.selection === "appointment"
              ? seekAppointment(c, pick.def.id)
              : launchCampaign(c, pick.def.id)
          ).character;
          continue;
        }
      }
      const roll = ri(4);
      if (roll === 0) c = fundraise(c, trySpendEnergy).character;
      else if (roll === 1) c = mediaAppearance(c, "tv", trySpendEnergy).character;
      else if (roll === 2 && c.politics!.office)
        c = policyDecision(c, "economy", "invest", trySpendEnergy).character;
      else if (c.politics!.office)
        c = proposeBill(c, "crime", "negotiate", trySpendEnergy).character;
    }
    // Save round-trip every decade
    if (c.age % 10 === 0) c = JSON.parse(JSON.stringify(c));
  }
  const p = c.politics;
  console.log(
    `run ${run} (${country}): died ${c.age}, ops ${ops}, wins ${p?.electionHistory.filter((e) => e.result === "won").length ?? 0}, highest lvl ${p?.highestLevelWon ?? -1}, bills ${p?.billsPassed ?? 0}, scandalRisk ${p?.scandalRisk ?? 0}`,
  );
}
console.log("STRESS PASSED");
