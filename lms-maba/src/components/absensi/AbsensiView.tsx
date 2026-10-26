"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import QrScannerModal from "@/components/absensi/QrScannerModal";
import RpgSkullBar from "@/components/shared/RpgSkullBar";
import { RpgPortraitArch, RpgSpriteAvatar } from "@/components/shared/RpgSpriteAvatar";
import {
  CHECKBOX_CHECKED,
  CHECKBOX_UNCHECKED,
  LOBBY_BG_SRC,
  resolveAssetSrc,
  UI_BUTTON_SHEET,
  UI_CURSOR_HORIZ_SHEET,
  UI_CURSOR_VERT_SHEET,
  UI_HEADER_GOTHIC_CRIMSON,
  UI_HEADER_GOTHIC_GOLD,
  UI_HEADER_GOTHIC_SLATE,
  UI_HEADER_PURPLE,
  UI_PANEL_9SLICE,
  UI_SCROLL_BANNER_SHEET,
  UI_TARGET_FRAME_SHEET,
} from "@/lib/assets";
import {
  loadUserProfile,
  saveUserProfile,
  syncActiveUserWithServer,
  updateAttendanceStatus,
} from "@/lib/user-storage";
import {
  DEFAULT_ATTENDANCE_LOGS,
  type AttendanceLogItem,
} from "@/types/absensi";
import {
  DEFAULT_USER_PROFILE,
  type AttendanceStatus,
  type UserAccountProfile,
} from "@/types/auth";

const TODAY_SESSION_ID = "att-session-today";

/**
 * Halaman Absensi (`/absensi`) dengan desain 2D RPG:
 * - Meliputi:
 *   1. Nama Lengkap Mahasiswa / Ksatria
 *   2. Pilihan Status Kehadiran (Hadir / Izin / Sakit)
 *   3. 2 CTA Utama: "KIRIM ABSENSI" & "SCAN QR" dengan proteksi Anti-Spam
 *      agar data tidak terkirim berulang-ulang saat klik pilihan status.
 */
