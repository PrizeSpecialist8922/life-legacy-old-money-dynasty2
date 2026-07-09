import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GraduationCap } from "lucide-react";
import { ibExamCategory } from "../../game/courses";
import { buildQuiz } from "../../game/quiz";
import type { QuizQuestion } from "../../game/quiz";
import type { Character, SelectedCourse } from "../../game/types";

const QUESTIONS_PER_SUBJECT = 5;

interface SubjectExam {
  course: SelectedCourse;
  questions: QuizQuestion[];
}

/**
 * End-of-Grade-12 IB examinations: five quick questions per subject, sat
 * back-to-back. Ratios per subject are handed to the engine, which converts
 * them into 1-7 grades and a /45 diploma score.
 */
export function IBExamModal({
  character,
  open,
  onComplete,
  onCancel,
}: {
  character: Character;
  open: boolean;
  onComplete: (ratios: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const exams: SubjectExam[] = useMemo(() => {
    if (!open) return [];
    return (character.edu.courses ?? []).map((course) => ({
      course,
      questions: buildQuiz(ibExamCategory(course.id), QUESTIONS_PER_SUBJECT),
    }));
    // Rebuild only when the sitting opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [subjectIdx, setSubjectIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [correctBySubject, setCorrectBySubject] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<number | null>(null);

  if (!open) return null;
  const exam = exams[subjectIdx];
  if (!exam) return null;
  const question = exam.questions[questionIdx];
  const totalSubjects = exams.length;

  function reset() {
    setSubjectIdx(0);
    setQuestionIdx(0);
    setCorrectBySubject({});
    setPicked(null);
  }

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === question.answer;
    const key = exam.course.id;
    const nextCorrect = {
      ...correctBySubject,
      [key]: (correctBySubject[key] ?? 0) + (correct ? 1 : 0),
    };
    setCorrectBySubject(nextCorrect);

    setTimeout(() => {
      setPicked(null);
      if (questionIdx + 1 < exam.questions.length) {
        setQuestionIdx(questionIdx + 1);
      } else if (subjectIdx + 1 < totalSubjects) {
        setSubjectIdx(subjectIdx + 1);
        setQuestionIdx(0);
      } else {
        // All subjects sat — hand ratios to the engine.
        const ratios: Record<string, number> = {};
        for (const e of exams) {
          ratios[e.course.id] = (nextCorrect[e.course.id] ?? 0) / e.questions.length;
        }
        reset();
        onComplete(ratios);
      }
    }, 450);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="glass-strong w-full max-w-md rounded-3xl p-6"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <GraduationCap className="h-4 w-4" /> IB Examinations
          </div>
          <h3 className="mt-1 text-lg font-bold">
            {exam.course.name}{" "}
            <span className="text-sm font-semibold text-muted-foreground">
              ({exam.course.level})
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Subject {subjectIdx + 1} of {totalSubjects} · Question {questionIdx + 1} of{" "}
            {exam.questions.length}
          </p>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${((subjectIdx * QUESTIONS_PER_SUBJECT + questionIdx) / (totalSubjects * QUESTIONS_PER_SUBJECT)) * 100}%`,
              }}
            />
          </div>

          <p className="mt-4 text-sm font-medium leading-relaxed">{question.q}</p>
          <div className="mt-3 flex flex-col gap-2">
            {question.options.map((opt, i) => {
              const state =
                picked === null
                  ? "idle"
                  : i === question.answer
                    ? "right"
                    : i === picked
                      ? "wrong"
                      : "idle";
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  className={`rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                    state === "right"
                      ? "border-[var(--success)] bg-[var(--success)]/15"
                      : state === "wrong"
                        ? "border-[var(--destructive)] bg-[var(--destructive)]/15"
                        : "border-white/10 bg-white/5 hover:border-primary/60 hover:bg-primary/10"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              reset();
              onCancel();
            }}
            className="mt-4 w-full rounded-lg py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Pause — sit the exams later this year
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
