"use client";

import {
  DEFAULT_USER_PROFILE,
  type AttendanceStatus,
  type ContestDivision,
  type LoginFormValues,
  type RegisterFormValues,
  type UserAccountProfile,
} from "@/types/auth";
import { DEFAULT_CHARACTERS, type CharacterOption } from "@/types/lobby";

const STORAGE_KEY_PROFILE = "lmsrpi_active_user_v2";
const STORAGE_KEY_ACCOUNTS = "lmsrpi_registered_accounts_v2";
const STORAGE_KEY_RESET_AT = "lmsrpi_last_reset_at";
const LEGACY_KEY_PROFILE = "lmsrpi_active_user_v1";
const LEGACY_KEY_ACCOUNTS = "lmsrpi_registered_accounts_v1";

function isDummyOrEmptyProfile(p?: Partial<UserAccountProfile> | null): boolean {
  if (!p) return true;
  const nim = (p.nim ?? "").trim();
  const name = (p.name ?? "").trim().toUpperCase();
  if (!nim || nim === "-" || nim === "240101042") return true;
  if (!name || name === "BELUM TERDAFTAR" || name === "DIDING SATRIA") return true;
  return false;
}

function migrateAndCleanLegacyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const legacyProfileRaw = window.localStorage.getItem(LEGACY_KEY_PROFILE);
    if (legacyProfileRaw) {
      const parsed = JSON.parse(legacyProfileRaw) as Partial<UserAccountProfile>;
      if (!isDummyOrEmptyProfile(parsed) && !window.localStorage.getItem(STORAGE_KEY_PROFILE)) {
        window.localStorage.setItem(STORAGE_KEY_PROFILE, legacyProfileRaw);
      }
      window.localStorage.removeItem(LEGACY_KEY_PROFILE);
    }

    const legacyAccountsRaw = window.localStorage.getItem(LEGACY_KEY_ACCOUNTS);
    if (legacyAccountsRaw) {
      const parsedList = JSON.parse(legacyAccountsRaw) as Partial<UserAccountProfile>[];
      if (Array.isArray(parsedList)) {
        const realAccounts = parsedList.filter((item) => !isDummyOrEmptyProfile(item));
        if (realAccounts.length > 0 && !window.localStorage.getItem(STORAGE_KEY_ACCOUNTS)) {
          window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(realAccounts));
        }
      }
      window.localStorage.removeItem(LEGACY_KEY_ACCOUNTS);
    }
  } catch {
    // ignore
  }
}

/**
 * Mengambil profil pengguna yang sedang aktif dari localStorage,
 * atau mengembalikan `DEFAULT_USER_PROFILE` jika belum ada.
 */
