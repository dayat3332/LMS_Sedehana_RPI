export type UserRole = "maba" | "admin";

export type AttendanceStatus = "HADIR" | "IZIN" | "SAKIT" | "ALPHA";

export type AnswerOptionKey = "A" | "B" | "C" | "D";

export interface QuizOptionsMap {
  A: string;
  B: string;
  C: string;
  D: string;
}

/** Table: `users` */
export interface UserRow {
  id: string;
  email: string;
  nama_ksatria: string;
  nim: string;
  prodi?: string;
  divisi?: string;
  faksi: string;
  password?: string;
  role: UserRole;
  created_at?: string;
}

/** Table: `absensi_sessions` */
export interface AbsensiSessionRow {
  id: string;
  rune_code: string;
  is_active: boolean;
  created_at: string;
}

/** Table: `absensi_logs` */
export interface AbsensiLogRow {
  id: string;
  session_id: string;
  maba_id: string;
  status: AttendanceStatus;
  qr_code?: string;
  created_at: string;
  /** Joined relation when querying with `users(*)` */
  maba?: UserRow;
}

/** Table: `quizzes` */
export interface QuizRow {
  id: string;
  question: string;
  options: QuizOptionsMap;
  correct_answer: AnswerOptionKey;
  created_at?: string;
}

export const TOTAL_PERTEMUAN_KEHADIRAN = 8;
export const TOTAL_PERTEMUAN_KEAKTIFAN = 8;
export const TOTAL_TUGAS = 3;

/** Table: `grades` */
export interface GradeRow {
  id: string;
  maba_id: string;
  /** Status hadir pada 8 pertemuan (P1 s/d P8) */
  kehadiran_pertemuan?: boolean[];
  /** Nilai keaktifan maba pada 8 pertemuan (P1 s/d P8, skala 0-100) */
  keaktifan_pertemuan?: number[];
  /** Nilai 3 tugas (Tugas 1, Tugas 2, Tugas 3, skala 0-100) */
  tugas_detail?: number[];
  /** Rekap skor kehadiran (0-100) dari 8 pertemuan */
  kehadiran: number;
  /** Rekap skor keaktifan (0-100) dari 8 pertemuan */
  keaktifan: number;
  /** Rekap skor tugas (0-100) dari 3 tugas */
  tugas: number;
  /** Nilai ujian akhir (0-100) */
  ujian: number;
  /** Nilai akhir gabungan dari Kehadiran + Keaktifan + Tugas + Ujian */
  nilai_akhir: number;
  updated_at?: string;
  /** Joined relation when querying with `users(*)` */
  maba?: UserRow;
}

export const FAKSI_OPTIONS: readonly string[] = [
  "Teknik Informatika - Divisi Program",
  "Teknik Informatika - Divisi Hardware",
  "Rekayasa Perangkat Lunak - Divisi Program",
  "Teknik Elektro - Divisi Hardware",
  "Teknik Mesin - Divisi Mekanik",
  "Sistem Informasi - Divisi Program",
  "Teknik Komputer - Divisi Hardware",
];
