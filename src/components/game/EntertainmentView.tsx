import {
  AlertTriangle,
  Clapperboard,
  Megaphone,
  Mic2,
  Music,
  Smartphone,
  Star,
} from "lucide-react";
import { ACTIONS_PER_YEAR, trySpendEnergy } from "../../game/engine";
import {
  ACTING_STAGES,
  MUSIC_STAGES,
  actingClass,
  apologyArc,
  audition,
  brandDeal,
  createContent,
  goIndie,
  hasAgent,
  practiceMusic,
  releaseMusic,
  resolveEntEvent,
  signLabel,
  startActing,
  startInfluencing,
  startMusic,
  tour,
} from "../../game/entertainment";
import type { Character, LogTone } from "../../game/types";
import { formatMoney } from "../../game/util";

type AnyResult = { character: Character; message: string; tone: LogTone; ok: boolean };
type Act = (fn: (c: Character) => AnyResult) => void;

const btn =
  "rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Star;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      {subtitle && <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}

export function EntertainmentView({ c, act }: { c: Character; act: Act }) {
  const ent = c.entertainment;
  const energyLeft = ACTIONS_PER_YEAR - c.yearActionsUsed;
  const agent = hasAgent(c);

  if (c.age < 14) {
    return (
      <Section
        icon={Star}
        title="Entertainment"
        subtitle="Stardom starts at 14 — practice in the mirror until then."
      >
        <p className="text-xs text-muted-foreground">
          Drama club and band in school give a head start later.
        </p>
      </Section>
    );
  }

  return (
    <div className="space-y-3">
      <Section
        icon={Star}
        title="Entertainment"
        subtitle={`Fame: ${c.fame} · Lifetime earnings: ${formatMoney(ent?.lifetimeEarnings ?? 0)} · Awards: ${ent?.awards ?? 0} · Energy: ${energyLeft}/${ACTIONS_PER_YEAR}${agent ? " · Agent: hired ✓" : " · No agent (deals pay less)"}`}
      >
        {!agent && (
          <p className="text-[11px] text-muted-foreground">
            Tip: befriend a Sports/Talent Agent in the Network tab (50+ relationship) — auditions,
            deals, and endorsements all pay more.
          </p>
        )}
      </Section>

      {ent?.pendingEvent && (
        <div className="glass rounded-2xl border border-amber-400/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold">{ent.pendingEvent.title}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{ent.pendingEvent.description}</p>
          <div className="space-y-1.5">
            {ent.pendingEvent.options.map((o, i) => (
              <button
                key={i}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition hover:bg-white/10"
                onClick={() => act((ch) => resolveEntEvent(ch, i))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Music ---------- */}
      <Section
        icon={Music}
        title="Music"
        subtitle={
          ent?.music
            ? `${MUSIC_STAGES[ent.music.stage]} · ${Math.round(ent.music.fans).toLocaleString()}k fans · ${ent.music.label === "signed" ? "Signed (label keeps 60%)" : ent.music.label === "indie" ? "Independent" : "Unsigned"} · ${ent.music.hits} hit(s)`
            : "Garage → gigs → charts → stadiums."
        }
      >
        {!ent?.music ? (
          <button className={`${btn} w-full`} onClick={() => act(startMusic)}>
            <Mic2 className="mr-1 inline h-3.5 w-3.5" /> Start Making Music
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Musicianship" value={`${ent.music.skill}`} />
              <Stat label="Singles / Albums" value={`${ent.music.singles} / ${ent.music.albums}`} />
              <Stat label="Creative Control" value={`${ent.music.creativeControl}%`} />
              <Stat
                label="Last Release"
                value={ent.music.lastReleaseQuality ? `${ent.music.lastReleaseQuality}/100` : "—"}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <button
                className={btn}
                onClick={() => act((ch) => practiceMusic(ch, trySpendEnergy))}
              >
                Write & Practice (1⚡)
              </button>
              <button
                className={btn}
                onClick={() => act((ch) => releaseMusic(ch, "single", trySpendEnergy))}
              >
                Release Single (1⚡)
              </button>
              <button
                className={btn}
                disabled={ent.music.singles < 2}
                onClick={() => act((ch) => releaseMusic(ch, "album", trySpendEnergy))}
              >
                Release Album (1⚡)
              </button>
              <button
                className={btn}
                disabled={ent.music.stage < 2}
                onClick={() => act((ch) => tour(ch, trySpendEnergy))}
              >
                Tour (1⚡)
              </button>
              {ent.music.label !== "signed" ? (
                <button
                  className={btnGhost}
                  disabled={ent.music.fans < 40}
                  onClick={() => act(signLabel)}
                >
                  Sign with a Label
                </button>
              ) : (
                <button className={btnGhost} onClick={() => act(goIndie)}>
                  Go Independent
                </button>
              )}
            </div>
          </>
        )}
      </Section>

      {/* ---------- Acting ---------- */}
      <Section
        icon={Clapperboard}
        title="Acting"
        subtitle={
          ent?.acting
            ? `${ACTING_STAGES[ent.acting.stage]} · ${ent.acting.credits} credit(s) · ${ent.acting.leads} lead(s) · ${ent.acting.nominations} nomination(s) · ${ent.acting.flops} flop(s)`
            : "Auditions are a numbers game — craft and looks tilt the odds."
        }
      >
        {!ent?.acting ? (
          <button className={`${btn} w-full`} onClick={() => act(startActing)}>
            <Clapperboard className="mr-1 inline h-3.5 w-3.5" /> Start Acting
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button className={btn} onClick={() => act((ch) => actingClass(ch, trySpendEnergy))}>
              Acting Classes (1⚡)
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => audition(ch, "safe", trySpendEnergy))}
            >
              Audition — Safe Read (1⚡)
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => audition(ch, "bold", trySpendEnergy))}
            >
              Audition — Bold Swing (1⚡)
            </button>
          </div>
        )}
        {ent?.acting && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bold reads fail more often but can jump you a whole tier when they land.
          </p>
        )}
      </Section>

      {/* ---------- Influencer ---------- */}
      <Section
        icon={Smartphone}
        title="Influencer"
        subtitle={
          ent?.influencer
            ? `${ent.influencer.followers.toLocaleString()} followers · ${ent.influencer.niche} · engagement ${ent.influencer.engagement}${ent.influencer.cancelled ? " · ❌ CANCELLED" : ent.influencer.cancelStrikes > 0 ? ` · ⚠ ${ent.influencer.cancelStrikes} strike(s)` : ""}`
            : "Followers compound. So do mistakes."
        }
      >
        {!ent?.influencer ? (
          <button className={`${btn} w-full`} onClick={() => act(startInfluencing)}>
            <Smartphone className="mr-1 inline h-3.5 w-3.5" /> Start Creating Content
          </button>
        ) : ent.influencer.cancelled ? (
          <button
            className={`${btn} w-full`}
            onClick={() => act((ch) => apologyArc(ch, trySpendEnergy))}
          >
            <Megaphone className="mr-1 inline h-3.5 w-3.5" /> Attempt the Apology Arc (1⚡)
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button
              className={btn}
              onClick={() => act((ch) => createContent(ch, "authentic", trySpendEnergy))}
            >
              Authentic Content (1⚡)
            </button>
            <button
              className={btn}
              onClick={() => act((ch) => createContent(ch, "clickbait", trySpendEnergy))}
            >
              Clickbait Farm (1⚡)
            </button>
            <button
              className={btn}
              disabled={ent.influencer.followers < 10000 || c.criminalRecord > 0}
              onClick={() => act((ch) => brandDeal(ch, trySpendEnergy))}
            >
              Brand Deals (1⚡)
            </button>
          </div>
        )}
        {c.criminalRecord > 0 && ent?.influencer && !ent.influencer.cancelled && (
          <p className="mt-1 text-[11px] text-red-400">
            Brand deals blocked: sponsors won't touch a criminal record.
          </p>
        )}
      </Section>
    </div>
  );
}
