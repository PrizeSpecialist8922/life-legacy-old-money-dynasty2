import { useState } from "react";
import {
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Medal,
  Trophy,
} from "lucide-react";
import { CLUBS, SPORTS } from "../../game/data";
import {
  classRankPercentile,
  gpaToPercent,
  gradeLevelLabel,
  inSchool,
  letterGrade,
  prestigeLabel,
} from "../../game/education";
import { honorsLabel } from "../../game/engine";
import { pathwayLabel } from "../../game/courses";
import type { ExamKind } from "../../game/engine";
import { WORK_STUDY_JOBS, livingDef } from "../../game/college";
import type { Character } from "../../game/types";
import { formatMoney } from "../../game/util";
import { assignmentCategory, buildQuiz } from "../../game/quiz";
import { QuizModal } from "./QuizModal";
import type { QuizConfig } from "./QuizModal";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

const EXAMS: { kind: ExamKind; label: string; minAge: number; needsDegree?: boolean }[] = [
  { kind: "sat", label: "SAT", minAge: 16 },
  { kind: "act", label: "ACT", minAge: 16 },
  { kind: "lsat", label: "LSAT (Law)", minAge: 18 },
  { kind: "gmat", label: "GMAT (MBA)", minAge: 18 },
  { kind: "mcat", label: "MCAT (Med)", minAge: 18 },
  { kind: "bar", label: "Bar Exam", minAge: 22, needsDegree: true },
];

