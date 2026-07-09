/* Headless test: Business, Investing, Real Estate, Contacts + save compat. */
import { ageUp, createCharacter, trySpendEnergy } from "../src/game/engine";
import {
  bizExpand, bizHire, bizImprove, bizLoan, bizMarketing, bizSeekInvestor, bizSell,
  bizSetPrices, resolveBizEvent, startBusiness,
} from "../src/game/business";
import {
  applyStrategy, buyProperty, invest, portfolioValue, refinance, renovate,
  sellProperty, setRented, withdraw,
} from "../src/game/investing";
import { askForHelp, canAskHelp, catchUp, meetContact } from "../src/game/contacts";
import type { Character } from "../src/game/types";

let failures = 0;
const check = (cond: boolean, label: string) => { if (!cond) { failures++; console.error(`  ✗ ${label}`); } };
const ageTo = (c: Character, age: number) => { while (c.age < age && c.alive) c = ageUp(c).character; return c; };

console.log("1) Old-save compat: pre-Build-10 character ages fine");
let c = createCharacter({ name: "Old", gender: "male", country: "Canada" });
delete (c as Partial<Character>).businessHub;
delete (c as Partial<Character>).investing;
delete (c as Partial<Character>).contacts;
let sim = JSON.parse(JSON.stringify(c)) as Character;
for (let i = 0; i < 30; i++) sim = ageUp(sim).character;
check(sim.age === 30, "aged to 30");
check(!sim.businessHub && !sim.investing, "new systems stay absent until used");
console.log("  ok");

console.log("2) Business lifecycle");
c = createCharacter({ name: "Founder", gender: "female", country: "United States" });
c = ageTo(c, 25);
c.money = 400000; c.stats.smarts = 80; c.networking = 70;
let r = startBusiness(c, "restaurant", "Testaurant");
check(r.ok, `start business (${r.message})`); c = r.character;
check(c.businessHub!.businesses.length === 1, "business registered");
c.yearActionsUsed = 0;
r = bizHire(c, c.businessHub!.businesses[0].id, trySpendEnergy); check(r.ok, "hire"); c = r.character;
r = bizMarketing(c, c.businessHub!.businesses[0].id, trySpendEnergy); check(r.ok, "marketing"); c = r.character;
r = bizImprove(c, c.businessHub!.businesses[0].id, trySpendEnergy); check(r.ok, "improve"); c = r.character;
r = bizHire(c, c.businessHub!.businesses[0].id, trySpendEnergy); check(!r.ok, "energy exhausts");
r = bizLoan(c, c.businessHub!.businesses[0].id); check(r.ok, "loan"); c = r.character;
// Run 8 years, resolve any events with option 0 (never the corrupt one by construction? option 0 is always safe-ish)
for (let i = 0; i < 8 && c.alive; i++) {
  c = ageUp(c).character;
  const b = c.businessHub!.businesses[0];
  if (b?.pendingEvent) { const res = resolveBizEvent(c, b.id, 0); check(res.ok, "event resolves"); c = res.character; }
  c.yearActionsUsed = 0;
  const bb = c.businessHub!.businesses[0];
  if (bb) {
    if (bb.reputation >= 45 && bb.cash > 200000) { const e = bizExpand(c, bb.id, trySpendEnergy); if (e.ok) c = e.character; }
    else { const m = bizImprove(c, bb.id, trySpendEnergy); if (m.ok) c = m.character; }
  }
}
const biz = c.businessHub!.businesses[0];
if (biz) {
  check(biz.revenue > 0, "revenue simulated");
  check(biz.valuation >= 0, "valuation computed");
  r = bizSetPrices(c, biz.id, "raise", (ch) => { ch.yearActionsUsed = 0; return trySpendEnergy(ch); }); check(r.ok, "price change"); c = r.character;
  r = bizSeekInvestor(c, c.businessHub!.businesses[0].id, (ch) => { ch.yearActionsUsed = 0; return trySpendEnergy(ch); }); check(r.ok, "seek investor runs"); c = r.character;
  r = bizSell(c, c.businessHub!.businesses[0].id); check(r.ok, "sell business"); c = r.character;
  check(c.businessHub!.businesses.length === 0, "business removed after sale");
} else {
  console.log("  (business went bankrupt during sim — acceptable path)");
}
console.log("  ok");

