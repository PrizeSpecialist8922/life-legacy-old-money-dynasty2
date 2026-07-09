import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Briefcase,
  BriefcaseBusiness,
  ChevronRight,
  Crown,
  FileText,
  GraduationCap,
  Home,
  Landmark,
  User,
} from "lucide-react";
import { useGame } from "../hooks/useGame";
import { StartScreen } from "../components/game/StartScreen";
import { GameHeader } from "../components/game/GameHeader";
import { StatBars } from "../components/game/StatBars";
import { ActionTabs } from "../components/game/ActionTabs";
import { LifeTimeline } from "../components/game/LifeTimeline";
import { NetWorthChart } from "../components/game/NetWorthChart";
import { EventModal } from "../components/game/EventModal";
import { ResultModal } from "../components/game/ResultModal";
import { CourseSelectionModal } from "../components/game/CourseSelectionModal";
import { SchoolSelectionModal } from "../components/game/SchoolSelectionModal";
import { IBExamModal } from "../components/game/IBExamModal";
import { ResumePage } from "../components/game/ResumePage";
import { InternshipsPage } from "../components/game/InternshipsPage";
import { DeathScreen } from "../components/game/DeathScreen";
import { EducationDashboard } from "../components/game/EducationDashboard";
import { ProfilePage } from "../components/game/ProfilePage";
import { CareersPage } from "../components/game/CareersPage";
import { SpecialCareersPage } from "../components/game/SpecialCareersPage";
import { FamilyDynastyPage } from "../components/game/FamilyDynastyPage";
import { QuizModal } from "../components/game/QuizModal";
import type { QuizConfig } from "../components/game/QuizModal";
import { buildQuiz } from "../game/quiz";
import type { QuizCategory } from "../game/quiz";

export const Route = createFileRoute("/")({
  component: Index,
});

type View =
  | "life"
  | "education"
  | "careers"
  | "paths"
  | "family"
  | "internships"
  | "resume"
  | "profile";

const NAV: { id: View; label: string; icon: typeof Home }[] = [
  { id: "life", label: "Life", icon: Home },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "careers", label: "Careers", icon: BriefcaseBusiness },
  { id: "paths", label: "Paths", icon: Landmark },
  { id: "family", label: "Family", icon: Crown },
  { id: "internships", label: "Interns", icon: Briefcase },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "profile", label: "Profile", icon: User },
];

function Index() {
  const game = useGame();
  const [view, setView] = useState<View>("life");
  const [ibExamOpen, setIbExamOpen] = useState(false);

  if (!game.loaded) {
    return <div className="min-h-screen" />;
  }

  if (!game.character) {
    return <StartScreen onStart={game.start} />;
  }

  if (!game.character.alive) {
    return (
      <DeathScreen
        character={game.character}
        onRestart={game.restart}
        onContinue={game.continueAsHeir}
      />
    );
  }

  const c = game.character;
  const nextChallenge = c.pendingChallenges?.[0] ?? null;
  const challengeQuiz: QuizConfig | null = nextChallenge
    ? {
        title: nextChallenge.title,
        subtitle: nextChallenge.subtitle,
        questions: buildQuiz(nextChallenge.category as QuizCategory, 5),
        kind: "challenge",
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4">
      <GameHeader character={c} onRestart={game.restart} />

      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto rounded-2xl bg-white/5 p-1">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {n.label}
            </button>
          );
        })}
      </div>

      {view === "life" && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <StatBars stats={c.stats} />
            <NetWorthChart character={c} />
            <ActionTabs
              character={c}
              onActivity={game.activity}
              onApply={game.apply}
              onResign={game.resign}
              onEnroll={game.enroll}
              onFafsa={game.fafsa}
              onAppeal={game.appeal}
              onApplyGrad={game.applyGrad}
              onAcceptOffer={game.acceptOffer}
            />
            <button
              onClick={game.advance}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              Age Up <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="h-[400px] lg:h-auto">
            <LifeTimeline character={c} />
          </div>
        </div>
      )}

      {view === "education" && (
        <div className="mt-3">
          <EducationDashboard
            character={c}
            onExam={game.exam}
            onJoin={game.joinActivity}
            onAssignments={game.assignments}
            onWorkStudy={game.workStudy}
            onSitIBExams={() => setIbExamOpen(true)}
          />
        </div>
      )}

      {view === "careers" && (
        <div className="mt-3">
          <CareersPage character={c} onApply={game.apply} onResign={game.resign} />
        </div>
      )}

      {view === "paths" && (
        <div className="mt-3">
          <SpecialCareersPage character={c} act={game.politicsAction} />
        </div>
      )}

      {view === "family" && (
        <div className="mt-3">
          <FamilyDynastyPage character={c} act={game.politicsAction} />
        </div>
      )}

      {view === "internships" && (
        <div className="mt-3">
          <InternshipsPage character={c} onApply={game.applyIntern} />
        </div>
      )}

      {view === "resume" && (
        <div className="mt-3">
          <ResumePage character={c} />
        </div>
      )}

      {view === "profile" && (
        <div className="mt-3">
          <ProfilePage character={c} />
        </div>
      )}

      <EventModal event={game.pendingEvent} onChoose={game.chooseEvent} />

      {/* Interactive extracurricular competitions (played out at age-up) */}
      <QuizModal
        config={!game.pendingEvent ? challengeQuiz : null}
        onComplete={(_, ratio) => {
          if (nextChallenge) game.challenge(nextChallenge, ratio);
        }}
        onCancel={() => {
          if (nextChallenge) game.challenge(nextChallenge, 0);
        }}
      />

      {/* School selection at each stage entry (elementary / middle / high) */}
      {!game.pendingEvent && !nextChallenge && (
        <SchoolSelectionModal
          character={c}
          onApply={game.applySchool}
          onEnroll={game.enrollSchool}
          onDeclineOffer={game.declineSchool}
          onStayPublic={game.stayPublic}
        />
      )}

      {/* Grade 12 IB examinations */}
      <IBExamModal
        character={c}
        open={ibExamOpen && !!c.edu.needsIBExams}
        onComplete={(ratios) => {
          setIbExamOpen(false);
          game.finishIBExams(ratios);
        }}
        onCancel={() => setIbExamOpen(false)}
      />

      {/* IB course selection — blocks play until 3 HL + 3 SL are chosen */}
      <CourseSelectionModal
        open={!game.pendingEvent && !!c.edu.needsCourseSelection && c.education === "high"}
        onConfirm={game.chooseCourses}
      />

      {/* Action results appear as a popup, like life events */}
      <ResultModal result={game.result} onDismiss={game.dismissResult} />
    </div>
  );
}