export function loadUserProfile(): UserAccountProfile {
  if (typeof window === "undefined") {
    return DEFAULT_USER_PROFILE;
  }

  migrateAndCleanLegacyStorage();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserAccountProfile>;
    if (isDummyOrEmptyProfile(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY_PROFILE);
      return DEFAULT_USER_PROFILE;
    }
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed,
      character: parsed.character ?? DEFAULT_USER_PROFILE.character,
      kehadiran: parsed.kehadiran ?? DEFAULT_USER_PROFILE.kehadiran,
      tugas: parsed.tugas ?? DEFAULT_USER_PROFILE.tugas,
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

/**
 * Menyimpan perubahan profil pengguna ke localStorage.
 */
export function saveUserProfile(profile: UserAccountProfile): void {
  if (typeof window === "undefined") return;
  migrateAndCleanLegacyStorage();
  try {
    window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Mengambil daftar akun yang pernah diregistrasikan di browser.
 */
export function loadRegisteredAccounts(): UserAccountProfile[] {
  if (typeof window === "undefined") return [];
  migrateAndCleanLegacyStorage();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserAccountProfile[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => !isDummyOrEmptyProfile(item))
      : [];
  } catch {
    return [];
  }
}

/**
 * Menyinkronkan profil pengguna aktif dua arah antara localStorage browser dan database server bersama (`/api/db`):
 * 1. Jika Admin baru saja menekan "Nol-kan Semua Data" (`reset_at` berubah dan `users` kosong), bersihkan localStorage.
 * 2. Jika localStorage memiliki akun nyata yang belum masuk ke `db.users` (misal dibuat saat container lama), otomatis kirim ke `/api/db`.
 * 3. Jika localStorage memiliki status absensi (`HADIR`/`IZIN`/`SAKIT`) yang belum tercatat di `db.logs`, otomatis kirim ke `/api/db`.
 * 4. Jika localStorage belum memiliki akun (misal baru buka `/absensi` lewat HP untuk scan QR) namun di server sudah ada akun Maba, tarik akun terbaru dari server.
 */
export async function syncActiveUserWithServer(): Promise<UserAccountProfile> {
  const localProfile = loadUserProfile();
  if (typeof window === "undefined") return localProfile;

  try {
    const res = await fetch("/api/db", { cache: "no-store" });
    if (!res.ok) return localProfile;

    const db = (await res.json()) as {
      reset_at?: string;
      users?: Array<{
        id: string;
        nim: string;
        nama_ksatria: string;
        email: string;
        prodi: string;
        divisi: string;
        faksi: string;
        password?: string;
        role: "maba" | "admin";
      }>;
      sessions?: Array<{
        id: string;
        rune_code: string;
        is_active: boolean;
      }>;
      logs?: Array<{
        id: string;
        session_id: string;
        maba_id: string;
        status: AttendanceStatus;
        qr_code?: string;
        created_at: string;
      }>;
    };

    const serverResetAt = db.reset_at ?? "";
    const localResetAt = window.localStorage.getItem(STORAGE_KEY_RESET_AT) ?? "";

    if (serverResetAt && serverResetAt !== localResetAt) {
      window.localStorage.setItem(STORAGE_KEY_RESET_AT, serverResetAt);
      if ((db.users ?? []).length === 0) {
        window.localStorage.removeItem(STORAGE_KEY_PROFILE);
        window.localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
        return DEFAULT_USER_PROFILE;
      }
    }

    const mabaUsers = (db.users ?? []).filter((u) => u.role === "maba");
    const activeSession =
      (db.sessions ?? []).find((s) => s.is_active) ?? (db.sessions ?? [])[0];

    // KASUS 1: Ada akun nyata di localStorage
    if (!isDummyOrEmptyProfile(localProfile)) {
      let matchedServerUser = mabaUsers.find(
        (u) =>
          u.id === localProfile.id ||
          u.nim.toLowerCase() === localProfile.nim.toLowerCase() ||
          u.email.toLowerCase() === localProfile.email.toLowerCase(),
      );

      // Jika akun lokal belum ada di database server, kirim sekarang!
      if (!matchedServerUser) {
        const regRes = await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register_maba",
            payload: {
              id: localProfile.id,
              nim: localProfile.nim,
              nama_ksatria: localProfile.name,
              prodi: localProfile.prodi,
              divisi: localProfile.divisiRiset,
              faksi: `${localProfile.prodi} - Divisi ${localProfile.divisiRiset}`,
              email: localProfile.email,
              password: localProfile.password,
            },
          }),
          cache: "no-store",
        });
        if (regRes.ok) {
          const regData = (await regRes.json()) as {
            user?: {
              id: string;
              nim: string;
              nama_ksatria: string;
              email: string;
              prodi: string;
              divisi: string;
              faksi: string;
            };
          };
          if (regData.user) {
            matchedServerUser = { ...regData.user, role: "maba" };
          }
        }
      }

      const finalUserId = matchedServerUser?.id ?? localProfile.id;
      const userLogs = (db.logs ?? []).filter((l) => l.maba_id === finalUserId);
      const activeSessionLog = activeSession
        ? userLogs.find((l) => l.session_id === activeSession.id)
        : userLogs[0];

      // Jika di localStorage sudah pernah absen tapi belum masuk ke db.logs server, sinkronkan ke server!
      if (
        localProfile.attendanceStatus !== "BELUM_ABSEN" &&
        userLogs.length === 0
      ) {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record_maba_attendance",
            payload: {
              maba_id: finalUserId,
              nim: localProfile.nim,
              nama_ksatria: localProfile.name,
              email: localProfile.email,
              prodi: localProfile.prodi,
              divisi: localProfile.divisiRiset,
              status: localProfile.attendanceStatus,
              qr_code: localProfile.lastAttendanceCode ?? "RPI-ABSEN-2026",
            },
          }),
          cache: "no-store",
        });
        const syncedProfile: UserAccountProfile = {
          ...localProfile,
          id: finalUserId,
        };
        saveUserProfile(syncedProfile);
        return syncedProfile;
      }

      // Sinkronkan status kehadiran untuk sesi aktif saat ini
      const hadirCount = userLogs.filter((l) => l.status === "HADIR").length;
      const currentSessionStatus: AttendanceStatus = activeSessionLog
        ? activeSessionLog.status
        : userLogs.length > 0
          ? userLogs[0]!.status
          : "BELUM_ABSEN";

      const syncedProfile: UserAccountProfile = {
        ...localProfile,
        id: finalUserId,
        level: 1 + hadirCount,
        exp: hadirCount * 100,
        kehadiran: {
          current: Math.min(8, hadirCount),
          max: 8,
        },
        attendanceStatus: currentSessionStatus,
        lastAttendanceCode:
          activeSessionLog?.qr_code ?? localProfile.lastAttendanceCode,
      };
      saveUserProfile(syncedProfile);
      return syncedProfile;
    }

    // KASUS 2: localStorage kosong (misal buka dari HP saat scan QR), tapi di database server sudah ada akun Maba
    if (mabaUsers.length > 0) {
      const latestMaba = mabaUsers[0]!;
      const userLogs = (db.logs ?? []).filter((l) => l.maba_id === latestMaba.id);
      const hadirCount = userLogs.filter((l) => l.status === "HADIR").length;
      const activeSessionLog = activeSession
        ? userLogs.find((l) => l.session_id === activeSession.id)
        : userLogs[0];

      const divisiParsed = (latestMaba.divisi ||
        latestMaba.faksi.split(" - Divisi ")[1] ||
        "Hardware") as ContestDivision;

      const pulledProfile: UserAccountProfile = {
        id: latestMaba.id,
        name: latestMaba.nama_ksatria,
        nim: latestMaba.nim,
        email: latestMaba.email,
        prodi: latestMaba.prodi || latestMaba.faksi.split(" - ")[0] || "-",
        divisiRiset: divisiParsed,
        password: latestMaba.password,
        level: 1 + hadirCount,
        exp: hadirCount * 100,
        character: DEFAULT_CHARACTERS[0]!,
        kehadiran: { current: Math.min(8, hadirCount), max: 8 },
        tugas: { current: 0, max: 3 },
        attendanceStatus: activeSessionLog ? activeSessionLog.status : "BELUM_ABSEN",
        lastAttendanceCode: activeSessionLog?.qr_code,
      };
      saveUserProfile(pulledProfile);
      return pulledProfile;
    }
  } catch {
    // Ignore network error
  }

  return localProfile;
}

