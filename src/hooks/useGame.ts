import { useCallback, useEffect, useState } from "react";
import {
  acceptJobOffer,
  acceptWorkStudy,
  ageUp,
  appealAid,
  applyGradProgram,
  applyInternship,
  applyK12School,
  applyToJob,
  chooseIBCourses,
  completeIBExams,
  createCharacter,
  declineK12Offer,
  doActivity,
  doAssignments,
  enrollCollege,
  enrollK12,
  fileFafsa,
  joinExtracurricular,
  quitJob,
  resolveEventChoice,
  resolveChallenge,
  stayPublicSchool,
  takeExam,
} from "../game/engine";
import { createHeir } from "../game/legacy";
import type { GradProgramKind } from "../game/types";
import type { IBPick } from "../game/courses";
import type { ExamKind } from "../game/engine";
import type { JobDef } from "../game/data";
import { clearSave, loadGame, saveGame } from "../game/storage";
import type { AidLetter, Character, ECChallenge, GameEvent, Gender } from "../game/types";

export function useGame() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [pendingEvent, setPendingEvent] = useState<GameEvent | null>(null);
  const [result, setResult] = useState<{ text: string; tone: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadGame();
    if (saved) setCharacter(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (character) saveGame(character);
  }, [character]);

  // Action results are shown in a popup the player dismisses, matching the
  // life-event popup style (no auto-dismissing toast).
  const flash = useCallback((text: string, tone = "neutral") => {
    setResult({ text, tone });
  }, []);

  const dismissResult = useCallback(() => setResult(null), []);

  const start = useCallback((input: { name?: string; gender?: Gender; country?: string }) => {
    const c = createCharacter(input);
    setCharacter(c);
    setPendingEvent(null);
  }, []);

  const continueAsHeir = useCallback((heirId: string) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const { heir } = createHeir(prev, heirId);
      return heir;
    });
    setPendingEvent(null);
  }, []);

  const restart = useCallback(() => {
    clearSave();
    setCharacter(null);
    setPendingEvent(null);
    setResult(null);
  }, []);

  const advance = useCallback(() => {
    setCharacter((prev) => {
      if (!prev || !prev.alive) return prev;
      const { character: next, event } = ageUp(prev);
      setPendingEvent(event);
      return next;
    });
  }, []);

  const chooseEvent = useCallback(
    (index: number) => {
      setCharacter((prev) => {
        if (!prev || !pendingEvent) return prev;
        return resolveEventChoice(prev, pendingEvent, index);
      });
      setPendingEvent(null);
    },
    [pendingEvent],
  );

  const activity = useCallback(
    (id: string) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = doActivity(prev, id);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const apply = useCallback(
    (def: JobDef) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = applyToJob(prev, def);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const resign = useCallback(() => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const res = quitJob(prev);
      flash(res.message, res.tone);
      return res.character;
    });
  }, [flash]);

  const enroll = useCallback(
    (letter: AidLetter) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = enrollCollege(prev, letter);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const fafsa = useCallback(() => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const res = fileFafsa(prev);
      flash(res.message, res.tone);
      return res.character;
    });
  }, [flash]);

  const appeal = useCallback(() => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const res = appealAid(prev);
      flash(res.message, res.tone);
      return res.character;
    });
  }, [flash]);

  const workStudy = useCallback(
    (role: string) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = acceptWorkStudy(prev, role);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const exam = useCallback(
    (kind: ExamKind, correctRatio?: number) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = takeExam(prev, kind, correctRatio);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const assignments = useCallback(
    (correctRatio: number) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = doAssignments(prev, correctRatio);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const joinActivity = useCallback(
    (kind: "club" | "sport", name: string) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = joinExtracurricular(prev, kind, name);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  // Generic wrapper: run an engine action, surface its message as a popup.
  const runAction = useCallback(
    (fn: (c: Character) => { character: Character; message: string; tone: string }) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = fn(prev);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  const applySchool = useCallback(
    (id: string, interviewRatio?: number) =>
      runAction((c) => applyK12School(c, id, interviewRatio)),
    [runAction],
  );
  const enrollSchool = useCallback(() => runAction((c) => enrollK12(c)), [runAction]);
  const declineSchool = useCallback(() => runAction((c) => declineK12Offer(c)), [runAction]);
  const stayPublic = useCallback(() => runAction((c) => stayPublicSchool(c)), [runAction]);
  const applyGrad = useCallback(
    (k: GradProgramKind) => runAction((c) => applyGradProgram(c, k)),
    [runAction],
  );
  const applyIntern = useCallback(
    (id: string) => runAction((c) => applyInternship(c, id)),
    [runAction],
  );
  const finishIBExams = useCallback(
    (ratios: Record<string, number>) => runAction((c) => completeIBExams(c, ratios)),
    [runAction],
  );
  const acceptOffer = useCallback(
    (i: number) => runAction((c) => acceptJobOffer(c, i)),
    [runAction],
  );

  const challenge = useCallback(
    (ch: ECChallenge, ratio: number) => runAction((c) => resolveChallenge(c, ch, ratio)),
    [runAction],
  );

  // Politics (Build 8): every political action returns the same ActionResult
  // shape, so a single generic runner keeps this hook from ballooning.
  const politicsAction = useCallback(
    (fn: (c: Character) => { character: Character; message: string; tone: string; ok: boolean }) =>
      runAction(fn),
    [runAction],
  );

  const chooseCourses = useCallback(
    (picks: IBPick[]) => {
      setCharacter((prev) => {
        if (!prev) return prev;
        const res = chooseIBCourses(prev, picks);
        flash(res.message, res.tone);
        return res.character;
      });
    },
    [flash],
  );

  return {
    character,
    pendingEvent,
    result,
    dismissResult,
    loaded,
    start,
    restart,
    continueAsHeir,
    advance,
    chooseEvent,
    activity,
    apply,
    resign,
    enroll,
    exam,
    joinActivity,
    assignments,
    fafsa,
    appeal,
    workStudy,
    chooseCourses,
    applySchool,
    enrollSchool,
    declineSchool,
    stayPublic,
    applyGrad,
    applyIntern,
    finishIBExams,
    acceptOffer,
    challenge,
    politicsAction,
  };
}
