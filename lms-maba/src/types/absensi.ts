import type { AttendanceStatus } from "@/types/auth";

/** Satu entri riwayat kehadiran / pertemuan. */
export interface AttendanceLogItem {
  readonly id: string;
  readonly meetingNumber: number;
  readonly title: string;
  readonly date: string;
  readonly time: string;
  readonly status: AttendanceStatus;
  readonly qrCode: string;
  readonly expReward: number;
}

/** Informasi sesi absensi aktif di kelas/riset. */
export interface ActiveAttendanceSession {
  readonly sessionCode: string;
  readonly agendaTitle: string;
  readonly divisionName: string;
  readonly dateText: string;
  readonly timeWindow: string;
  readonly expReward: number;
}

export const DEFAULT_ATTENDANCE_LOGS: readonly AttendanceLogItem[] = [];
