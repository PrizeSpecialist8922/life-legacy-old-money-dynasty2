import { useState } from "react";
import { Crown, Flame, Landmark, Mail, ScrollText, Shield, Users } from "lucide-react";
import { lifeLegacyScore, livingChildren, writeLetter, writeWill } from "../../game/legacy";
import {
  ENDOWMENTS,
  acquireSeat,
  buyBackSeat,
  challengeTrust,
  closeWing,
  commissionPortrait,
  createTrust,
  endow,
  invokeAncestor,
  openTheRoom,
  payQuietCosts,
  sellPainting,
  sellSeat,
} from "../../game/oldmoney";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import type { Character, LogTone } from "../../game/types";
import { formatMoney } from "../../game/util";

type AnyResult = { character: Character; message: string; tone: LogTone; ok: boolean };
type Act = (fn: (c: Character) => AnyResult) => void;

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";
const btnDanger =
  "rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

export function LegacyView({ c, act }: { c: Character; act: Act }) {
  const kids = livingChildren(c);
  const will = c.will ?? { charityPct: 0, written: false, heirId: undefined };
  const [heirPick, setHeirPick] = useState<string | undefined>(will.heirId);
  const [charity, setCharity] = useState(will.charityPct);
  const [seatName, setSeatName] = useState("");
  const [letterText, setLetterText] = useState("");
  const [letterAge, setLetterAge] = useState(21);
  const [portraitEmphasis, setPortraitEmphasis] = useState("hands");
  const [trustPct, setTrustPct] = useState(5);
  const dyn2 = c.dynasty;
  const seat = dyn2?.seat;
  const sin = dyn2?.sin;
  void ACTIONS_PER_YEAR;
  const dyn = c.dynasty;
  const thisLife = lifeLegacyScore(c);

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">
            {dyn ? `The ${dyn.familyName} Dynasty` : "Your Legacy"}
          </h3>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          What you build outlives you — if the handoff survives taxes, lawyers, and grudges.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Generation" value={`${dyn?.generation ?? 1}`} />
          <Stat label="Dynasty Score" value={`${dyn?.legacyScore ?? 0}`} />
          <Stat label="This Life (so far)" value={`+${thisLife}`} />
          <Stat label="Family Reputation" value={`${dyn?.reputation ?? 50}/100`} />
          <Stat label="Pedigree" value={`${Math.round(dyn?.pedigree ?? 0)}/100`} />
        </div>
        {dyn &&
          (dyn.officesWon > 0 ||
            dyn.championships > 0 ||
            dyn.awards > 0 ||
            dyn.crimesGottenAwayWith > 0) && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Across generations: {formatMoney(dyn.wealthCreated)} created · {dyn.officesWon}{" "}
              elections won · {dyn.championships} championships · {dyn.awards} awards ·{" "}
              {dyn.billsPassed} bills passed
              {dyn.crimesGottenAwayWith > 0
                ? ` · ${dyn.crimesGottenAwayWith} crimes never answered for`
                : ""}
            </p>
          )}
        {dyn?.markedBySyndicate && (
          <p className="mt-1 text-[11px] text-red-400">
            This family is marked — an ancestor turned informant, and {dyn.markedBySyndicate}{" "}
            remember.
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Last Will & Testament</h3>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          {will.written
            ? "Filed and current. Update it as life changes."
            : "No will means executor fire-sales, probate lawyers, and cousins you've never met. Write one."}
        </p>
        {kids.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No living children yet — the dynasty needs an heir before a will means much.
          </p>
        ) : (
          <div className="space-y-1.5">
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => setHeirPick(k.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                  heirPick === k.id
                    ? "border-primary/60 bg-primary/15 font-semibold"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                {k.name}{" "}
                <span className="text-muted-foreground">
                  · age {k.age} · relationship {k.relationship}
                </span>
                {will.heirId === k.id && (
                  <span className="ml-1 text-[10px] font-bold text-primary">CURRENT HEIR</span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Charity: {charity}%</span>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={charity}
            onChange={(e) => setCharity(Number(e.target.value))}
            className="w-40"
          />
          <span className="text-[11px] text-muted-foreground">
            (20%+ boosts family reputation at death)
          </span>
        </div>
        <button
          className={`${btn} mt-2 w-full`}
          disabled={c.age < 18}
          onClick={() => act((ch) => writeWill(ch, heirPick, charity))}
        >
          {will.written ? "Update the Will" : "Write the Will"}
        </button>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Estate tax: first $1M free, 25% to $5M, 40% above. Named heirs keep businesses; without a
          will, executors fire-sale half of them at 70¢.
        </p>
      </div>

      {/* ---------- The Family Seat ---------- */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">{seat ? seat.name : "The Family Seat"}</h3>
        </div>
        {!seat ? (
          dyn2?.lostSeat ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                The family lost {dyn2.lostSeat.name}. Strangers live there. The game remembers the
                address — and so does everyone who matters.
              </p>
              <button className={btn} onClick={() => act((ch) => buyBackSeat(ch, trySpendEnergy))}>
                Buy It Back (~{formatMoney(Math.round(dyn2.lostSeat.price * 1.5))}, 1⚡) — the great
                unfinished business
              </button>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Not an asset — an anchor. Weddings, funerals, portraits, and the reading of wills
                happen at a Seat. $2,500,000 and it never stops costing you, which is the point.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  className="rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
                  placeholder="Name it (or leave blank)"
                  value={seatName}
                  onChange={(e) => setSeatName(e.target.value)}
                />
                <button
                  className={btn}
                  disabled={c.money < 2500000}
                  onClick={() =>
                    act((ch) => acquireSeat(ch, seatName || undefined, trySpendEnergy))
                  }
                >
                  Acquire the Seat (1⚡)
                </button>
              </div>
            </>
          )
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Held {seat.yearsHeld} year(s) · prestige {seat.housePrestige} · upkeep{" "}
              {formatMoney(
                Math.round(
                  seat.value *
                    0.015 *
                    (seat.closedWings === 0 ? 1 : seat.closedWings === 1 ? 0.5 : 0.3),
                ),
              )}
              /yr
              {seat.upkeepOwedYears > 0 ? ` · ⚠ ${seat.upkeepOwedYears} yr unpaid` : ""}
              {seat.closedWings > 0 ? ` · ${seat.closedWings} wing(s) closed` : ""}
              {seat.paintingsSold > 0 ? ` · ${seat.paintingsSold} painting(s) gone` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <select
                className="rounded-lg border border-white/10 bg-background px-2 py-1.5 text-[11px]"
                value={portraitEmphasis}
                onChange={(e) => setPortraitEmphasis(e.target.value)}
              >
                {[
                  "hands",
                  "medals",
                  "books",
                  "the view of the grounds",
                  "a single raised eyebrow",
                ].map((x) => (
                  <option key={x} value={x}>
                    Portrait emphasis: {x}
                  </option>
                ))}
              </select>
              <button
                className={btn}
                onClick={() =>
                  act((ch) => commissionPortrait(ch, portraitEmphasis, 1, trySpendEnergy))
                }
              >
                Commission Portrait ($150k, 1⚡)
              </button>
              <button
                className={btn}
                disabled={seat.ancestorInvoked || !dyn2?.ancestors.length}
                onClick={() => act(invokeAncestor)}
              >
                Invoke an Ancestor (once per lifetime)
              </button>
            </div>
            <p className="mb-1 mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              If the money runs thin — lose it beautifully:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button className={btnGhost} onClick={() => act(closeWing)}>
                Close a Wing (halves upkeep, dignity intact)
              </button>
              <button className={btnGhost} onClick={() => act(sellPainting)}>
                Sell a Painting (quietly, on a Tuesday)
              </button>
              <button className={btnDanger} onClick={() => act(sellSeat)}>
                Sell the Seat (pedigree −25 — the nuclear option)
              </button>
            </div>
            {seat.portraits.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                The hall:{" "}
                {seat.portraits
                  .map((p2) => `Gen ${p2.generation} — ${p2.name} (${p2.emphasis})`)
                  .join(" · ")}
              </p>
            )}
          </>
        )}
      </div>

      {/* ---------- The Trust ---------- */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">The Family Trust</h3>
        </div>
        {!dyn2?.trust ? (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Lock 80% of your cash behind rules your heirs must live under. The corpus survives
              estate tax, lawsuits, and their worst instincts — they draw an allowance and answer to
              your dead hand. Age 40+, $2M+ cash.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Allowance {trustPct}%/yr</span>
              <input
                type="range"
                min={2}
                max={8}
                value={trustPct}
                onChange={(e) => setTrustPct(Number(e.target.value))}
                className="w-32"
              />
              <button
                className={btn}
                disabled={c.age < 40 || c.money < 2000000}
                onClick={() =>
                  act((ch) =>
                    createTrust(ch, trustPct, {
                      cleanRecord: true,
                      mustGraduate: true,
                      seatEntailed: true,
                    }),
                  )
                }
              >
                Execute the Trust (clean-record + education clauses, Seat entailed)
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Corpus {formatMoney(dyn2.trust.corpus)} · allowance {dyn2.trust.allowancePct}%/yr ·
              written by generation {dyn2.trust.createdGen}
              {dyn2.trust.conditions.cleanRecord ? " · clean-record clause" : ""}
              {dyn2.trust.conditions.mustGraduate ? " · education clause" : ""}
              {dyn2.trust.conditions.seatEntailed ? " · Seat entailed" : ""}
            </p>
            {dyn2.trust.createdGen !== dyn2.generation && !dyn2.trust.challengedOnce && (
              <button className={btnDanger} onClick={() => act(challengeTrust)}>
                Petition to Break the Trust (one attempt, ever — the fight will be in the papers)
              </button>
            )}
          </>
        )}
      </div>

      {/* ---------- The Matter (the Family Sin) ---------- */}
      {sin && (
        <div className="glass rounded-2xl border border-red-400/20 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-400" />
            <h3 className="text-base font-bold">
              {sin.detonated ? "The Matter, Public" : sin.known ? "The Matter" : "The Locked Room"}
            </h3>
          </div>
          {sin.detonated ? (
            <p className="text-xs text-muted-foreground">
              It all came out. The family carries it openly now — which is, the Dowager notes, at
              least cheaper.
            </p>
          ) : sin.known ? (
            <>
              <p className="mb-2 text-xs italic text-muted-foreground">{sin.text}</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Exposure: {sin.exposure}/100 — at 100, it detonates. Quiet costs keep the seal.
              </p>
              <button
                className={btn}
                disabled={sin.exposure <= 0}
                onClick={() => act(payQuietCosts)}
              >
                Pay the Quiet Costs
              </button>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Every fortune has a first chapter nobody reads aloud. This family's is sealed —
                exposure {sin.exposure}/100. You can open the room and know, or keep paying not to.
              </p>
              <div className="flex gap-1.5">
                <button className={btnDanger} onClick={() => act(openTheRoom)}>
                  Open the Room
                </button>
                <button
                  className={btn}
                  disabled={sin.exposure <= 0}
                  onClick={() => act(payQuietCosts)}
                >
                  Pay the Quiet Costs
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- Patronage ---------- */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Patronage</h3>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Convert money into time: endowed institutions carry the name in stone, in perpetuity. New
          money buys things; old money buys forever.
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {ENDOWMENTS.map((e) => (
            <button
              key={e.id}
              className={btn}
              disabled={c.money < e.cost || (dyn2?.patronage ?? []).includes(e.label)}
              onClick={() => act((ch) => endow(ch, e.id, trySpendEnergy))}
            >
              {e.label} ({formatMoney(e.cost)})
            </button>
          ))}
        </div>
        {(dyn2?.patronage?.length ?? 0) > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            In perpetuity: {dyn2!.patronage!.join(" · ")}
          </p>
        )}
      </div>

      {/* ---------- The Heirloom Letter ---------- */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">A Letter to the Future</h3>
        </div>
        {will.letter && !will.letter.delivered ? (
          <p className="text-xs text-muted-foreground">
            A letter is sealed — opens at age {will.letter.openAtAge}
            {will.letter.attachedMoney
              ? `, ${formatMoney(will.letter.attachedMoney)} enclosed`
              : ""}
            . Writing a new one replaces it.
          </p>
        ) : null}
        <textarea
          className="mt-1 w-full rounded-lg border border-white/10 bg-background px-2 py-1.5 text-xs"
          rows={3}
          maxLength={600}
          placeholder={
            '"Do not trust the Ashfords." — words for an heir you may never meet. Delivered at the age you choose, in whatever world exists then.'
          }
          value={letterText}
          onChange={(e) => setLetterText(e.target.value)}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Opens at heir's age {letterAge}</span>
          <input
            type="range"
            min={16}
            max={50}
            value={letterAge}
            onChange={(e) => setLetterAge(Number(e.target.value))}
            className="w-32"
          />
          <button
            className={btn}
            disabled={!letterText.trim()}
            onClick={() => act((ch) => writeLetter(ch, letterText, letterAge, 0))}
          >
            Seal the Letter
          </button>
          <button
            className={btnGhost}
            disabled={!letterText.trim() || c.money < 100000}
            onClick={() => act((ch) => writeLetter(ch, letterText, letterAge, 100000))}
          >
            Seal with $100k Enclosed
          </button>
        </div>
      </div>

      {(dyn?.ancestors.length ?? 0) > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">The Ancestors</h3>
          </div>
          <div className="space-y-1.5">
            {[...dyn!.ancestors].reverse().map((a, i) => (
              <div key={i} className="rounded-lg bg-white/5 px-3 py-2">
                <p className="text-xs font-semibold">
                  {a.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · Gen {a.generation} · died at {a.diedAge} · +{a.legacyEarned} legacy
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{a.headline}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