console.log("3) Investing & real estate");
c = createCharacter({ name: "Investor", gender: "male", country: "United Kingdom" });
c = ageTo(c, 30); c.money = 2000000;
r = invest(c, "stocks", 50000); check(r.ok, "buy stocks"); c = r.character;
r = invest(c, "crypto", 20000); check(r.ok, "buy crypto"); c = r.character;
r = applyStrategy(c, "balanced", 100000); check(r.ok, "strategy preset"); c = r.character;
check(portfolioValue(c.investing!) === 170000, "portfolio sums");
r = buyProperty(c, "condo"); check(r.ok, `buy condo (${r.message})`); c = r.character;
r = setRented(c, c.investing!.properties[0].id, true); check(r.ok, "rent out"); c = r.character;
r = renovate(c, c.investing!.properties[0].id); check(r.ok, "renovate"); c = r.character;
const moneyBefore = c.money;
for (let i = 0; i < 10; i++) c = ageUp(c).character;
check(c.investing!.lastYearReturnPct !== undefined, "returns tracked");
check(c.investing!.properties[0].yearsOwned === 10, "property ages");
check(c.investing!.properties[0].mortgage < 360000, "mortgage amortizes");
r = refinance(c, c.investing!.properties[0].id);
c = r.character; // may fail if LTV too low — either fine
r = sellProperty(c, c.investing!.properties[0].id); check(r.ok, "sell property"); c = r.character;
r = withdraw(c, "stocks", 999999999); check(r.ok, "sell all stocks"); c = r.character;
check(!c.investing!.holdings.find((h) => h.asset === "stocks"), "empty holding removed");
console.log(`  ok (10yr passive income kept money ${c.money > moneyBefore ? "growing" : "at " + Math.round(c.money)})`);

console.log("4) Contacts");
c = createCharacter({ name: "Networker", gender: "female", country: "Japan" });
c = ageTo(c, 22); c.money = 100000; c.networking = 50;
c.yearActionsUsed = 0;
r = meetContact(c, trySpendEnergy); check(r.ok, "meet contact"); c = r.character;
check(c.contacts!.length === 1, "contact stored");
const ct = c.contacts![0];
c.yearActionsUsed = 0;
r = catchUp(c, ct.id, trySpendEnergy); check(r.ok, "catch up"); c = r.character;
c.contacts![0].relationship = 80;
check(canAskHelp(c, c.contacts![0]).ok, "help gate opens at 80 rel");
r = askForHelp(c, ct.id); check(r.ok, `ask for help (${r.message})`); c = r.character;
check(!canAskHelp(c, c.contacts![0]).ok, "cooldown after help");
for (let i = 0; i < 3; i++) c = ageUp(c).character;
check(c.contacts![0].relationship < 80, "relationships decay");
console.log("  ok");

console.log("5) Mid-life save round-trip with all systems live");
c = createCharacter({ name: "Everything", gender: "male", country: "Germany" });
c = ageTo(c, 28); c.money = 1000000;
c = startBusiness(c, "tech", "Alles GmbH").character;
c = invest(c, "etf", 50000).character;
c = buyProperty(c, "house").character;
c.yearActionsUsed = 0;
c = meetContact(c, trySpendEnergy).character;
const restored = JSON.parse(JSON.stringify(c)) as Character;
let ok = true;
try { for (let i = 0; i < 15; i++) { const res = ageUp(restored as Character); Object.assign(restored, res.character); } } catch { ok = false; }
check(ok, "15 years post-round-trip without crash");
console.log("  ok");

console.log(failures === 0 ? "\nALL BUILD 10 CHECKS PASSED" : `\n${failures} FAILED`);
process.exit(failures ? 1 : 0);