export function EducationDashboard({
  character,
  onExam,
  onJoin,
  onAssignments,
  onWorkStudy,
  onSitIBExams,
}: {
  character: Character;
  onExam: (kind: ExamKind, correctRatio?: number) => void;
  onJoin: (kind: "club" | "sport", name: string) => void;
  onAssignments: (correctRatio: number) => void;
  onWorkStudy: (role: string) => void;
  onSitIBExams: () => void;
}) {
  const c = character;
  const s = c.scores;
  const studying = inSchool(c);
  const [club, setClub] = useState(CLUBS[0]);
  const [sport, setSport] = useState(SPORTS[0]);
  const [quiz, setQuiz] = useState<QuizConfig | null>(null);
  const cf = c.collegeFinance;
  const loanBalance = c.studentLoans.reduce((s, l) => s + l.balance, 0);
  const loanMonthly = c.studentLoans.reduce((s, l) => s + (l.repaying ? l.monthlyPayment : 0), 0);

  const scoreText = (v: number | undefined) => (v === undefined ? "—" : String(v));

  function startExam(e: { kind: ExamKind; label: string }) {
    setQuiz({
      title: e.label,
      subtitle: "Answer carefully — your score reflects your knowledge.",
      questions: buildQuiz(e.kind, 8),
      kind: e.kind,
    });
  }

  function startAssignment() {
    setQuiz({
      title: "Semester Assignment",
      subtitle: "Complete your coursework to boost your GPA.",
      questions: buildQuiz(assignmentCategory(c), 4),
      kind: "assignment",
    });
  }

  function handleComplete(kind: string, ratio: number) {
    setQuiz(null);
    if (kind === "assignment") onAssignments(ratio);
    else onExam(kind as ExamKind, ratio);
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Education</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="School" value={studying || c.edu.school !== "Home" ? c.edu.school : "—"} />
          <Stat
            label="School Prestige"
            value={
              c.edu.schoolPrestige
                ? `${c.edu.schoolPrestige} · ${prestigeLabel(c.edu.schoolPrestige)}`
                : "—"
            }
          />
          <Stat label="Grade Level" value={gradeLevelLabel(c)} />
          <Stat label="GPA" value={`${c.gpa.toFixed(2)} (${gpaToPercent(c.gpa)}%)`} accent />
          <Stat
            label="Class Rank"
            value={c.edu.classSize ? `#${c.edu.classRank} of ${c.edu.classSize}` : "—"}
          />
          <Stat label="Rank Percentile" value={classRankPercentile(c)} accent />
          <Stat label="Latest Grade" value={c.gpa ? letterGrade(c.gpa) : "—"} />
          <Stat
            label="Discipline"
            value={`${c.edu.disciplineIncidents} incident${c.edu.disciplineIncidents === 1 ? "" : "s"}`}
          />
          {c.education === "high" && c.age >= 16 && (
            <Stat
              label="Pathway"
              value={pathwayLabel(c.edu.pathway)}
              accent={c.edu.pathway === "ib"}
            />
          )}
        </div>

        {/* Current courses */}
        {(c.edu.courses?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              Current Courses
            </p>
            <div className="flex flex-wrap gap-1.5">
              {c.edu.courses!.map((course) => (
                <span
                  key={course.id + (course.level ?? "")}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    course.level === "HL"
                      ? "bg-primary/20 text-primary"
                      : course.level === "SL"
                        ? "bg-accent/20 text-accent"
                        : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {course.name}
                  {course.level ? ` · ${course.level}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5" /> Attendance
              </span>
              <span>{c.edu.attendance}%</span>
            </div>
            <Bar value={c.edu.attendance} color="var(--success)" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" /> Homework
              </span>
              <span>{c.edu.homework}%</span>
            </div>
            <Bar value={c.edu.homework} color="var(--accent)" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Study hrs (yr)
              </span>
              <span>{c.edu.studyHours}h</span>
            </div>
            <Bar value={Math.min(100, c.edu.studyHours * 2)} color="var(--primary)" />
          </div>
        </div>
      </div>

      {/* Assignments */}
      {studying && (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <FileText className="h-4 w-4 text-primary" /> Coursework & Assignments
          </h3>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Assignments done this year: {c.edu.assignmentsThisYear ?? 0} / 3
              </p>
              <p className="text-xs text-muted-foreground">
                Assignment average:{" "}
                {(c.edu.assignmentsThisYear ?? 0) > 0 ? `${c.edu.assignmentAvg ?? 0}%` : "—"}
              </p>
            </div>
            <button
              onClick={startAssignment}
              disabled={(c.edu.assignmentsThisYear ?? 0) >= 3}
              className="rounded-lg bg-primary/20 px-4 py-2 text-xs font-semibold transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Assignment
            </button>
          </div>
        </div>
      )}

      {/* IB examinations (Grade 12) */}
      {c.edu.needsIBExams && (
        <div className="glass rounded-2xl border border-primary/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">IB Examinations</h3>
              <p className="text-xs text-muted-foreground">
                Six subjects, five questions each. Your answers decide your 1–7 grades and the final
                /45 diploma score universities will see.
              </p>
            </div>
            <button
              onClick={onSitIBExams}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-105"
            >
              Sit Exams
            </button>
          </div>
        </div>
      )}

      {/* IB transcript */}
      {c.edu.ibResults && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">IB Diploma Transcript</h3>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-bold text-primary">
              {c.edu.ibTotal}/45
            </span>
          </div>
          <div className="space-y-1">
            {c.edu.ibResults.map((r) => (
              <div
                key={r.courseId}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs"
              >
                <span>
                  {r.name} <span className="text-muted-foreground">{r.level}</span>
                </span>
                <span
                  className={`font-bold ${r.score >= 6 ? "text-[var(--success)]" : r.score <= 3 ? "text-[var(--destructive)]" : ""}`}
                >
                  {r.score}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Core (TOK, EE, CAS)</span>
              <span className="font-bold">3</span>
            </div>
          </div>
        </div>
      )}

      {/* Graduate program status */}
      {c.education === "gradschool" && c.gradProgram && (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 text-sm font-bold">Graduate Program</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Program" value={c.gradProgram.name} accent />
            <Stat label="School" value={c.gradProgram.school} />
            <Stat
              label="Progress"
              value={`Year ${Math.min(c.gradProgram.yearsTotal, c.gradProgram.yearsDone + 1)} of ${c.gradProgram.yearsTotal}`}
            />
            <Stat label="Tuition" value={`${formatMoney(c.gradProgram.tuition)}/yr`} />
          </div>
        </div>
      )}

      {/* Leadership */}
      {(c.edu.leadership?.length ?? 0) > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 text-sm font-bold">Leadership Positions</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.edu.leadership!.map((l, i) => (
              <span
                key={i}
                className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* College financing (during college) */}
      {c.education === "college" && cf && (
        <>
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-bold">College Financing — Year {cf.yearsFunded}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="University" value={cf.university} />
              <Stat label="Living" value={livingDef(cf.living).label} />
              <Stat label="Loan Balance" value={formatMoney(loanBalance)} accent />
              <Stat label="Parents (last yr)" value={formatMoney(cf.parentContribution)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{cf.parentDecision}.</p>
          </div>

          {/* Work-study */}
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-2 text-sm font-bold">Work-Study Program</h3>
            {cf.workStudyRole ? (
              <p className="text-xs text-muted-foreground">
                Working as <span className="font-semibold text-foreground">{cf.workStudyRole}</span>{" "}
                — {formatMoney(cf.workStudyIncome)}/yr toward costs.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {WORK_STUDY_JOBS.map((w) => (
                  <button
                    key={w.role}
                    onClick={() => onWorkStudy(w.role)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    {w.role} · {formatMoney(w.income)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Annual budget */}
          {cf.budget.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-bold">College Budget</h3>
              <div className="space-y-2">
                {cf.budget
                  .slice()
                  .reverse()
                  .map((b) => (
                    <div key={b.year} className="rounded-lg bg-white/5 p-3 text-xs">
                      <p className="mb-1 font-semibold">
                        Year {b.year} (age {b.age}) — Cost {formatMoney(b.totalCost)}
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground sm:grid-cols-3">
                        <span>Scholarships {formatMoney(b.scholarships)}</span>
                        <span>Grants {formatMoney(b.grants)}</span>
                        <span>Parents {formatMoney(b.parents)}</span>
                        <span>529 Savings {formatMoney(b.savings)}</span>
                        <span>Work-Study {formatMoney(b.workStudy)}</span>
                        <span>Job {formatMoney(b.jobIncome)}</span>
                        <span className="font-semibold text-primary">
                          Loans {formatMoney(b.loans)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Graduation debt summary */}
      {c.education === "graduated" && cf && (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold">Education Summary</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="University" value={cf.university} />
            <Stat label="Major" value={cf.major} />
            <Stat label="Final GPA" value={c.gpa.toFixed(2)} accent />
            <Stat label="Honors" value={honorsLabel(c.gpa) || "—"} />
            <Stat label="Scholarships Earned" value={formatMoney(cf.totalScholarships)} />
            <Stat label="Grants Received" value={formatMoney(cf.totalGrants)} />
            <Stat label="Parent Contribution" value={formatMoney(cf.totalParent)} />
            <Stat label="529 Savings Used" value={formatMoney(cf.totalSavings)} />
            <Stat label="Loan Balance" value={formatMoney(loanBalance)} accent />
            <Stat label="Monthly Payment" value={`${formatMoney(loanMonthly)}/mo`} />
            <Stat label="Internships" value={String(c.edu.internships?.length ?? 0)} />
            <Stat label="Leadership Roles" value={String(c.edu.leadership?.length ?? 0)} />
            <Stat label="Job Offers Pending" value={String(c.jobOffers?.length ?? 0)} />
          </div>
        </div>
      )}

      {/* Test scores */}
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-bold">Standardized Tests</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Stat label="SAT" value={scoreText(s.sat)} />
          <Stat label="ACT" value={scoreText(s.act)} />
          <Stat label="LSAT" value={scoreText(s.lsat)} />
          <Stat label="GMAT" value={scoreText(s.gmat)} />
          <Stat label="MCAT" value={scoreText(s.mcat)} />
          <Stat label="Bar Exam" value={s.bar ? s.bar : "—"} accent={s.bar === "passed"} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMS.map((e) => {
            const locked = c.age < e.minAge || (e.needsDegree && c.education !== "graduated");
            return (
              <button
                key={e.kind}
                disabled={locked}
                onClick={() => startExam(e)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Take {e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Extracurriculars */}
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" /> Extracurriculars
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Clubs</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {c.edu.clubs.length ? (
                c.edu.clubs.map((x) => (
                  <span key={x} className="rounded-full bg-primary/15 px-2 py-0.5 text-xs">
                    {x}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">None yet</span>
              )}
            </div>
            {c.age >= 11 && (
              <div className="flex gap-2">
                <select
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/60"
                >
                  {CLUBS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onJoin("club", club)}
                  className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-primary/30"
                >
                  Join
                </button>
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Sports</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {c.edu.sports.length ? (
                c.edu.sports.map((x) => (
                  <span key={x} className="rounded-full bg-accent/15 px-2 py-0.5 text-xs">
                    {x}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">None yet</span>
              )}
            </div>
            {c.age >= 6 && (
              <div className="flex gap-2">
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/60"
                >
                  {SPORTS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onJoin("sport", sport)}
                  className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-accent/30"
                >
                  Join
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Awards & scholarships */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Medal className="h-4 w-4 text-primary" /> Awards
          </h3>
          {c.edu.awards.length ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {c.edu.awards
                .slice(-8)
                .reverse()
                .map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No awards yet.</p>
          )}
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Award className="h-4 w-4 text-primary" /> Scholarships
          </h3>
          {c.edu.scholarships.length ? (
            <ul className="space-y-1.5 text-xs">
              {c.edu.scholarships.map((sc, i) => (
                <li key={i} className="rounded-lg bg-white/5 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{sc.name}</span>
                    <span className="font-bold text-primary">{formatMoney(sc.amount)}/yr</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{sc.reason ?? sc.kind ?? "Award"}</span>
                    <span
                      className={
                        sc.status === "revoked"
                          ? "text-[var(--destructive)]"
                          : sc.status === "reduced"
                            ? "text-[var(--destructive)]"
                            : "text-[var(--success)]"
                      }
                    >
                      {sc.status === "revoked"
                        ? "Revoked"
                        : sc.status === "reduced"
                          ? "Reduced"
                          : "Active"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No scholarships yet.</p>
          )}
        </div>
      </div>

      {/* Degrees */}
      {c.edu.degrees.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 text-sm font-bold">Degrees & Diplomas</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.edu.degrees.map((d) => (
              <span
                key={d}
                className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Academic timeline */}
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-bold">Academic Timeline</h3>
        {c.edu.history.length ? (
          <div className="space-y-1.5">
            {c.edu.history
              .slice()
              .reverse()
              .map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs"
                >
                  <span className="text-muted-foreground">
                    Age {h.age} · {h.stage}
                  </span>
                  <span className="flex items-center gap-2 font-bold">
                    {h.grade}{" "}
                    <span className="text-muted-foreground">({h.yearGpa.toFixed(2)})</span>
                    {h.cumGpa !== undefined && (
                      <span className="text-muted-foreground">
                        GPA {h.cumGpa.toFixed(2)}
                        {h.cumDelta !== undefined && h.cumDelta !== 0 && (
                          <span
                            className={
                              h.cumDelta > 0 ? "text-[var(--success)]" : "text-[var(--destructive)]"
                            }
                          >
                            {" "}
                            {h.cumDelta > 0 ? "▲" : "▼"}
                            {Math.abs(h.cumDelta).toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Your academic record will appear here once you start school.
          </p>
        )}
      </div>

      <QuizModal config={quiz} onComplete={handleComplete} onCancel={() => setQuiz(null)} />
    </div>
  );
}
