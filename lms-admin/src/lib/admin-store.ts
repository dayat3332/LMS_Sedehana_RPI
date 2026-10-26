"use client";

import type {
  AbsensiLogRow,
  AbsensiSessionRow,
  AttendanceStatus,
  GradeRow,
  QuizRow,
  UserRow,
} from "@/types/database";

interface SharedDatabaseResponse {
  users: UserRow[];
  sessions: AbsensiSessionRow[];
  logs: AbsensiLogRow[];
  quizzes: QuizRow[];
  grades: GradeRow[];
}

const LEGACY_KEYS = [
  "lms_admin_users_v1",
  "lms_admin_sessions_v1",
  "lms_admin_logs_v1",
  "lms_admin_quizzes_v1",
  "lms_admin_grades_v2",
];

function clearLegacyLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const k of LEGACY_KEYS) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

async function fetchSharedDb(): Promise<SharedDatabaseResponse> {
  clearLegacyLocalStorage();
  const res = await fetch("/api/db", { cache: "no-store" });
  if (!res.ok) {
    return { users: [], sessions: [], logs: [], quizzes: [], grades: [] };
  }
  return (await res.json()) as SharedDatabaseResponse;
}

async function mutateSharedDb(
  action: string,
  payload?: Record<string, unknown>,
): Promise<SharedDatabaseResponse> {
  clearLegacyLocalStorage();
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
    cache: "no-store",
  });
  const data = (await res.json()) as
    | SharedDatabaseResponse
    | { db: SharedDatabaseResponse };
  if ("db" in data) return data.db;
  return data;
}

export async function resetAllDatabase(): Promise<SharedDatabaseResponse> {
  return mutateSharedDb("reset_all");
}

// ============================================================================
// USERS ('maba' & 'admin')
// ============================================================================
export async function fetchUsers(): Promise<UserRow[]> {
  const db = await fetchSharedDb();
  return db.users;
}

export async function createMaba(payload: {
  nama_ksatria: string;
  nim: string;
  email: string;
  prodi?: string;
  divisi?: string;
  faksi: string;
}): Promise<UserRow> {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_maba", payload }),
    cache: "no-store",
  });
  const data = (await res.json()) as { user: UserRow };
  return data.user;
}

export async function updateMaba(
  id: string,
  payload: Partial<
    Pick<UserRow, "nama_ksatria" | "nim" | "email" | "prodi" | "divisi" | "faksi">
  >,
): Promise<UserRow[]> {
  const db = await mutateSharedDb("update_maba", { id, ...payload });
  return db.users;
}

export async function deleteMaba(id: string): Promise<UserRow[]> {
  const db = await mutateSharedDb("delete_maba", { id });
  return db.users;
}

// ============================================================================
// ABSENSI SESSIONS & LOGS
// ============================================================================
export async function fetchAbsensiSessions(): Promise<AbsensiSessionRow[]> {
  const db = await fetchSharedDb();
  return db.sessions;
}

export async function createAbsensiSession(
  runeCode: string,
): Promise<AbsensiSessionRow[]> {
  const db = await mutateSharedDb("create_session", { rune_code: runeCode });
  return db.sessions;
}

export async function toggleSessionStatus(
  sessionId: string,
  isActive: boolean,
): Promise<AbsensiSessionRow[]> {
  const db = await mutateSharedDb("toggle_session", {
    session_id: sessionId,
    is_active: isActive,
  });
  return db.sessions;
}

export async function fetchAbsensiLogs(): Promise<AbsensiLogRow[]> {
  const db = await fetchSharedDb();
  return db.logs;
}

export async function recordAttendanceLog(payload: {
  session_id: string;
  maba_id: string;
  status: AttendanceStatus;
}): Promise<AbsensiLogRow[]> {
  const db = await mutateSharedDb("record_log", payload);
  return db.logs;
}

// ============================================================================
// QUIZZES
// ============================================================================
export async function fetchQuizzes(): Promise<QuizRow[]> {
  const db = await fetchSharedDb();
  return db.quizzes;
}

export async function saveQuiz(
  payload: Omit<QuizRow, "id" | "created_at"> & { id?: string },
): Promise<QuizRow[]> {
  const db = await mutateSharedDb("save_quiz", payload);
  return db.quizzes;
}

export async function deleteQuiz(id: string): Promise<QuizRow[]> {
  const db = await mutateSharedDb("delete_quiz", { id });
  return db.quizzes;
}

// ============================================================================
// GRADES
// ============================================================================
export async function fetchGrades(): Promise<GradeRow[]> {
  const db = await fetchSharedDb();
  return db.grades;
}

export async function upsertGrade(payload: {
  maba_id: string;
  kehadiran_pertemuan: boolean[];
  keaktifan_pertemuan: number[];
  tugas_detail: number[];
  ujian: number;
}): Promise<GradeRow[]> {
  const db = await mutateSharedDb("upsert_grade", payload);
  return db.grades;
}
