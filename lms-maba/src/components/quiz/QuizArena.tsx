"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import FinalResults from "@/components/results/FinalResults";
import { loadUserProfile } from "@/lib/user-storage";
import { DEFAULT_CHARACTERS, type CharacterOption } from "@/types/lobby";
import type { LeaderboardPlayer, PodiumPlayer, PodiumRank } from "@/types/player";
import {
  DEFAULT_QUIZ_MAPS,
  DEFAULT_QUIZ_QUESTIONS,
  type AnswerChoiceId,
  type QuizArenaProps,
  type QuizMapOption,
} from "@/types/quiz";

/* -------------------------------------------------------------------------- */
/*                                Asset Paths                                 */
/* -------------------------------------------------------------------------- */

const UI_BUTTON_SHEET = "/public/assets/asset/20251029darkDwellersButtonB1-Sheet.png";
const UI_SCROLL_BANNER_SHEET = "/public/assets/asset/20251029darkDwellersButtonD1-Sheet.png";
const UI_HEADER_PURPLE = "/public/assets/asset/20251117darkDwellersHeaderA.png";
const UI_HEADER_GOTHIC_SLATE = "/public/assets/asset/20251117darkDwellersHeaderC.png";
const UI_HEADER_GOTHIC_GOLD = "/public/assets/asset/20251117darkDwellersHeaderD.png";
const UI_HEADER_GOTHIC_CRIMSON = "/public/assets/asset/20251117darkDwellersHeaderE.png";
const UI_SKULL_BAR = "/public/assets/asset/20251118darkDwellersBarE.png";
const UI_PANEL_9SLICE = "/public/assets/asset/20251029darkDwellers9SlicesE.png";
const UI_CLOSE_BTN_SHEET = "/public/assets/asset/20251125closeButton1-Sheet.png";
const UI_TARGET_FRAME_SHEET = "/public/assets/asset/20251118darkDwellersCursourA1-Sheet.png";
const UI_CURSOR_HORIZ_SHEET =
  "/public/assets/asset/20251118darkDwellersHorizontalCursourD1-Sheet.png";

const BOSS_SPRITE_SRC = "/public/assets/72 Character Free/Char 18/Character 9.png";
const CHECKBOX_CHECKED =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_checked.png";
const CHECKBOX_CHECKED_ALT =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_checked2.png";
const CHECKBOX_UNCHECKED =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_unchecked.png";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const resolveAssetSrc = (src: string): string =>
  encodeURI(src.replace(/^\/public(?=\/)/, ""));

/* -------------------------------------------------------------------------- */
/*                               Sub-components                               */
/* -------------------------------------------------------------------------- */

interface FighterSpriteProps {
  readonly src: string;
  readonly alt: string;
  readonly flipLeft?: boolean;
  readonly isMoving?: boolean;
  readonly isHit?: boolean;
}

function FighterSprite({
  src,
  alt,
  flipLeft = false,
  isMoving = false,
  isHit = false,
}: FighterSpriteProps) {
  return (
    <div
      className={`relative h-28 w-36 overflow-hidden transition-transform duration-200 sm:h-36 sm:w-48 ${
        flipLeft ? "-scale-x-100" : "scale-x-100"
      } ${isHit ? "brightness-200 saturate-200" : ""}`}
    >
      <img
        src={resolveAssetSrc(src)}
        alt={alt}
        draggable={false}
        className={`pixelated absolute left-0 h-auto w-[1728px] max-w-none select-none sm:w-[2304px] ${
          isMoving ? "-top-72 animate-sprite-walk sm:-top-96" : "top-0 animate-sprite-idle"
        }`}
      />
    </div>
  );
}

interface SkullBarProps {
  readonly label: string;
  readonly current: number;
  readonly max: number;
  readonly variant: "red" | "blue" | "gold";
  readonly valueText?: string;
}