/**
 * Mendaftarkan akun baru dari halaman Register, menyimpannya ke database server bersama
 * (`data/db.json`) agar sama persis di dashboard `lms-admin`, dan menjadikannya akun aktif.
 */
export async function registerUserAccount(
  values: RegisterFormValues,
): Promise<UserAccountProfile> {
  const chosenChar: CharacterOption =
    DEFAULT_CHARACTERS.find((c) => c.id === values.characterId) ??
    DEFAULT_CHARACTERS[0]!;

  const cleanedName = values.name.trim().toUpperCase();
  const cleanedEmail = values.email.trim().toLowerCase();
  const cleanedNim = values.nim.trim();
  const cleanedProdi = values.prodi.trim();
  const cleanedDivisi = values.divisiRiset.trim();

  let userId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `u-maba-${Date.now()}`;

  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_maba",
        payload: {
          id: userId,
          nim: cleanedNim,
          nama_ksatria: cleanedName,
          prodi: cleanedProdi,
          divisi: cleanedDivisi,
          faksi: `${cleanedProdi} - Divisi ${cleanedDivisi}`,
          email: cleanedEmail,
          password: values.password,
        },
      }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { user?: { id?: string } };
      if (data.user?.id) {
        userId = data.user.id;
      }
    }
  } catch {
    // Fallback local jika offline
  }

  const newProfile: UserAccountProfile = {
    id: userId,
    name: cleanedName,
    nim: cleanedNim,
    email: cleanedEmail,
    prodi: cleanedProdi,
    divisiRiset: cleanedDivisi,
    password: values.password,
    level: 1,
    exp: 0,
    character: chosenChar,
    kehadiran: { current: 0, max: 8 },
    tugas: { current: 0, max: 3 },
    attendanceStatus: "BELUM_ABSEN",
  };

  if (typeof window !== "undefined") {
    try {
      const existing = loadRegisteredAccounts();
      const updated = [
        newProfile,
        ...existing.filter(
          (acc) =>
            acc.email.toLowerCase() !== newProfile.email.toLowerCase() &&
            acc.nim.toLowerCase() !== newProfile.nim.toLowerCase(),
        ),
      ];
      window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  saveUserProfile(newProfile);
  return newProfile;
}

/**
 * Mencocokkan login berdasarkan Nama / NIM / Email dari database server bersama (`data/db.json`).
 */
export async function loginWithIdentifier(values: LoginFormValues): Promise<{
  ok: boolean;
  profile?: UserAccountProfile;
  error?: string;
}> {
  const query = values.identifier.trim();
  const queryLower = query.toLowerCase();

  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login_maba",
        payload: {
          identifier: query,
          password: values.password,
        },
      }),
      cache: "no-store",
    });

    const data = (await res.json()) as {
      found: boolean;
      error?: string;
      user?: {
        id: string;
        nim: string;
        nama_ksatria: string;
        email: string;
        prodi: string;
        divisi: string;
        faksi: string;
        password?: string;
      };
      logs?: Array<{
        status: AttendanceStatus;
        qr_code?: string;
        created_at: string;
      }>;
    };

    if (!res.ok || !data.found || !data.user) {
      return {
        ok: false,
        error:
          data.error ??
          "PERINGATAN: Akun belum terdaftar! Silakan klik REGISTER terlebih dahulu.",
      };
    }

    const u = data.user;
    const hadirCount = (data.logs ?? []).filter((l) => l.status === "HADIR").length;
    const latestLog = data.logs?.[0];
    const divisiParsed = (u.divisi ||
      u.faksi.split(" - Divisi ")[1] ||
      "Hardware") as ContestDivision;

    const profile: UserAccountProfile = {
      id: u.id,
      name: u.nama_ksatria,
      nim: u.nim,
      email: u.email,
      prodi: u.prodi || u.faksi.split(" - ")[0] || "-",
      divisiRiset: divisiParsed,
      password: u.password,
      level: 1 + hadirCount,
      exp: hadirCount * 100,
      character: DEFAULT_CHARACTERS[0]!,
      kehadiran: { current: Math.min(8, hadirCount), max: 8 },
      tugas: { current: 0, max: 3 },
      attendanceStatus: latestLog ? latestLog.status : "BELUM_ABSEN",
      lastAttendanceCode: latestLog?.qr_code,
    };

    saveUserProfile(profile);
    return { ok: true, profile };
  } catch {
    // Fallback ke akun lokal jika request jaringan gagal
    const accounts = loadRegisteredAccounts();
    const matched = accounts.find(
      (acc) =>
        acc.name.toLowerCase() === queryLower ||
        acc.nim.toLowerCase() === queryLower ||
        acc.email.toLowerCase() === queryLower,
    );

    if (matched) {
      if (matched.password && matched.password !== values.password) {
        return {
          ok: false,
          error: "PERINGATAN: Password yang dimasukkan salah!",
        };
      }
      saveUserProfile(matched);
      return { ok: true, profile: matched };
    }

    return {
      ok: false,
      error:
        "PERINGATAN: Akun belum terdaftar! Silakan klik REGISTER terlebih dahulu.",
    };
  }
}

