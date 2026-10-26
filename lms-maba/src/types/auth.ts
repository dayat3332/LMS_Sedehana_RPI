import { DEFAULT_CHARACTERS, type CharacterOption, type StatBarValue } from "@/types/lobby";

/** Status kehadiran mahasiswa pada sesi aktif. */
export type AttendanceStatus = "BELUM_ABSEN" | "HADIR" | "IZIN" | "SAKIT";

/** Pilihan Divisi Kontes. */
export type ContestDivision = "Hardware" | "Mekanik" | "Program";

/** Data profil lengkap pengguna (Login, Register, Home, Absensi, Lobi, Kuis). */
export interface UserAccountProfile {
  readonly id: string;
  readonly name: string;
  readonly nim: string;
  readonly email: string;
  /** Menyimpan Program Studi atau Kelas (mis. "Teknik Informatika / TI-2A"). */
  readonly prodi: string;
  /** Menyimpan Divisi Kontes ("Hardware" | "Mekanik" | "Program"). */
  readonly divisiRiset: string;
  readonly password?: string;
  readonly level: number;
  readonly exp: number;
  readonly character: CharacterOption;
  readonly kehadiran: StatBarValue;
  readonly tugas: StatBarValue;
  readonly attendanceStatus: AttendanceStatus;
  readonly lastAttendanceTime?: string;
  readonly lastAttendanceCode?: string;
}

/** Input form untuk halaman Login. */
export interface LoginFormValues {
  /** Bisa berupa Nama Lengkap, NIM, atau Email. */
  readonly identifier: string;
  readonly password: string;
}

/** Input form untuk halaman Register. */
export interface RegisterFormValues {
  readonly nim: string;
  readonly name: string;
  /** Program Studi atau Kelas. */
  readonly prodi: string;
  /** Divisi Kontes: Hardware, Mekanik, atau Program. */
  readonly divisiRiset: string;
  readonly email: string;
  readonly password: string;
  readonly characterId?: string;
}

/** Pilihan Program Studi / Kelas contoh. */
export const DEFAULT_PRODI_OPTIONS: readonly string[] = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Rekayasa Perangkat Lunak",
  "Teknik Komputer",
  "Teknik Elektro",
  "Teknik Mesin",
  "Teknologi Informasi",
  "Sains Data",
];

/** Pilihan Divisi Kontes (Hardware, Mekanik, Program). */
export const DEFAULT_DIVISI_RISET_OPTIONS: readonly {
  readonly id: string;
  readonly name: ContestDivision;
  readonly badge: string;
  readonly description: string;
}[] = [
  {
    id: "div-hardware",
    name: "Hardware",
    badge: "DIVISI HARDWARE",
    description: "Perancangan rangkaian elektronik, sensor, PCB, dan sistem daya.",
  },
  {
    id: "div-mekanik",
    name: "Mekanik",
    badge: "DIVISI MEKANIK",
    description: "Konstruksi rangka, aktuator, kinematika, dan manufaktur mekanis.",
  },
  {
    id: "div-program",
    name: "Program",
    badge: "DIVISI PROGRAM",
    description: "Algoritma kontrol, pemrograman mikrokontroler, AI, dan antarmuka.",
  },
];

/** Profil awal (dinolkan / belum ada data palsu). */
export const DEFAULT_USER_PROFILE: UserAccountProfile = {
  id: "",
  name: "KSATRIA BARU",
  nim: "-",
  email: "-",
  prodi: "-",
  divisiRiset: "Hardware",
  password: "",
  level: 1,
  exp: 0,
  character: DEFAULT_CHARACTERS[0]!,
  kehadiran: { current: 0, max: 8 },
  tugas: { current: 0, max: 3 },
  attendanceStatus: "BELUM_ABSEN",
};
