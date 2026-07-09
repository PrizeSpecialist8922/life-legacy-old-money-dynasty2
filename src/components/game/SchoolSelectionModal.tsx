import { AnimatePresence, motion } from "motion/react";
import { Check, Landmark, X } from "lucide-react";
import { admissionEstimate, resolveSchool, schoolOptions } from "../../game/schools";
import type { SchoolDef } from "../../game/schools";
import type { Character, SchoolStage } from "../../game/types";
import { formatMoney } from "../../game/util";
import { useState } from "react";
import { buildQuiz } from "../../game/quiz";
import { QuizModal } from "./QuizModal";
import type { QuizConfig } from "./QuizModal";

const STAGE_LABEL: Record<SchoolStage, string> = {
  elementary: "Elementary School",
  middle: "Middle School",
  high: "High School",
};

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="w-16">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${value}%` }} />
      </div>
      <span className="w-6 text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

/**
 * Shown at each stage entry (elementary / middle / high). The player is
 * auto-enrolled at the free public school and may apply to private,
 * religious, or boarding schools — with requirements, estimated odds, and a
 * full financial package before enrolling.
 */
export function SchoolSelectionModal({
  character,
  onApply,
  onEnroll,
  onDeclineOffer,
  onStayPublic,
}: {
  character: Character;
  onApply: (schoolId: string, interviewRatio?: number) => void;
  onEnroll: () => void;
  onDeclineOffer: () => void;
  onStayPublic: () => void;
}) {
  const stage = character.pendingSchoolChoice;
  const open = !!stage;
  const offer = character.k12Offer;
  const offerSchool = stage && offer ? resolveSchool(character, offer.schoolId, stage) : undefined;
  const [interview, setInterview] = useState<{ id: string; quiz: QuizConfig } | null>(null);
  const applied = character.k12Applied ?? [];

  function handleApply(school: SchoolDef) {
    if (school.interview) {
      setInterview({
        id: school.id,
        quiz: {
          title: `${school.name} Interview`,
          subtitle: "Answer thoughtfully — your interview affects admission odds.",
          questions: buildQuiz("interview", 5),
          kind: "interview",
        },
      });
    } else {
      onApply(school.id);
    }
  }

  return (
    <AnimatePresence>
      {open && stage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-strong flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl"
          >
            {offer && offerSchool ? (
              <OfferPanel
                school={offerSchool}
                offer={offer}
                onEnroll={onEnroll}
                onDecline={onDeclineOffer}
              />
            ) : (
              <>
                <div className="border-b border-white/10 p-5 pb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Landmark className="h-4 w-4" /> School Selection
                  </div>
                  <h3 className="text-xl font-bold">Choose Your {STAGE_LABEL[stage]}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You're enrolled at{" "}
                    <span className="font-semibold text-foreground">{character.edu.school}</span>
                    {character.edu.k12Tuition ? "" : " for free"} — or apply to an elite school
                    below. Boarding schools accept international students.
                  </p>
                </div>

                <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto p-5">
                  {schoolOptions(character, stage).map((s) => (
                    <SchoolCard
                      key={s.id}
                      c={character}
                      school={s}
                      applied={applied.includes(s.id)}
                      onApply={() => handleApply(s)}
                    />
                  ))}
                </div>

                <div className="border-t border-white/10 p-5 pt-4">
                  <button
                    onClick={onStayPublic}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10 active:scale-[0.99]"
                  >
                    Stay at {character.edu.school}
                    {character.edu.k12Tuition ? "" : " (free)"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
          <QuizModal
            config={interview?.quiz ?? null}
            onComplete={(_, ratio) => {
              const id = interview?.id;
              setInterview(null);
              if (id) onApply(id, ratio);
            }}
            onCancel={() => setInterview(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SchoolCard({
  c,
  school,
  applied,
  onApply,
}: {
  c: Character;
  school: SchoolDef;
  applied: boolean;
  onApply: () => void;
}) {
  const est = admissionEstimate(c, school);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{school.name}</p>
          <p className="text-xs text-muted-foreground">
            {school.city}, {school.country} · <span className="capitalize">{school.kind}</span> ·
            Prestige {school.prestige}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-primary">
            {school.tuition ? `${formatMoney(school.tuition)}/yr` : "Free"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Accepts {Math.round(school.acceptanceRate * 100)}%
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        <Rating label="Academics" value={school.academics} />
        <Rating label="Athletics" value={school.athletics} />
        <Rating label="Arts" value={school.arts} />
        <Rating label="Alumni" value={school.alumniNetwork} />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {est.requirements.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5 text-[11px]">
            {r.met ? (
              <Check className="h-3 w-3 shrink-0 text-[var(--success)]" />
            ) : (
              <X className="h-3 w-3 shrink-0 text-[var(--destructive)]" />
            )}
            <span className={r.met ? "text-muted-foreground" : "text-[var(--destructive)]"}>
              {r.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Est. admission odds:{" "}
          <span className="font-bold text-foreground">{Math.round(est.probability * 100)}%</span>
        </span>
        <button
          onClick={onApply}
          disabled={applied}
          className="rounded-lg bg-primary/20 px-3.5 py-1.5 text-xs font-bold transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {applied ? "Applied" : school.interview ? "Apply + Interview" : "Apply"}
        </button>
      </div>
    </div>
  );
}

function OfferPanel({
  school,
  offer,
  onEnroll,
  onDecline,
}: {
  school: SchoolDef;
  offer: NonNullable<Character["k12Offer"]>;
  onEnroll: () => void;
  onDecline: () => void;
}) {
  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: "Annual Tuition", value: formatMoney(school.tuition) },
    ...(offer.scholarship
      ? [
          {
            label: offer.scholarshipName ?? "Merit Scholarship",
            value: `−${formatMoney(offer.scholarship)}`,
          },
        ]
      : []),
    ...(offer.aid ? [{ label: "Financial Aid", value: `−${formatMoney(offer.aid)}` }] : []),
    { label: "Parent Contribution", value: formatMoney(offer.parentContribution) },
    { label: "Remaining Cost", value: `${formatMoney(offer.remaining)}/yr`, accent: true },
  ];
  return (
    <>
      <div className="border-b border-white/10 p-5 pb-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
          Accepted!
        </div>
        <h3 className="text-xl font-bold">{school.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {school.city}, {school.country} · <span className="capitalize">{school.kind}</span> ·
          Prestige {school.prestige}
        </p>
      </div>
      <div className="p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Financial Package
        </p>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div
              key={r.label}
              className={`flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm ${
                r.accent ? "border border-primary/40" : ""
              }`}
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className={`font-bold ${r.accent ? "text-primary" : ""}`}>{r.value}</span>
            </div>
          ))}
        </div>
        {school.kind === "boarding" && (
          <p className="mt-3 text-xs text-muted-foreground">
            This is a boarding school — you'll live on campus in {school.city}.
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onDecline}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
          >
            Decline
          </button>
          <button
            onClick={onEnroll}
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
          >
            Enroll
          </button>
        </div>
      </div>
    </>
  );
}