/**
 * Memperbarui status kehadiran mahasiswa setelah Scan QR atau memilih status,
 * serta mengirimkannya ke database bersama (`data/db.json`) agar tampil di `lms-admin`.
 */
export async function updateAttendanceStatus(
  status: AttendanceStatus,
  qrCode?: string,
): Promise<UserAccountProfile> {
  // Pastikan profil sudah tersinkron dengan server sebelum mengirim absensi
  const current = await syncActiveUserWithServer();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const timeStr = `${hh}:${mm} WIB`;

  const wasAlreadyPresent = current.attendanceStatus === "HADIR";
  const nextCurrentKehadiran =
    status === "HADIR" && !wasAlreadyPresent
      ? Math.min(current.kehadiran.max, Math.max(1, current.kehadiran.current + 1))
      : current.kehadiran.current;

  const updated: UserAccountProfile = {
    ...current,
    attendanceStatus: status,
    lastAttendanceTime: timeStr,
    lastAttendanceCode: qrCode ?? current.lastAttendanceCode ?? "RPI-ABSEN-2026",
    level:
      status === "HADIR" && !wasAlreadyPresent ? current.level + 1 : current.level,
    exp: status === "HADIR" && !wasAlreadyPresent ? current.exp + 100 : current.exp,
    kehadiran: {
      current: nextCurrentKehadiran,
      max: current.kehadiran.max,
    },
  };

  saveUserProfile(updated);

  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record_maba_attendance",
        payload: {
          maba_id: updated.id,
          nim: updated.nim,
          nama_ksatria: updated.name,
          email: updated.email,
          prodi: updated.prodi,
          divisi: updated.divisiRiset,
          status,
          qr_code: qrCode,
        },
      }),
      cache: "no-store",
    });
    if (res.ok) {
      const db = (await res.json()) as {
        users?: Array<{
          id: string;
          nim: string;
          nama_ksatria: string;
          email: string;
          prodi: string;
          divisi: string;
          faksi: string;
          role: "maba" | "admin";
        }>;
      };
      const matched = (db.users ?? []).find(
        (u) =>
          u.role === "maba" &&
          (u.id === updated.id ||
            (updated.nim !== "-" && u.nim.toLowerCase() === updated.nim.toLowerCase()) ||
            u.nama_ksatria.toUpperCase() === updated.name.toUpperCase()),
      );
      if (matched) {
        const finalProfile: UserAccountProfile = {
          ...updated,
          id: matched.id,
          name: matched.nama_ksatria,
          nim: matched.nim,
          email: matched.email,
        };
        saveUserProfile(finalProfile);
        return finalProfile;
      }
    }
  } catch {
    // Ignore network error
  }

  return updated;
}
