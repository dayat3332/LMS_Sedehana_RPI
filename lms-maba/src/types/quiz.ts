import type { CharacterOption } from "@/types/lobby";

/** A selectable dungeon background map from `/public/assets/pilih maps quis/`. */
export interface QuizMapOption {
  readonly id: string;
  readonly name: string;
  readonly bgSrc: string;
}

export type AnswerChoiceId = "A" | "B" | "C" | "D";

/** Single multiple-choice option inside a quiz question. */
export interface QuizChoice {
  readonly id: AnswerChoiceId;
  readonly text: string;
}

/** A quiz question item. */
export interface QuizQuestion {
  readonly id: string;
  readonly question: string;
  readonly choices: readonly QuizChoice[];
  readonly correctChoiceId: AnswerChoiceId;
  /** Base points awarded for a correct answer (default: 200). */
  readonly points?: number;
  /** Time limit in seconds for this question (default: 20). */
  readonly timeLimitSec?: number;
}

/** Summary payload emitted when the student finishes all questions. */
export interface QuizResultSummary {
  readonly totalScore: number;
  readonly correctCount: number;
  readonly totalQuestions: number;
}

/** Props for the `<QuizArena />` component. */
export interface QuizArenaProps {
  readonly playerName?: string;
  readonly playerLevel?: number;
  readonly playerCharacter?: CharacterOption;
  readonly sessionCode?: string;
  readonly questions?: readonly QuizQuestion[];
  readonly maps?: readonly QuizMapOption[];
  readonly initialMapId?: string;
  /** Triggered whenever the player selects an answer. */
  readonly onSubmitAnswer?: (payload: {
    readonly questionId: string;
    readonly selectedChoiceId: AnswerChoiceId | null;
    readonly isCorrect: boolean;
    readonly earnedPoints: number;
  }) => void | Promise<void>;
  /** Triggered when all questions are completed. */
  readonly onCompleteQuiz?: (summary: QuizResultSummary) => void | Promise<void>;
}

const MAPS_BASE = "/public/assets/pilih maps quis";

/** All 10 dungeon backgrounds available in `/public/assets/pilih maps quis/`. */
export const DEFAULT_QUIZ_MAPS: readonly QuizMapOption[] = [
  {
    id: "map-01",
    name: "Stone Corridor",
    bgSrc: `${MAPS_BASE}/01_stone_corridor.png`,
  },
  {
    id: "map-02",
    name: "Throne Room",
    bgSrc: `${MAPS_BASE}/02_throne_room.png`,
  },
  {
    id: "map-03",
    name: "Treasure Room",
    bgSrc: `${MAPS_BASE}/03_treasure_room.png`,
  },
  {
    id: "map-04",
    name: "Prison Cells",
    bgSrc: `${MAPS_BASE}/04_prison_cells.png`,
  },
  {
    id: "map-05",
    name: "Ancient Library",
    bgSrc: `${MAPS_BASE}/05_ancient_library.png`,
  },
  {
    id: "map-06",
    name: "Ritual Chamber",
    bgSrc: `${MAPS_BASE}/06_ritual_chamber.png`,
  },
  {
    id: "map-07",
    name: "Crystal Cave",
    bgSrc: `${MAPS_BASE}/07_crystal_cave.png`,
  },
  {
    id: "map-08",
    name: "Lava Chamber",
    bgSrc: `${MAPS_BASE}/08_lava_chamber.png`,
  },
  {
    id: "map-09",
    name: "Ancient Crypt",
    bgSrc: `${MAPS_BASE}/09_ancient_crypt.png`,
  },
  {
    id: "map-10",
    name: "Boss Room",
    bgSrc: `${MAPS_BASE}/10_boss_room.png`,
  },
];

/** Default sample quiz questions for testing the Quiz Arena. */
export const DEFAULT_QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "q-1",
    question: "Tahap pertama dalam metode pengembangan perangkat lunak SDLC adalah...",
    choices: [
      { id: "A", text: "Analisis Kebutuhan & Perencanaan" },
      { id: "B", text: "Deployment ke Server Produksi" },
      { id: "C", text: "Maintenance Sistem Lama" },
      { id: "D", text: "Penghapusan Database" },
    ],
    correctChoiceId: "A",
    points: 200,
    timeLimitSec: 20,
  },
  {
    id: "q-2",
    question: "Diagram UML yang menggambarkan interaksi objek berdasarkan urutan waktu adalah...",
    choices: [
      { id: "A", text: "Class Diagram" },
      { id: "B", text: "Sequence Diagram" },
      { id: "C", text: "Entity Relationship Diagram" },
      { id: "D", text: "Deployment Diagram" },
    ],
    correctChoiceId: "B",
    points: 200,
    timeLimitSec: 20,
  },
  {
    id: "q-3",
    question: "Manakah perintah Git yang digunakan untuk menyimpan perubahan ke dalam riwayat lokal?",
    choices: [
      { id: "A", text: "git clone" },
      { id: "B", text: "git status" },
      { id: "C", text: "git commit" },
      { id: "D", text: "git checkout" },
    ],
    correctChoiceId: "C",
    points: 200,
    timeLimitSec: 20,
  },
  {
    id: "q-4",
    question: "Dalam pengembangan web modern, HTTP status code 200 menandakan bahwa...",
    choices: [
      { id: "A", text: "Halaman tidak ditemukan" },
      { id: "B", text: "Server mengalami gangguan" },
      { id: "C", text: "Akses ditolak (Unauthorized)" },
      { id: "D", text: "Permintaan berhasil diproses (OK)" },
    ],
    correctChoiceId: "D",
    points: 200,
    timeLimitSec: 20,
  },
  {
    id: "q-5",
    question: "Struktur data yang menggunakan prinsip LIFO (Last In, First Out) disebut...",
    choices: [
      { id: "A", text: "Stack (Tumpukan)" },
      { id: "B", text: "Queue (Antrean)" },
      { id: "C", text: "Graph Berarah" },
      { id: "D", text: "Binary Search Tree" },
    ],
    correctChoiceId: "A",
    points: 250,
    timeLimitSec: 20,
  },
];