function SkullBar({ label, current, max, variant, valueText }: SkullBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((current / max) * 100))) : 0;

  const fillColor =
    variant === "red"
      ? "bg-linear-to-b from-[#ff3b6b] via-[#e01e50] to-[#9e1136]"
      : variant === "blue"
        ? "bg-linear-to-b from-[#38bdf8] via-[#2576e8] to-[#17469e]"
        : "bg-linear-to-b from-[#fde047] via-[#eab308] to-[#a16207]";

  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex items-center justify-between px-2 text-[8px] text-stroke-pixel sm:text-[10px]">
        <span className="text-[#ffe4b5] uppercase">{label}</span>
        <span className="text-yellow-300">{valueText ?? `${current}/${max}`}</span>
      </div>
      <div className="relative h-9 w-full select-none drop-shadow-[3px_3px_0_#000] sm:h-11">
        <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] bg-[#201733]" />
        <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${fillColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <img
          src={resolveAssetSrc(UI_SKULL_BAR)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}

interface MapSelectorModalProps {
  readonly maps: readonly QuizMapOption[];
  readonly selectedMapId: string;
  readonly onSelectMap: (map: QuizMapOption) => void;
  readonly onClose: () => void;
}

function MapSelectorModal({
  maps,
  selectedMapId,
  onSelectMap,
  onClose,
}: MapSelectorModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
    >
      <div className="relative w-full max-w-3xl p-8 drop-shadow-[8px_8px_0_#000] sm:p-10">
        <img
          src={resolveAssetSrc(UI_PANEL_9SLICE)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
        />

        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between pb-2">
            <h2
              id="map-modal-title"
              className="text-xs text-yellow-300 text-stroke-pixel sm:text-sm"
            >
              PILIH MAPS KUIS
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="relative size-8 cursor-pointer overflow-hidden"
            >
              <img
                src={resolveAssetSrc(UI_CLOSE_BTN_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none select-none"
              />
            </button>
          </div>

          <div className="grid max-h-[62vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
            {maps.map((map) => {
              const isSelected = map.id === selectedMapId;
              return (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => {
                    onSelectMap(map);
                    onClose();
                  }}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-transform hover:-translate-y-1"
                >
                  <img
                    src={resolveAssetSrc(UI_PANEL_9SLICE)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className={`pixelated pointer-events-none absolute inset-0 h-full w-full select-none ${
                      isSelected ? "brightness-125 hue-rotate-[-30deg]" : "opacity-90"
                    }`}
                  />
                  <div className="relative z-10 flex w-full flex-col items-center gap-2">
                    <div className="h-20 w-full overflow-hidden border-2 border-black bg-black">
                      <img
                        src={resolveAssetSrc(map.bgSrc)}
                        alt={map.name}
                        draggable={false}
                        className="pixelated h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                      {map.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function QuizArena({
  playerName = "KSATRIA BARU",
  playerLevel = 1,
  playerCharacter = DEFAULT_CHARACTERS[0]!,
  sessionCode = "RPI",
  questions = DEFAULT_QUIZ_QUESTIONS,
  maps = DEFAULT_QUIZ_MAPS,
  initialMapId,
  onSubmitAnswer,
  onCompleteQuiz,
}: QuizArenaProps) {
  const [activePlayerName, setActivePlayerName] = useState<string>(playerName);
  const [activePlayerLevel, setActivePlayerLevel] = useState<number>(playerLevel);
  const [activePlayerChar, setActivePlayerChar] =
    useState<CharacterOption>(playerCharacter);
  const [dbQuestions, setDbQuestions] = useState<readonly typeof questions[number][]>(
    questions,
  );
  const [otherPlayers, setOtherPlayers] = useState<
    Array<{
      id: string;
      username: string;
      points: number;
      spriteSrc: string;
      avatarSrc: string;
    }>
  >([]);

  useEffect(() => {
    const profile = loadUserProfile();
    if (profile.name) setActivePlayerName(profile.name);
    if (profile.level) setActivePlayerLevel(profile.level);
    if (profile.character) setActivePlayerChar(profile.character);

    void fetch("/api/db", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (db: {
          users?: Array<{ id: string; nama_ksatria: string; role: string }>;
          grades?: Array<{ maba_id: string; nilai_akhir: number }>;
          quizzes?: Array<{
            id: string;
            question: string;
            options: { A: string; B: string; C: string; D: string };
            correct_answer: AnswerChoiceId;
          }>;
        }) => {
          if (Array.isArray(db.quizzes) && db.quizzes.length > 0) {
            setDbQuestions(
              db.quizzes.map((q) => ({
                id: q.id,
                question: q.question,
                choices: [
                  { id: "A", text: q.options.A },
                  { id: "B", text: q.options.B },
                  { id: "C", text: q.options.C },
                  { id: "D", text: q.options.D },
                ],
                correctChoiceId: q.correct_answer,
                points: 200,
                timeLimitSec: 20,
              })),
            );
          }

          const mabaList = (db.users ?? []).filter((u) => u.role === "maba");
          const grades = db.grades ?? [];
          const others = mabaList
            .filter(
              (u) =>
                u.id !== profile.id &&
                u.nama_ksatria.toLowerCase() !== profile.name.toLowerCase(),
            )
            .map((u, idx) => {
              const g = grades.find((gr) => gr.maba_id === u.id);
              return {
                id: u.id,
                username: u.nama_ksatria,
                points: Math.round(Number(g?.nilai_akhir ?? 0) * 10),
                spriteSrc:
                  DEFAULT_CHARACTERS[(idx + 1) % DEFAULT_CHARACTERS.length]!
                    .spriteSrc,
                avatarSrc: CHECKBOX_CHECKED_ALT,
              };
            });
          setOtherPlayers(others);
        },
      )
      .catch(() => {
        // ignore
      });
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<AnswerChoiceId | null>(null);
  const [hoveredChoiceIndex, setHoveredChoiceIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    readonly text: string;
    readonly isCorrect: boolean;
  } | null>(null);

  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [bossHp, setBossHp] = useState<number>(100);
  const [isPlayerAttacking, setIsPlayerAttacking] = useState<boolean>(false);
  const [isBossHit, setIsBossHit] = useState<boolean>(false);
  const [isPlayerHit, setIsPlayerHit] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  const [customMap, setCustomMap] = useState<QuizMapOption | null>(() => {
    if (!initialMapId) return null;
    return maps.find((m) => m.id === initialMapId) ?? null;
  });

  const activeQuestions = dbQuestions.length > 0 ? dbQuestions : questions;
  const currentQuestion = activeQuestions[currentIndex] ?? activeQuestions[0]!;
  const maxTime = currentQuestion.timeLimitSec ?? 20;
  const [timeLeft, setTimeLeft] = useState<number>(maxTime);

  // Active dungeon map: either user-selected map or progresses through the 10 dungeon rooms
  const activeMap: QuizMapOption = useMemo(() => {
    if (customMap) return customMap;
    return maps[currentIndex % Math.max(1, maps.length)] ?? DEFAULT_QUIZ_MAPS[0]!;
  }, [customMap, currentIndex, maps]);

  /* ---- Advance to Next Question or Complete Quiz ---- */
  const handleNextQuestion = useCallback(
    (latestScore: number, latestCorrect: number): void => {
      if (currentIndex + 1 >= activeQuestions.length) {
        setIsFinished(true);
        onCompleteQuiz?.({
          totalScore: latestScore,
          correctCount: latestCorrect,
          totalQuestions: activeQuestions.length,
        });
        return;
      }

      const nextIdx = currentIndex + 1;
      const nextQ = activeQuestions[nextIdx];
      setCurrentIndex(nextIdx);
      setSelectedChoiceId(null);
      setIsRevealed(false);
      setFeedbackBanner(null);
      setTimeLeft(nextQ?.timeLimitSec ?? 20);
    },
    [activeQuestions, currentIndex, onCompleteQuiz],
  );

  /* ---- Handle Choosing an Answer (or Timeout when choiceId is null) ---- */
  const handleSelectChoice = useCallback(
    (choiceId: AnswerChoiceId | null): void => {
      if (isRevealed || isFinished) return;

      setSelectedChoiceId(choiceId);
      setIsRevealed(true);

      const isCorrect = choiceId !== null && choiceId === currentQuestion.correctChoiceId;
      const basePoints = currentQuestion.points ?? 200;
      const speedBonus = isCorrect ? Math.round((timeLeft / maxTime) * 80) : 0;
      const streakBonus = isCorrect ? streak * 25 : 0;
      const earnedPoints = isCorrect ? basePoints + speedBonus + streakBonus : 0;

      const nextScore = score + earnedPoints;
      const nextCorrect = isCorrect ? correctCount + 1 : correctCount;

      if (isCorrect) {
        setScore(nextScore);
        setCorrectCount(nextCorrect);
        setStreak((prev) => prev + 1);
        setIsPlayerAttacking(true);
        setIsBossHit(true);
        setBossHp((prev) => Math.max(0, prev - Math.ceil(100 / Math.max(1, questions.length))));
        setFeedbackBanner({
          text: `BENAR! +${earnedPoints} PTS`,
          isCorrect: true,
        });
      } else {
        setStreak(0);
        setIsPlayerHit(true);
        setPlayerHp((prev) => Math.max(10, prev - 20));
        setFeedbackBanner({
          text:
            choiceId === null
              ? `WAKTU HABIS! Jawaban: ${currentQuestion.correctChoiceId}`
              : `SALAH! Jawaban: ${currentQuestion.correctChoiceId}`,
          isCorrect: false,
        });
      }

      onSubmitAnswer?.({
        questionId: currentQuestion.id,
        selectedChoiceId: choiceId,
        isCorrect,
        earnedPoints,
      });

      setTimeout(() => {
        setIsPlayerAttacking(false);
        setIsBossHit(false);
        setIsPlayerHit(false);
      }, 600);

      setTimeout(() => {
        handleNextQuestion(nextScore, nextCorrect);
      }, 1700);
    },
    [
      correctCount,
      currentQuestion,
      handleNextQuestion,
      isFinished,
      isRevealed,
      maxTime,
      onSubmitAnswer,
      questions.length,
      score,
      streak,
      timeLeft,
    ],
  );

  /* ---- Per-Second Countdown Timer ---- */
  useEffect(() => {
    if (isRevealed || isFinished || isMapModalOpen) return;

    if (timeLeft <= 0) {
      handleSelectChoice(null);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [handleSelectChoice, isFinished, isMapModalOpen, isRevealed, timeLeft]);

  /* ---- Keyboard Shortcuts (A/B/C/D or 1/2/3/4) ---- */
  useEffect(() => {
    if (isRevealed || isFinished || isMapModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      const key = e.key.toUpperCase();
      if (key === "A" || key === "1") {
        setHoveredChoiceIndex(0);
        handleSelectChoice("A");
      } else if (key === "B" || key === "2") {
        setHoveredChoiceIndex(1);
        handleSelectChoice("B");
      } else if (key === "C" || key === "3") {
        setHoveredChoiceIndex(2);
        handleSelectChoice("C");
      } else if (key === "D" || key === "4") {
        setHoveredChoiceIndex(3);
        handleSelectChoice("D");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelectChoice, isFinished, isMapModalOpen, isRevealed]);

  /* ---- Reset Quiz to Play Again ---- */
  const handleRestartQuiz = useCallback((): void => {
    setCurrentIndex(0);
    setSelectedChoiceId(null);
    setIsRevealed(false);
    setFeedbackBanner(null);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setPlayerHp(100);
    setBossHp(100);
    setIsFinished(false);
    setTimeLeft(questions[0]?.timeLimitSec ?? 20);
  }, [questions]);

  /* ---- Build Dynamic Podium & Leaderboard when Quiz Completes (Tanpa Bot Palsu) ---- */
  const finalRanking = useMemo(() => {
    const roster: Array<{
      id: string;
      username: string;
      points: number;
      spriteSrc: string;
      avatarSrc: string;
    }> = [
      {
        id: "player-self",
        username: activePlayerName,
        points: score,
        spriteSrc: activePlayerChar.spriteSrc,
        avatarSrc: CHECKBOX_CHECKED,
      },
      ...otherPlayers,
    ];

    roster.sort((a, b) => b.points - a.points);

    const podium: [PodiumPlayer, PodiumPlayer, PodiumPlayer] = [
      roster[0]
        ? {
            id: roster[0].id,
            rank: 1 as PodiumRank,
            username: roster[0].username,
            points: roster[0].points,
            spriteSrc: roster[0].spriteSrc,
          }
        : {
            id: "empty-1",
            rank: 1 as PodiumRank,
            username: "-",
            points: 0,
            spriteSrc: DEFAULT_CHARACTERS[0]!.spriteSrc,
          },
      roster[1]
        ? {
            id: roster[1].id,
            rank: 2 as PodiumRank,
            username: roster[1].username,
            points: roster[1].points,
            spriteSrc: roster[1].spriteSrc,
          }
        : {
            id: "empty-2",
            rank: 2 as PodiumRank,
            username: "-",
            points: 0,
            spriteSrc: DEFAULT_CHARACTERS[1]!.spriteSrc,
          },
      roster[2]
        ? {
            id: roster[2].id,
            rank: 3 as PodiumRank,
            username: roster[2].username,
            points: roster[2].points,
            spriteSrc: roster[2].spriteSrc,
          }
        : {
            id: "empty-3",
            rank: 3 as PodiumRank,
            username: "-",
            points: 0,
            spriteSrc: DEFAULT_CHARACTERS[2]!.spriteSrc,
          },
    ];

    const leaderboard: LeaderboardPlayer[] = roster.slice(3, 8).map((entry, idx) => ({
      id: entry.id,
      rank: idx + 4,
      username: entry.username,
      points: entry.points,
      avatarSrc: entry.avatarSrc,
      spriteSrc: entry.spriteSrc,
    }));

    return { podium, leaderboard };
  }, [activePlayerChar.spriteSrc, activePlayerName, otherPlayers, score]);

  /* ---- Render Final Results Podium once Quiz Finishes ---- */
  if (isFinished) {
    return (
      <div className="relative min-h-screen font-pixel">
        {/* Top Action Bar over Final Results */}
        <div className="fixed top-4 left-4 z-50 flex flex-wrap gap-3 drop-shadow-[4px_4px_0_#000]">
          <Link
            href="/home"
            className="relative flex h-12 w-48 items-center justify-center px-6"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <img
                src={resolveAssetSrc(UI_BUTTON_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
              />
            </div>
            <span className="relative z-10 text-[9px] text-lime-300 text-stroke-pixel sm:text-[10px]">
              Ke Home
            </span>
          </Link>

          <Link
            href="/lobby"
            className="relative flex h-12 w-48 items-center justify-center px-6"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <img
                src={resolveAssetSrc(UI_BUTTON_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
              />
            </div>
            <span className="relative z-10 text-[9px] text-white text-stroke-pixel sm:text-[10px]">
              Kembali Lobi
            </span>
          </Link>

          <button
            type="button"
            onClick={handleRestartQuiz}
            className="relative flex h-12 w-52 cursor-pointer items-center justify-center px-8"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <img
                src={resolveAssetSrc(UI_BUTTON_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none translate-x-0 select-none"
              />
            </div>
            <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
              Ulangi Kuis
            </span>
          </button>
        </div>

        <FinalResults
          podium={finalRanking.podium}
          leaderboard={finalRanking.leaderboard}
          title="FINAL RESULTS"
        />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#12091f] font-pixel text-white">
      {/* Dungeon Map Background from `/public/assets/pilih maps quis/` */}
      <img
        src={resolveAssetSrc(activeMap.bgSrc)}
        alt={activeMap.name}
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none transition-all duration-500"
      />

      {/* Atmospheric Dark Dungeon Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/50 via-[#1e1035]/25 to-black/75"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
        {/* 1. Top HUD: Navigation + Question/Map Banner + Timer & Score */}
        <header className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
          {/* Left: Keluar & Pilih Map Buttons */}
          <div className="flex flex-wrap items-center gap-2 lg:col-span-4">
            <Link
              href="/lobby"
              className="relative flex h-11 w-36 items-center justify-center px-4 drop-shadow-[4px_4px_0_#000] active:translate-y-0.5 sm:w-40"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <img
                  src={resolveAssetSrc(UI_BUTTON_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 hue-rotate-[-18deg] saturate-150 select-none"
                />
              </div>
              <span className="relative z-10 text-[9px] text-white text-stroke-pixel sm:text-[10px]">
                Keluar
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="relative flex h-11 w-44 cursor-pointer items-center justify-center px-5 drop-shadow-[4px_4px_0_#000] active:translate-y-0.5 sm:w-48"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <img
                  src={resolveAssetSrc(UI_BUTTON_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
                />
              </div>
              <span className="relative z-10 text-[9px] text-amber-200 text-stroke-pixel sm:text-[10px]">
                Pilih Map
              </span>
            </button>
          </div>

          {/* Center: Question Progress & Active Map Banner */}
          <div className="flex flex-col items-center drop-shadow-[4px_4px_0_#000] lg:col-span-4">
            <div className="relative flex h-12 w-full max-w-xs items-center justify-center px-10">
              <img
                src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
                SOAL {currentIndex + 1} / {activeQuestions.length}
              </span>
            </div>

            <div className="relative -mt-1 flex h-9 w-11/12 max-w-xs items-center justify-center px-8">
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <img
                  src={resolveAssetSrc(UI_SCROLL_BANNER_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
                />
              </div>
              <span className="relative z-10 text-[8px] text-cyan-200 text-stroke-pixel sm:text-[9px]">
                {activeMap.name.toUpperCase()} • {sessionCode}
              </span>
            </div>
          </div>

          {/* Right: Countdown Skull Bar + Score Badge */}
          <div className="flex flex-col items-end gap-1.5 lg:col-span-4">
            <div className="w-full max-w-xs">
              <SkullBar
                label="Waktu"
                current={timeLeft}
                max={maxTime}
                variant="gold"
                valueText={`${timeLeft} DETIK`}
              />
            </div>

            <div className="flex items-center gap-2">
              {streak > 1 && (
                <div className="relative flex h-8 items-center justify-center px-5 drop-shadow-[3px_3px_0_#000]">
                  <img
                    src={resolveAssetSrc(UI_HEADER_GOTHIC_CRIMSON)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                  />
                  <span className="relative z-10 text-[8px] text-lime-300 text-stroke-pixel sm:text-[9px]">
                    COMBO x{streak}
                  </span>
                </div>
              )}

              <div className="relative flex h-9 items-center justify-center px-7 drop-shadow-[3px_3px_0_#000]">
                <img
                  src={resolveAssetSrc(UI_HEADER_GOTHIC_SLATE)}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                />
                <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[11px]">
                  SKOR: {score} PTS
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Middle Row: RPG Dungeon Battle Stage (Student vs Dungeon Boss) */}
        <section
          aria-label="Arena Pertarungan Kuis"
          className="relative my-auto flex flex-col items-center justify-between gap-4 py-2 sm:flex-row sm:px-6"
        >
          {/* Student Character (Left Side) */}
          <div
            className={`flex flex-col items-center transition-transform duration-300 ${
              isPlayerAttacking ? "translate-x-8 scale-105 sm:translate-x-14" : "translate-x-0"
            }`}
          >
            <div className="relative flex items-center justify-center p-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-4 bottom-1 h-8 rounded-full bg-[#f472b6]/45 shadow-[0_0_20px_rgba(244,114,182,0.7)]"
              />
              <FighterSprite
                src={activePlayerChar.spriteSrc}
                alt={activePlayerName}
                isMoving={isPlayerAttacking}
                isHit={isPlayerHit}
              />
            </div>

            <div className="relative -mt-2 flex h-9 min-w-48 items-center justify-center px-7 drop-shadow-[3px_3px_0_#000]">
              <img
                src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                {activePlayerName} <span className="text-cyan-300">LV.{activePlayerLevel}</span>
              </span>
            </div>

            <div className="mt-1 w-48 sm:w-56">
              <SkullBar label="HP Pemain" current={playerHp} max={100} variant="red" />
            </div>
          </div>

          {/* Center Feedback Banner (BENAR / SALAH) */}
          {feedbackBanner && (
            <div
              role="status"
              className="relative z-30 flex min-h-16 items-center justify-center px-10 py-3 drop-shadow-[6px_6px_0_#000]"
            >
              <img
                src={resolveAssetSrc(
                  feedbackBanner.isCorrect ? UI_HEADER_GOTHIC_GOLD : UI_HEADER_GOTHIC_CRIMSON,
                )}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span
                className={`relative z-10 text-center text-xs text-stroke-pixel sm:text-sm ${
                  feedbackBanner.isCorrect ? "text-lime-300" : "text-rose-200"
                }`}
              >
                {feedbackBanner.text}
              </span>
            </div>
          )}

          {/* Dungeon Quiz Guardian / Boss (Right Side) */}
          <div
            className={`hidden flex-col items-center transition-transform duration-200 sm:flex ${
              isBossHit ? "translate-x-3 scale-95" : "translate-x-0"
            }`}
          >
            <div className="relative flex items-center justify-center p-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-4 bottom-1 h-8 rounded-full bg-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.65)]"
              />
              {isBossHit && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
                >
                  <img
                    src={resolveAssetSrc(UI_TARGET_FRAME_SHEET)}
                    alt=""
                    draggable={false}
                    className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                  />
                </div>
              )}
              <FighterSprite
                src={BOSS_SPRITE_SRC}
                alt="Penjaga Kuis"
                flipLeft
                isHit={isBossHit}
              />
            </div>

            <div className="relative -mt-2 flex h-9 min-w-48 items-center justify-center px-7 drop-shadow-[3px_3px_0_#000]">
              <img
                src={resolveAssetSrc(UI_HEADER_GOTHIC_CRIMSON)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-[9px] text-rose-200 text-stroke-pixel sm:text-[10px]">
                PENJAGA KUIS
              </span>
            </div>

            <div className="mt-1 w-48 sm:w-56">
              <SkullBar label="HP Boss" current={bossHp} max={100} variant="blue" />
            </div>
          </div>
        </section>

        {/* 3. Bottom Panel: Question Box & 4 Ornate Answer Buttons (A, B, C, D) */}
        <section
          aria-label="Soal dan Pilihan Jawaban"
          className="mx-auto flex w-full max-w-4xl flex-col gap-3"
        >
          {/* Ornate Question Banner (`HeaderA.png`) */}
          <div className="relative flex min-h-24 w-full items-center justify-center px-10 py-5 drop-shadow-[6px_6px_0_#000] sm:min-h-28 sm:px-16">
            <img
              src={resolveAssetSrc(UI_HEADER_PURPLE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <p className="relative z-10 text-center text-[11px] leading-relaxed text-[#ffe4b5] text-stroke-pixel sm:text-sm">
              {currentQuestion.question}
            </p>
          </div>

          {/* 4 Multiple Choice Buttons using Ornate Diamond-Tipped Button Sheet */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {currentQuestion.choices.map((choice, idx) => {
              const isHovered = hoveredChoiceIndex === idx;
              const isSelected = selectedChoiceId === choice.id;
              const isCorrectChoice = choice.id === currentQuestion.correctChoiceId;

              let filterClass = "translate-x-0";
              if (isRevealed) {
                if (isCorrectChoice) {
                  filterClass = "-translate-x-1/4 hue-rotate-[75deg] saturate-150 brightness-110";
                } else if (isSelected && !isCorrectChoice) {
                  filterClass = "-translate-x-1/4 hue-rotate-[-25deg] saturate-200";
                } else {
                  filterClass = "translate-x-0 opacity-65";
                }
              } else if (isHovered) {
                filterClass = "-translate-x-1/4";
              }

              return (
                <div key={choice.id} className="flex items-center">
                  {/* Animated Golden Cross-Dagger Cursor on active choice */}
                  <div
                    aria-hidden
                    className={`mr-1 h-7 w-11 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-opacity sm:h-8 sm:w-13 ${
                      isHovered ? "opacity-100" : "mr-0 w-0 opacity-0"
                    }`}
                  >
                    <img
                      src={resolveAssetSrc(UI_CURSOR_HORIZ_SHEET)}
                      alt=""
                      draggable={false}
                      className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isRevealed}
                    onMouseEnter={() => setHoveredChoiceIndex(idx)}
                    onFocus={() => setHoveredChoiceIndex(idx)}
                    onClick={() => handleSelectChoice(choice.id)}
                    className="relative flex min-h-14 flex-1 cursor-pointer items-center justify-start gap-3 px-8 py-3 text-left drop-shadow-[4px_4px_0_#000] transition-transform active:translate-y-0.5 disabled:cursor-default sm:min-h-16 sm:px-10"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                      <img
                        src={resolveAssetSrc(UI_BUTTON_SHEET)}
                        alt=""
                        draggable={false}
                        className={`pixelated h-full w-[400%] max-w-none select-none ${filterClass}`}
                      />
                    </div>

                    <span className="relative z-10 shrink-0 text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
                      [{choice.id}]
                    </span>
                    <span className="relative z-10 text-[10px] leading-snug text-white text-stroke-pixel sm:text-xs">
                      {choice.text}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Dungeon Map Selector Modal (`/public/assets/pilih maps quis/`) */}
      {isMapModalOpen && (
        <MapSelectorModal
          maps={maps}
          selectedMapId={activeMap.id}
          onSelectMap={(map) => setCustomMap(map)}
          onClose={() => setIsMapModalOpen(false)}
        />
      )}
    </main>
  );
}
