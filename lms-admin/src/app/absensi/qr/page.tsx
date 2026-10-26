"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  QrCode,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Maximize2,
  X,
  RefreshCw,
  Wifi,
  Clock,
  Users,
} from "lucide-react";
import QrCodeDisplay from "@/components/absensi/QrCodeDisplay";
import {
  createAbsensiSession,
  fetchAbsensiLogs,
  fetchAbsensiSessions,
  fetchUsers,
  recordAttendanceLog,
} from "@/lib/admin-store";
import { generateQrMatrix } from "@/lib/qr-generator";
import type {
  AbsensiLogRow,
  AbsensiSessionRow,
  UserRow,
} from "@/types/database";

function generateRandomQrToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `RPI-QR-${suffix}`;
}

export default function BuatQrAbsensiPage() {
  const [sessions, setSessions] = useState<AbsensiSessionRow[]>([]);
  const [logs, setLogs] = useState<AbsensiLogRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  // QR Configuration State
  const [runeCode, setRuneCode] = useState<string>("RPI-ABSEN-2026");
  const [agendaTitle, setAgendaTitle] = useState<string>(
    "Pertemuan 14: Riset Arsitektur Sistem & Integrasi Robotika",
  );
  const [faksiTarget, setFaksiTarget] = useState<string>(
    "Semua Divisi (Hardware, Mekanik, Program)",
  );
  const [scanMode, setScanMode] = useState<"in_app" | "direct_url">("direct_url");
  const [mabaBaseUrl, setMabaBaseUrl] = useState<string>(
    "http://192.168.0.150:3000",
  );

  // Fullscreen projector modal
  const [isProjectorOpen, setIsProjectorOpen] = useState<boolean>(false);

  // Mobile Phone (`lms-maba`) Interactive Simulator State
  const [simSelectedMabaId, setSimSelectedMabaId] = useState<string>("");
  const [simScanning, setSimScanning] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simSuccessMessage, setSimSuccessMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setMabaBaseUrl(`http://${window.location.hostname}:3000`);
    }
    async function loadData(isInitial = false) {
      let [s, l, u] = await Promise.all([
        fetchAbsensiSessions(),
        fetchAbsensiLogs(),
        fetchUsers(),
      ]);

      if (isInitial && s.length === 0) {
        s = await createAbsensiSession("RPI-ABSEN-2026");
      }

      setSessions(s);
      setLogs(l);
      setUsers(u);

      if (isInitial) {
        const active = s.find((item) => item.is_active) ?? s[0];
        if (active) {
          setRuneCode(active.rune_code);
        }
      }

      const firstMaba = u.find((usr) => usr.role === "maba");
      if (firstMaba) {
        setSimSelectedMabaId((prev) =>
          !prev || !u.some((usr) => usr.id === prev) ? firstMaba.id : prev,
        );
      } else {
        setSimSelectedMabaId("");
      }
    }
    void loadData(true);
    const timer = window.setInterval(() => {
      void loadData(false);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const mabaList = users.filter((u) => u.role === "maba");
  const activeSession =
    sessions.find((s) => s.is_active) ??
    sessions.find((s) => s.rune_code === runeCode) ??
    sessions[0];

  const activeSessionLogs = activeSession
    ? logs.filter(
        (l) =>
          l.session_id === activeSession.id ||
          l.qr_code?.toUpperCase() === runeCode.toUpperCase(),
      )
    : logs;

  // Compute actual string encoded inside the QR code
  const qrPayload = useMemo(() => {
    const cleanCode = runeCode.trim().toUpperCase() || "RPI-ABSEN-2026";
    if (scanMode === "direct_url") {
      const base = mabaBaseUrl.replace(/\/+$/, "");
      return `${base}/absensi?qr=${encodeURIComponent(cleanCode)}`;
    }
    return cleanCode;
  }, [runeCode, scanMode, mabaBaseUrl]);

  const projectorMatrix = useMemo(
    () => generateQrMatrix(qrPayload),
    [qrPayload],
  );

  async function handleSaveAndActivateQr(e: React.FormEvent) {
    e.preventDefault();
    if (!runeCode.trim()) return;
    const updated = await createAbsensiSession(runeCode.trim().toUpperCase());
    setSessions(updated);
    setSimSuccessMessage(null);
  }

  async function handleQuickRegenerate() {
    const nextCode = generateRandomQrToken();
    setRuneCode(nextCode);
    const updated = await createAbsensiSession(nextCode);
    setSessions(updated);
    setSimSuccessMessage(null);
  }

  function handleSimulatePhoneScan() {
    if (simScanning) return;
    const targetMabaId = simSelectedMabaId || mabaList[0]?.id || "";
    if (!targetMabaId) {
      setSimSuccessMessage(
        "Belum ada akun Maba terdaftar! Silakan buat akun di halaman Register lms-maba atau menu Peserta terlebih dahulu.",
      );
      return;
    }
    setSimScanning(true);
    setSimProgress(25);
    setSimSuccessMessage(null);

    setTimeout(() => setSimProgress(65), 250);
    setTimeout(() => setSimProgress(100), 550);
    setTimeout(async () => {
      let targetSession = activeSession;
      if (!targetSession || targetSession.rune_code !== runeCode) {
        const updatedSessions = await createAbsensiSession(runeCode);
        setSessions(updatedSessions);
        targetSession = updatedSessions[0];
      }

      if (targetSession) {
        const updatedLogs = await recordAttendanceLog({
          session_id: targetSession.id,
          maba_id: targetMabaId,
          status: "HADIR",
        });
        setLogs(updatedLogs);
      }

      const scannedStudent = mabaList.find((m) => m.id === targetMabaId);
      setSimScanning(false);
      setSimProgress(0);
      setSimSuccessMessage(
        `SCAN QR BERHASIL [${runeCode}]! Kehadiran ${scannedStudent?.nama_ksatria ?? "Maba"} tercatat HADIR (+100 EXP)!`,
      );
    }, 850);
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back Link */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href="/absensi"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Log Absensi</span>
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Generator QR Code Absensi &amp; Layar Scan HP Maba
            </h2>
            <p className="text-xs text-slate-500">
              Buat QR Code presensi untuk dipindai oleh mahasiswa baru melalui
              HP di aplikasi <code>lms-maba</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleQuickRegenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
            <span>Buat Kode QR Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setIsProjectorOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-2xs transition hover:bg-indigo-700"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Buka Layar Proyektor Kelas</span>
          </button>
        </div>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (5 Cols): Form Pengaturan QR & Live QR Card */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  1. Pengaturan Sesi QR Absensi
                </h3>
                <p className="text-xs text-slate-500">
                  Sesuaikan kode token dan mode pemindaian untuk aplikasi Maba
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAndActivateQr} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Kode Token QR / Rune (`rune_code`)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={runeCode}
                    onChange={(e) => setRuneCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: RPI-ABSEN-2026"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-sm font-bold text-slate-900 uppercase focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRuneCode(generateRandomQrToken())}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Acak</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Judul Pertemuan / Agenda Riset
                </label>
                <input
                  type="text"
                  value={agendaTitle}
                  onChange={(e) => setAgendaTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Target Faksi / Divisi
                </label>
                <select
                  value={faksiTarget}
                  onChange={(e) => setFaksiTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Semua Divisi (Hardware, Mekanik, Program)">
                    Semua Divisi (Hardware, Mekanik, Program)
                  </option>
                  <option value="Divisi Program">Divisi Program</option>
                  <option value="Divisi Hardware">Divisi Hardware</option>
                  <option value="Divisi Mekanik">Divisi Mekanik</option>
                </select>
              </div>

              {/* Scan Mode Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Mode Pemindaian HP Maba
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanMode("in_app")}
                    className={`rounded-lg border p-2.5 text-left text-xs transition ${
                      scanMode === "in_app"
                        ? "border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div>Scanner In-App Maba</div>
                    <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                      Token langsung ({runeCode})
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanMode("direct_url")}
                    className={`rounded-lg border p-2.5 text-left text-xs transition ${
                      scanMode === "direct_url"
                        ? "border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div>Kamera Bawaan HP</div>
                    <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                      Buka URL /absensi otomatis
                    </div>
                  </button>
                </div>
              </div>

              {scanMode === "direct_url" && (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Wifi className="h-3.5 w-3.5 text-indigo-600" />
                    <span>URL Aplikasi `lms-maba` (IP Wi-Fi / Domain)</span>
                  </label>
                  <input
                    type="url"
                    value={mabaBaseUrl}
                    onChange={(e) => setMabaBaseUrl(e.target.value)}
                    placeholder="http://192.168.1.10:3000"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Payload QR:{" "}
                    <code className="text-indigo-600">{qrPayload}</code>
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition hover:bg-indigo-700"
              >
                Simpan &amp; Aktifkan QR Sesi Ini
              </button>
            </form>
          </div>

          {/* Generated Scannable QR Card */}
          <QrCodeDisplay
            payload={qrPayload}
            runeCode={runeCode}
            agendaTitle={agendaTitle}
            faksiTarget={faksiTarget}
            size={230}
            onOpenFullscreen={() => setIsProjectorOpen(true)}
            onSimulateMabaScan={handleSimulatePhoneScan}
          />
        </div>

        {/* Right Column (7 Cols): Simulasi Tampilan HP Maba (`lms-maba`) & Live Check-in Feed */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    2. Pratinjau &amp; Simulasi Layar HP Maba (`lms-maba/absensi`)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tampilan saat Maba membuka menu <strong>SCAN QR</strong> di
                    HP mereka untuk memindai QR di samping
                  </p>
                </div>
              </div>

              {/* Select Maba to simulate scan */}
              <div className="flex items-center gap-2">
                <select
                  value={simSelectedMabaId}
                  onChange={(e) => setSimSelectedMabaId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  {mabaList.map((m) => (
                    <option key={m.id} value={m.id}>
                      HP: {m.nama_ksatria} ({m.nim})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Phone Frame Mockup representing `lms-maba` Scanner View */}
            <div className="mt-6 flex flex-col items-center justify-center gap-6 md:flex-row">
              <div className="w-full max-w-[320px] rounded-[2rem] border-8 border-slate-900 bg-[#1a0e2e] p-4 text-white shadow-xl">
                {/* Phone Notch */}
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-700" />

                {/* Top Bar inside Phone */}
                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-yellow-300">
                    SCAN QR ABSENSI RPG
                  </span>
                  <span className="rounded bg-purple-900/80 px-2 py-0.5 font-mono text-[9px] text-lime-300">
                    LMS-MABA
                  </span>
                </div>

                {/* Active Ksatria Pill */}
                <div className="mt-2.5 rounded border border-purple-500/40 bg-[#140b24] px-3 py-1.5 text-center font-mono text-[10px] font-semibold text-lime-300">
                  KSATRIA:{" "}
                  {mabaList.find((m) => m.id === simSelectedMabaId)
                    ?.nama_ksatria ?? "BELUM ADA MABA"}
                </div>

                {/* Camera Viewfinder inside Phone */}
                <div className="relative mt-3 flex h-44 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-amber-400 bg-[#0d0718] p-3">
                  {/* Mini QR inside viewfinder being scanned */}
                  <div className="rounded bg-white p-2 shadow">
                    <svg
                      width={96}
                      height={96}
                      viewBox={`0 0 ${projectorMatrix.length + 4} ${projectorMatrix.length + 4}`}
                      shapeRendering="crispEdges"
                    >
                      <rect
                        x={0}
                        y={0}
                        width={projectorMatrix.length + 4}
                        height={projectorMatrix.length + 4}
                        fill="#ffffff"
                      />
                      {projectorMatrix.map((row, rIdx) =>
                        row.map((isDark, cIdx) =>
                          isDark ? (
                            <rect
                              key={`${rIdx}-${cIdx}`}
                              x={cIdx + 2}
                              y={rIdx + 2}
                              width={1}
                              height={1}
                              fill={simScanning ? "#16a34a" : "#0f172a"}
                            />
                          ) : null,
                        ),
                      )}
                    </svg>
                  </div>

                  {/* Laser Scan Line */}
                  <div className="pointer-events-none absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-lime-400 shadow-[0_0_10px_#4ade80]" />

                  <span className="mt-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold text-yellow-300">
                    {simScanning
                      ? `MEMINDAI QR... ${simProgress}%`
                      : "ARAHKAN KE QR CODE PRESENSI"}
                  </span>
                </div>

                {/* Detected Token Box */}
                <div className="mt-3 flex items-center justify-between rounded border border-amber-400/40 bg-[#140b24] px-2.5 py-1.5 font-mono text-[10px]">
                  <span className="text-slate-400">TOKEN:</span>
                  <span className="font-bold text-amber-300">{runeCode}</span>
                </div>

                {/* CTA Button inside Phone */}
                <button
                  type="button"
                  disabled={simScanning}
                  onClick={handleSimulatePhoneScan}
                  className="mt-3 w-full cursor-pointer rounded-lg border-2 border-lime-400 bg-emerald-700 py-2.5 text-center font-mono text-xs font-bold text-lime-200 shadow transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  {simScanning ? "MEMVERIFIKASI..." : "⚡ SCAN QR SEKARANG"}
                </button>
              </div>

              {/* Instructions & Live Feedback */}
              <div className="flex-1 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
                    Alur Penggunaan di Kelas
                  </h4>
                  <ol className="mt-2.5 space-y-2 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-600">1.</span>
                      <span>
                        Komite mengaktifkan kode QR di halaman ini lalu klik{" "}
                        <strong>Buka Layar Proyektor Kelas</strong>.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-600">2.</span>
                      <span>
                        Maba membuka aplikasi <code>lms-maba</code> di HP
                        masing-masing (menu <code>/absensi</code>) dan menekan
                        tombol <strong>📷 SCAN QR</strong>.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-indigo-600">3.</span>
                      <span>
                        Setelah QR dipindai, status kehadiran Maba otomatis
                        terkirim sebagai <strong>HADIR (+100 EXP)</strong> dan
                        muncul pada tabel di bawah.
                      </span>
                    </li>
                  </ol>
                </div>

                {simSuccessMessage && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{simSuccessMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Attendance Feed for Current QR Session */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Mahasiswa yang Sudah Scan QR Sesi Ini (
                  <span className="font-mono text-indigo-600">{runeCode}</span>)
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {activeSessionLogs.length} Hadir
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeSessionLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Belum ada Maba yang memindai QR pada sesi ini. Gunakan tombol{" "}
                  <strong>⚡ SCAN QR SEKARANG</strong> pada simulator HP di atas
                  untuk menguji.
                </div>
              ) : (
                activeSessionLogs.map((log) => {
                  const maba = users.find((u) => u.id === log.maba_id);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between px-6 py-3.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {maba?.nama_ksatria ?? log.maba_id}
                        </p>
                        <p className="text-xs text-slate-500">
                          NIM: {maba?.nim ?? "-"} • {maba?.faksi ?? "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {log.status}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(log.created_at).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Projector Modal for Classroom Scanning */}
      {isProjectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-xs">
          <div className="relative flex w-full max-w-2xl flex-col items-center rounded-3xl border border-slate-800 bg-white p-8 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setIsProjectorOpen(false)}
              className="absolute top-5 right-5 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Tutup Layar Proyektor"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700">
              LAYAR PRESENSI QR • ORDO ROBOTIKA POLINDRA
            </span>

            <h2 className="mt-3 text-xl font-bold text-slate-900">
              {agendaTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{faksiTarget}</p>

            {/* Giant Scannable QR Code */}
            <div className="my-6 rounded-3xl border-4 border-indigo-600 bg-white p-5 shadow-lg">
              <svg
                width={340}
                height={340}
                viewBox={`0 0 ${projectorMatrix.length + 8} ${projectorMatrix.length + 8}`}
                shapeRendering="crispEdges"
              >
                <rect
                  x={0}
                  y={0}
                  width={projectorMatrix.length + 8}
                  height={projectorMatrix.length + 8}
                  fill="#ffffff"
                />
                {projectorMatrix.map((row, rIdx) =>
                  row.map((isDark, cIdx) =>
                    isDark ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx + 4}
                        y={rIdx + 4}
                        width={1}
                        height={1}
                        fill="#0f172a"
                      />
                    ) : null,
                  ),
                )}
              </svg>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Kode Token Manual / Rune Rahasia
              </span>
              <span className="rounded-xl bg-slate-900 px-6 py-2 font-mono text-2xl font-bold tracking-widest text-white">
                {runeCode}
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Buka aplikasi <strong>LMS Maba</strong> di HP Anda → Pilih menu{" "}
              <strong>Absensi</strong> → Klik tombol <strong>📷 SCAN QR</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