export default function AbsensiView() {
  const [user, setUser] = useState<UserAccountProfile>(DEFAULT_USER_PROFILE);
  const [fullNameInput, setFullNameInput] = useState<string>(DEFAULT_USER_PROFILE.name);
  const [draftStatus, setDraftStatus] = useState<AttendanceStatus>("BELUM_ABSEN");
  const [hoveredCta, setHoveredCta] = useState<"kirim" | "scan">("kirim");
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [logs, setLogs] = useState<readonly AttendanceLogItem[]>(DEFAULT_ATTENDANCE_LOGS);
  const [activeRuneCode, setActiveRuneCode] = useState<string>("RPI-ABSEN-2026");
  const [bannerMessage, setBannerMessage] = useState<{
    readonly text: string;
    readonly isError: boolean;
  } | null>(null);

  useEffect(() => {
    const initialProfile = loadUserProfile();
    setUser(initialProfile);
    setFullNameInput(
      initialProfile.name === "BELUM TERDAFTAR" ? "" : initialProfile.name,
    );
    setDraftStatus(initialProfile.attendanceStatus);
    if (initialProfile.attendanceStatus !== "BELUM_ABSEN") {
      setIsSubmitted(true);
    }

    async function initSync() {
      const syncedProfile = await syncActiveUserWithServer();
      setUser(syncedProfile);
      setFullNameInput(
        syncedProfile.name === "BELUM TERDAFTAR" ? "" : syncedProfile.name,
      );
      setDraftStatus(syncedProfile.attendanceStatus);
      setIsSubmitted(syncedProfile.attendanceStatus !== "BELUM_ABSEN");

      try {
        const r = await fetch("/api/db", { cache: "no-store" });
        if (r.ok) {
          const db = (await r.json()) as {
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
          const activeSes =
            db.sessions?.find((s) => s.is_active) ?? db.sessions?.[0];
          if (activeSes?.rune_code) {
            setActiveRuneCode(activeSes.rune_code);
          }

          const myLogs = (db.logs ?? []).filter(
            (l) => l.maba_id === syncedProfile.id,
          );
          if (myLogs.length > 0) {
            setLogs(
              myLogs.map((l, idx) => ({
                id: l.id,
                meetingNumber: myLogs.length - idx,
                title: `Pertemuan Riset (${syncedProfile.divisiRiset})`,
                date: new Date(l.created_at).toLocaleDateString("id-ID"),
                time: new Date(l.created_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                status: l.status,
                qrCode: l.qr_code ?? activeSes?.rune_code ?? "RPI-ABSEN-2026",
                expReward: l.status === "HADIR" ? 100 : 0,
              })),
            );
          }
        }
      } catch {
        // ignore
      }

      const params = new URLSearchParams(window.location.search);
      const qrParam = params.get("qr")?.trim().toUpperCase();
      if (qrParam) {
        const updated = await updateAttendanceStatus("HADIR", qrParam);
        setUser(updated);
        setFullNameInput(
          updated.name === "BELUM TERDAFTAR" ? "" : updated.name,
        );
        setDraftStatus("HADIR");
        setIsSubmitted(true);

        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");

        const newLog: AttendanceLogItem = {
          id: TODAY_SESSION_ID,
          meetingNumber: Math.max(1, updated.kehadiran.current),
          title: `Pertemuan Riset (${updated.divisiRiset})`,
          date: "Hari Ini",
          time: `${hh}:${mm} WIB`,
          status: "HADIR",
          qrCode: qrParam,
          expReward: 100,
        };

        setLogs((prev) => [
          newLog,
          ...prev.filter((item) => item.id !== TODAY_SESSION_ID),
        ]);

        setBannerMessage({
          text: `SCAN QR BERHASIL [${qrParam}]! Kehadiran ${updated.name} tercatat HADIR (+100 EXP)!`,
          isError: false,
        });
      }
    }

    void initSync();
  }, []);

  /**
   * Menyimpan data absensi satu kali (Anti-Spam) baik dari CTA "Kirim Absensi"
   * maupun dari CTA "Scan QR".
   */
  const commitAttendanceSubmission = async (
    finalStatus: AttendanceStatus,
    methodCode: string,
  ): Promise<void> => {
    const currentProfile = loadUserProfile();
    const cleanedName =
      fullNameInput.trim().toUpperCase() ||
      (currentProfile.name !== "BELUM TERDAFTAR" ? currentProfile.name : "");

    if (!cleanedName && methodCode === "FORM-KIRIM") {
      setBannerMessage({
        text: "PERINGATAN: Nama Lengkap tidak boleh kosong!",
        isError: true,
      });
      return;
    }

    if (cleanedName) {
      saveUserProfile({ ...currentProfile, name: cleanedName });
    }

    // Update status kehadiran & EXP serta sinkronkan ke database admin
    const updated = await updateAttendanceStatus(finalStatus, methodCode);
    setUser(updated);
    if (updated.name && updated.name !== "BELUM TERDAFTAR") {
      setFullNameInput(updated.name);
    }
    setDraftStatus(finalStatus);
    setIsSubmitted(true);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    const newLog: AttendanceLogItem = {
      id: TODAY_SESSION_ID,
      meetingNumber: Math.max(1, updated.kehadiran.current),
      title: `Pertemuan Riset (${updated.divisiRiset})`,
      date: "Hari Ini",
      time: `${hh}:${mm} WIB`,
      status: finalStatus,
      qrCode: methodCode,
      expReward: finalStatus === "HADIR" ? 100 : 0,
    };

    // Anti-spam: Ganti log sesi hari ini jika sudah ada, jangan duplikasi baris baru
    setLogs((prev) => [newLog, ...prev.filter((item) => item.id !== TODAY_SESSION_ID)]);

    setBannerMessage({
      text:
        methodCode === "FORM-KIRIM"
          ? `ABSENSI TERKIRIM! Status ${updated.name} tercatat: ${finalStatus} (Terkunci Anti-Spam).`
          : `SCAN QR BERHASIL [${methodCode}]! Kehadiran ${updated.name} tercatat HADIR (+100 EXP)!`,
      isError: false,
    });
  };

  /** Handler untuk CTA 1: KIRIM ABSENSI */
  const handleKirimAbsensi = (): void => {
    if (isSubmitted) {
      setBannerMessage({
        text: "ANTI-SPAM AKTIF: Absensi kamu untuk sesi ini sudah terkirim!",
        isError: true,
      });
      return;
    }

    if (draftStatus === "BELUM_ABSEN") {
      setBannerMessage({
        text: "PERINGATAN: Pilih status HADIR, IZIN, atau SAKIT terlebih dahulu sebelum klik Kirim Absensi!",
        isError: true,
      });
      return;
    }

    void commitAttendanceSubmission(draftStatus, "FORM-KIRIM");
  };

  /** Handler untuk CTA 2: Selesai SCAN QR */
  const handleQrScanComplete = (qrCode: string): void => {
    setIsScannerOpen(false);
    void commitAttendanceSubmission("HADIR", qrCode);
  };

  const statusConfig: Record<
    AttendanceStatus,
    {
      readonly label: string;
      readonly badgeColor: string;
      readonly headerAsset: string;
      readonly desc: string;
    }
  > = {
    BELUM_ABSEN: {
      label: "BELUM ABSEN (PILIH STATUS / SCAN QR)",
      badgeColor: "text-amber-300",
      headerAsset: UI_HEADER_GOTHIC_CRIMSON,
      desc: "Pilih status di bawah lalu klik KIRIM ABSENSI, atau langsung gunakan tombol SCAN QR.",
    },
    HADIR: {
      label: isSubmitted
        ? "HADIR (TERKIRIM & TERKUNCI)"
        : "PILIHAN: HADIR (SIAP DIKIRIM)",
      badgeColor: "text-lime-300",
      headerAsset: UI_HEADER_GOTHIC_GOLD,
      desc: isSubmitted
        ? `Tercatat hadir pada ${user.lastAttendanceTime ?? "Hari ini"} • Kode: ${user.lastAttendanceCode ?? "FORM-KIRIM"}`
        : "Klik tombol CTA KIRIM ABSENSI di bawah untuk mengonfirmasi kehadiranmu.",
    },
    IZIN: {
      label: isSubmitted
        ? "IZIN (TERKIRIM & TERKUNCI)"
        : "PILIHAN: IZIN (SIAP DIKIRIM)",
      badgeColor: "text-cyan-300",
      headerAsset: UI_HEADER_PURPLE,
      desc: isSubmitted
        ? "Status Izin telah dikirim dan dikunci untuk pertemuan kali ini."
        : "Klik tombol CTA KIRIM ABSENSI di bawah untuk mengirim keterangan Izin.",
    },
    SAKIT: {
      label: isSubmitted
        ? "SAKIT (TERKIRIM & TERKUNCI)"
        : "PILIHAN: SAKIT (SIAP DIKIRIM)",
      badgeColor: "text-pink-300",
      headerAsset: UI_HEADER_GOTHIC_SLATE,
      desc: isSubmitted
        ? "Status Sakit telah dikirim dan dikunci. Semoga lekas pulih, Ksatria!"
        : "Klik tombol CTA KIRIM ABSENSI di bawah untuk mengirim keterangan Sakit.",
    },
  };

  const activeStatus = statusConfig[draftStatus];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1a0e2e] font-pixel text-white">
      {/* Castle RPG Background */}
      <img
        src={resolveAssetSrc(LOBBY_BG_SRC)}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
      />

      {/* Atmospheric Dungeon Tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#2e1065]/45 via-[#4c1d95]/25 to-[#1e1b4b]/70"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
        {/* Top HUD: Tombol Keluar ke Home & Info Sesi Absensi */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div
              aria-hidden
              className="h-7 w-11 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] sm:h-8 sm:w-13"
            >
              <img
                src={resolveAssetSrc(UI_CURSOR_HORIZ_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
              />
            </div>

            <Link
              href="/home"
              className="relative flex h-12 w-48 items-center justify-center px-6 drop-shadow-[4px_4px_0_#000] transition-transform hover:scale-105 active:translate-y-0.5 sm:h-13 sm:w-56"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <img
                  src={resolveAssetSrc(UI_BUTTON_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 hue-rotate-[-18deg] saturate-150 select-none"
                />
              </div>
              <span className="relative z-10 text-[9px] text-white text-stroke-pixel sm:text-xs">
                Keluar ke Home
              </span>
            </Link>
          </div>

          {/* Top-Right Session Info Banner */}
          <div className="flex w-full max-w-md flex-col items-center gap-1 drop-shadow-[5px_5px_0_#000] sm:w-auto">
            <div className="relative flex min-h-16 w-full items-center justify-center px-10 py-2.5 sm:px-12">
              <img
                src={resolveAssetSrc(UI_HEADER_PURPLE)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-center text-[10px] text-[#ffe4b5] text-stroke-pixel sm:text-xs">
                Misi: Presensi & Scan QR Kehadiran
              </span>
            </div>
          </div>
        </header>

        {/* Feedback Banner */}
        {bannerMessage && (
          <div
            role="status"
            className="relative mx-auto flex min-h-12 w-full max-w-3xl items-center justify-center px-10 py-2 drop-shadow-[5px_5px_0_#000]"
          >
            <img
              src={resolveAssetSrc(
                bannerMessage.isError ? UI_HEADER_GOTHIC_CRIMSON : UI_HEADER_GOTHIC_GOLD,
              )}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span
              className={`relative z-10 text-center text-[8px] leading-relaxed text-stroke-pixel sm:text-[10px] ${
                bannerMessage.isError ? "text-rose-200" : "text-lime-300"
              }`}
            >
              {bannerMessage.text}
            </span>
          </div>
        )}

        {/* Main Content: Panel Absensi (Nama Lengkap, Status Kehadiran, 2 CTA: Kirim Absensi & Scan QR) */}
        <div className="my-auto grid grid-cols-1 items-center gap-6 py-2 lg:grid-cols-12">
          {/* Left Column (7 cols): Panel Utama Absensi 2D RPG */}
          <section
            aria-label="Panel Absensi Ksatria"
            className="relative w-full p-7 drop-shadow-[8px_8px_0_#000] sm:p-9 lg:col-span-7"
          >
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />

            <div className="relative z-10 flex flex-col gap-4">
              {/* Judul Panel */}
              <div className="flex flex-col items-center drop-shadow-[4px_4px_0_#000]">
                <div className="relative flex h-13 w-full max-w-md items-center justify-center px-10 sm:h-14">
                  <img
                    src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                  />
                  <h1 className="relative z-10 text-center text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
                    QUEST ABSENSI KEHADIRAN
                  </h1>
                </div>

                <div className="relative -mt-1 flex h-8 w-11/12 max-w-sm items-center justify-center px-8">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                  >
                    <img
                      src={resolveAssetSrc(UI_SCROLL_BANNER_SHEET)}
                      alt=""
                      draggable={false}
                      className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
                    />
                  </div>
                  <span className="relative z-10 text-[8px] text-cyan-200 text-stroke-pixel sm:text-[9px]">
                    {user.prodi.toUpperCase()} • {user.divisiRiset.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 1. NAMA LENGKAP */}
              <div className="flex flex-col gap-2 rounded border-3 border-[#4c2f7a] bg-[#140b24]/95 p-3.5 shadow-[inset_0_0_14px_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                    1. NAMA LENGKAP
                  </span>
                  <span className="text-[8px] text-cyan-300 text-stroke-pixel">
                    NIM: {user.nim}
                  </span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <RpgPortraitArch
                    spriteSrc={user.character.spriteSrc}
                    alt={user.name}
                    level={user.level}
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <input
                      type="text"
                      disabled={isSubmitted}
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="Masukkan Nama Lengkap..."
                      aria-label="Nama Lengkap"
                      className="w-full border-4 border-black bg-[#1e1136] px-3.5 py-2.5 text-xs text-lime-300 uppercase focus:border-amber-400 focus:outline-none disabled:opacity-70 sm:text-sm"
                    />
                    <span className="text-[8px] text-amber-200 text-shadow-pixel sm:text-[9px]">
                      Divisi: {user.divisiRiset}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. STATUS KEHADIRAN */}
              <div className="flex flex-col gap-2.5 rounded border-3 border-[#4c2f7a] bg-[#140b24]/95 p-3.5 shadow-[inset_0_0_14px_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                    2. STATUS KEHADIRAN
                  </span>
                  <div className="flex items-center gap-2">
                    {isSubmitted && (
                      <span className="border border-lime-400 bg-lime-950/80 px-2 py-0.5 text-[7px] text-lime-300 text-stroke-pixel">
                        TERKUNCI (ANTI-SPAM)
                      </span>
                    )}
                    <img
                      src={resolveAssetSrc(
                        isSubmitted ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED,
                      )}
                      alt={draftStatus}
                      className="pixelated size-6"
                    />
                  </div>
                </div>

                {/* Banner Status Kehadiran */}
                <div className="relative flex min-h-13 w-full items-center justify-center px-8 py-2.5 drop-shadow-[4px_4px_0_#000]">
                  <img
                    src={resolveAssetSrc(activeStatus.headerAsset)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                  />
                  <span
                    className={`relative z-10 text-center text-[9px] text-stroke-pixel sm:text-xs ${activeStatus.badgeColor}`}
                  >
                    ● {activeStatus.label}
                  </span>
                </div>

                <p className="text-center text-[8px] leading-relaxed text-slate-300 text-shadow-pixel sm:text-[9px]">
                  {activeStatus.desc}
                </p>

                {/* Pilihan Draft Status Kehadiran (Tidak langsung kirim agar tidak spam) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      { id: "HADIR", label: "HADIR" },
                      { id: "IZIN", label: "IZIN" },
                      { id: "SAKIT", label: "SAKIT" },
                    ] as const
                  ).map((item) => {
                    const isSelected = draftStatus === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => {
                          setDraftStatus(item.id);
                          setBannerMessage(null);
                        }}
                        className={`cursor-pointer border-2 px-2 py-2 text-[8px] text-stroke-pixel transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 sm:text-[9px] ${
                          isSelected
                            ? "border-amber-300 bg-[#3b2069] text-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                            : "border-black bg-[#1f1235] text-slate-300 hover:border-purple-400"
                        }`}
                      >
                        {isSelected ? `★ ${item.label}` : item.label}
                      </button>
                    );
                  })}
                </div>

                {/* RPG HP Bar Kehadiran */}
                <div className="pt-1">
                  <RpgSkullBar
                    label="HP KEHADIRAN"
                    current={user.kehadiran.current}
                    max={user.kehadiran.max}
                    variant={user.attendanceStatus === "HADIR" ? "green" : "red"}
                    valueText={`${user.kehadiran.current}/${user.kehadiran.max} SESI`}
                  />
                </div>
              </div>

              {/* 3. DUA CTA UTAMA: (1) KIRIM ABSENSI & (2) SCAN QR */}
              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {/* CTA 1: KIRIM ABSENSI */}
                <div className="flex items-center">
                  <div
                    aria-hidden
                    className={`mr-1.5 h-7 w-10 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-8 sm:w-11 ${
                      hoveredCta === "kirim" ? "opacity-100" : "mr-0 w-0 opacity-0"
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
                    disabled={isSubmitted}
                    onMouseEnter={() => setHoveredCta("kirim")}
                    onFocus={() => setHoveredCta("kirim")}
                    onClick={handleKirimAbsensi}
                    className="relative flex h-14 flex-1 cursor-pointer items-center justify-center px-5 drop-shadow-[5px_5px_0_#000] transition-transform hover:scale-[1.02] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:h-15"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                      <img
                        src={resolveAssetSrc(UI_BUTTON_SHEET)}
                        alt=""
                        draggable={false}
                        className={`pixelated h-full w-[400%] max-w-none select-none ${
                          hoveredCta === "kirim" ? "-translate-x-1/4" : "translate-x-0"
                        }`}
                      />
                    </div>
                    <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[11px]">
                      {isSubmitted ? "✓ SUDAH TERKIRIM" : "✔ KIRIM ABSENSI"}
                    </span>
                  </button>
                </div>

                {/* CTA 2: SCAN QR */}
                <div className="flex items-center">
                  <div
                    aria-hidden
                    className={`mr-1.5 h-7 w-10 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-8 sm:w-11 ${
                      hoveredCta === "scan" ? "opacity-100" : "mr-0 w-0 opacity-0"
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
                    onMouseEnter={() => setHoveredCta("scan")}
                    onFocus={() => setHoveredCta("scan")}
                    onClick={() => setIsScannerOpen(true)}
                    className="relative flex h-14 flex-1 cursor-pointer items-center justify-center px-5 drop-shadow-[5px_5px_0_#000] transition-transform hover:scale-[1.02] active:translate-y-0.5 sm:h-15"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                      <img
                        src={resolveAssetSrc(UI_BUTTON_SHEET)}
                        alt=""
                        draggable={false}
                        className={`pixelated h-full w-[400%] max-w-none select-none ${
                          hoveredCta === "scan" ? "-translate-x-1/4" : "translate-x-0"
                        }`}
                      />
                    </div>
                    <span className="relative z-10 text-[9px] text-lime-300 text-stroke-pixel sm:text-[11px]">
                      📷 SCAN QR
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column (5 cols): Panggung Karakter 2D RPG & Riwayat Absensi */}
          <aside className="flex flex-col items-center gap-4 lg:col-span-5">
            {/* Karakter RPG Berdiri di Atas Karpet Kastil */}
            <div className="flex flex-col items-center">
              <div
                aria-hidden
                className="mb-1 h-11 w-6 animate-bob overflow-hidden drop-shadow-[3px_3px_0_#000]"
              >
                <img
                  src={resolveAssetSrc(UI_CURSOR_VERT_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                />
              </div>

              <div className="relative flex items-center justify-center p-5">
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-2 -bottom-2 h-12 rounded-full transition-colors ${
                    user.attendanceStatus === "HADIR"
                      ? "bg-lime-400/45 shadow-[0_0_24px_rgba(74,222,128,0.75)]"
                      : "bg-[#f472b6]/40 shadow-[0_0_24px_rgba(244,114,182,0.55)]"
                  }`}
                />

                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden drop-shadow-[4px_4px_0_#000]"
                >
                  <img
                    src={resolveAssetSrc(UI_TARGET_FRAME_SHEET)}
                    alt=""
                    draggable={false}
                    className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                  />
                </div>

                <div className="relative z-10">
                  <RpgSpriteAvatar
                    src={user.character.spriteSrc}
                    alt={user.name}
                    size="lg"
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-col items-center drop-shadow-[4px_4px_0_#000]">
                <div className="relative flex h-11 min-w-64 items-center justify-center px-10">
                  <img
                    src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                  />
                  <span className="relative z-10 text-[10px] text-yellow-300 text-stroke-pixel sm:text-xs">
                    {user.name} <span className="text-cyan-300">LV.{user.level}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Riwayat Log Absensi */}
            <div className="relative flex w-full flex-col p-6 drop-shadow-[8px_8px_0_#000]">
              <img
                src={resolveAssetSrc(UI_PANEL_9SLICE)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />

              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b-2 border-white/15 pb-1.5">
                  <span className="text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                    RIWAYAT KEHADIRAN
                  </span>
                  <span className="text-[8px] text-lime-300 text-stroke-pixel">
                    {logs.length} SESI
                  </span>
                </div>

                <div className="flex max-h-44 flex-col gap-2 overflow-y-auto pr-1">
                  {logs.length === 0 ? (
                    <div className="border-2 border-black bg-[#160d29]/95 px-3 py-4 text-center text-[8px] text-slate-400">
                      BELUM ADA RIWAYAT KEHADIRAN (0 SESI)
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-2 border-2 border-black bg-[#160d29]/95 px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-[8px] text-amber-200 text-stroke-pixel sm:text-[9px]">
                            SESI #{log.meetingNumber}: {log.title}
                          </span>
                          <span className="text-[7px] text-slate-300 sm:text-[8px]">
                            {log.date} • {log.time} • KODE: {log.qrCode}
                          </span>
                        </div>
                        <span className="shrink-0 text-[8px] text-lime-300 text-stroke-pixel">
                          {log.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal Scan QR Absensi */}
      {isScannerOpen && (
        <QrScannerModal
          studentName={fullNameInput.trim().toUpperCase() || user.name}
          defaultQrCode={activeRuneCode}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleQrScanComplete}
        />
      )}
    </main>
  );
}
