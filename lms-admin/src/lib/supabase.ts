import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  TOTAL_PERTEMUAN_KEAKTIFAN,
  TOTAL_PERTEMUAN_KEHADIRAN,
  TOTAL_TUGAS,
  type AbsensiLogRow,
  type AbsensiSessionRow,
  type GradeRow,
  type QuizRow,
  type UserRow,
} from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Indicates whether valid Supabase environment variables are present.
 */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("your-project-id.supabase.co");

/**
 * Shared Supabase client instance for Akademi Technomancer: Ordo Robotika Polindra.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key",
);

/**
 * Menghitung skor kehadiran (0-100) dari 8 pertemuan.
 */
export function calculateKehadiranFromPertemuan(
  kehadiranPertemuan: readonly boolean[],
): number {
  const hadirCount = kehadiranPertemuan
    .slice(0, TOTAL_PERTEMUAN_KEHADIRAN)
    .filter(Boolean).length;
  return Math.round((hadirCount / TOTAL_PERTEMUAN_KEHADIRAN) * 100 * 100) / 100;
}

/**
 * Menghitung skor rata-rata keaktifan (0-100) dari 8 pertemuan.
 */
export function calculateKeaktifanFromPertemuan(
  keaktifanPertemuan: readonly number[],
): number {
  const items = keaktifanPertemuan.slice(0, TOTAL_PERTEMUAN_KEAKTIFAN);
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, val) => acc + Number(val || 0), 0);
  return Math.round((sum / TOTAL_PERTEMUAN_KEAKTIFAN) * 100) / 100;
}

/**
 * Menghitung skor rata-rata tugas (0-100) dari 3 tugas.
 */
export function calculateTugasFromDetail(
  tugasDetail: readonly number[],
): number {
  const items = tugasDetail.slice(0, TOTAL_TUGAS);
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, val) => acc + Number(val || 0), 0);
  return Math.round((sum / TOTAL_TUGAS) * 100) / 100;
}

/**
 * Computes `nilai_akhir` using standard weighting:
 * 20% Kehadiran (8 pertemuan) + 20% Keaktifan (8 pertemuan) + 30% Tugas (3 tugas) + 30% Ujian
 */
export function calculateNilaiAkhir(scores: {
  kehadiran: number;
  keaktifan: number;
  tugas: number;
  ujian: number;
}): number {
  const weighted =
    scores.kehadiran * 0.2 +
    scores.keaktifan * 0.2 +
    scores.tugas * 0.3 +
    scores.ujian * 0.3;
  return Math.round(weighted * 100) / 100;
}

/**
 * Semua data awal dinolkan (kosong) agar dimulai dari 0 tanpa data palsu/dummy.
 */
export const INITIAL_USERS: UserRow[] = [];
export const INITIAL_ABSENSI_SESSIONS: AbsensiSessionRow[] = [];
export const INITIAL_ABSENSI_LOGS: AbsensiLogRow[] = [];
export const INITIAL_QUIZZES: QuizRow[] = [];
export const INITIAL_GRADES: GradeRow[] = [];
