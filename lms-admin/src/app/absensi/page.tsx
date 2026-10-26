"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  Sparkles,
  CheckCircle2,
  Power,
  UserCheck,
  Clock,
  Copy,
  Check,
  QrCode,
  Smartphone,
} from "lucide-react";
import {
  createAbsensiSession,
  fetchAbsensiLogs,
  fetchAbsensiSessions,
  fetchUsers,
  recordAttendanceLog,
  toggleSessionStatus,
} from "@/lib/admin-store";
import { generateQrMatrix } from "@/lib/qr-generator";
import type {
  AbsensiLogRow,
  AbsensiSessionRow,
  AttendanceStatus,
  UserRow,
} from "@/types/database";

function generateRandomRune(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `RUNE-${suffix}`;
}

export default function AbsensiPage() {
  const [sessions, setSessions] = useState<AbsensiSessionRow[]>([]);
  const [logs, setLogs] = useState<AbsensiLogRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [runeInput, setRuneInput] = useState<string>("RPI-ABSEN-2026");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Manual check-in form state
  const [selectedMabaId, setSelectedMabaId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] =
    useState<AttendanceStatus>("HADIR");

  useEffect(() => {
    async function loadAbsensi(isInitial = false) {
      const [s, l, u] = await Promise.all([
        fetchAbsensiSessions(),
        fetchAbsensiLogs(),
        fetchUsers(),
      ]);
      setSessions(s);
      setLogs(l);
      setUsers(u);
      const active = s.find((item) => item.is_active) ?? s[0];
      if (active) {
        setSelectedSessionId((prev) =>
          isInitial || !prev || !s.some((item) => item.id === prev)
            ? active.id
            : prev,
        );
      }
      const firstMaba = u.find((usr) => usr.role === "maba");
      if (firstMaba) {
        setSelectedMabaId((prev) =>
          !prev || !u.some((usr) => usr.id === prev) ? firstMaba.id : prev,
        );
      }
    }
    void loadAbsensi(true);
    const timer = window.setInterval(() => {
      void loadAbsensi(false);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const mabaList = users.filter((u) => u.role === "maba");
  const activeSession = sessions.find((s) => s.is_active) ?? sessions[0];
  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) ?? activeSession;

  const sessionLogs = currentSession
    ? logs.filter((l) => l.session_id === currentSession.id)
    : logs;

  const activeQrMatrix = useMemo(
    () => generateQrMatrix(activeSession?.rune_code ?? "RPI-ABSEN-2026"),
    [activeSession?.rune_code],
  );

  async function handleGenerateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!runeInput.trim()) return;
    const updated = await createAbsensiSession(runeInput);
    setSessions(updated);
    if (updated[0]) {
      setSelectedSessionId(updated[0].id);
    }
    setRuneInput(generateRandomRune());
  }

  async function handleToggleActive(session: AbsensiSessionRow) {
    const updated = await toggleSessionStatus(session.id, !session.is_active);
    setSessions(updated);
  }

  async function handleManualCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSession || !selectedMabaId) return;
    const updatedLogs = await recordAttendanceLog({
      session_id: currentSession.id,
      maba_id: selectedMabaId,
      status: selectedStatus,
    });
    setLogs(updatedLogs);
  }

  function handleCopyCode(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  }

  return (
    <div className="space-y-6">
      {/* CTA Banner: Buat QR Absensi untuk Scan HP Maba */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Ingin Maba Scan QR Lewat HP (`lms-maba`)?
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Buka halaman khusus <strong>Generator QR Code Absensi</strong>{" "}
              dengan layar proyektor penuh dan simulator tampilan kamera HP Maba.
            </p>
          </div>
        </div>

        <Link
          href="/absensi/qr"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-indigo-700"
        >
          <Smartphone className="h-4 w-4" />
          <span>Buat &amp; Tampilkan QR Absensi</span>
        </Link>
      </div>

      {/* Top Grid: PIN Generator + Active Rune & QR Display */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form Generate PIN */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Generator PIN &amp; Token QR Absensi (&quot;Rune Rahasia&quot;)
              </h2>
              <p className="text-xs text-slate-500">
                Buat kode PIN/Token baru pada tabel `absensi_sessions` untuk
                halaman absensi di aplikasi Maba
              </p>
            </div>
          </div>

          <form
            onSubmit={handleGenerateSession}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={runeInput}
                onChange={(e) => setRuneInput(e.target.value.toUpperCase())}
                placeholder="Masukkan kode PIN (misal: RUNE-7X9K)"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm font-semibold tracking-wider text-slate-900 uppercase focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setRuneInput(generateRandomRune())}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Acak PIN</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-2xs transition hover:bg-indigo-700"
            >
              <span>Buat &amp; Aktifkan PIN</span>
            </button>
          </form>

          {/* Session Selector Pills */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-xs font-semibold text-slate-500 uppercase">
              Riwayat Sesi Absensi (`absensi_sessions`)
            </p>
            <div className="flex flex-wrap gap-2">
              {sessions.map((ses) => {
                const isSelected = ses.id === currentSession?.id;
                return (
                  <div
                    key={ses.id}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSessionId(ses.id)}
                      className="flex items-center gap-2 font-mono font-semibold"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          ses.is_active ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span>{ses.rune_code}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(ses)}
                      title={
                        ses.is_active
                          ? "Nonaktifkan Sesi Ini"
                          : "Aktifkan Sesi Ini"
                      }
                      className={`rounded p-1 transition ${
                        ses.is_active
                          ? "text-emerald-700 hover:bg-emerald-100"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active PIN + Mini QR Spotlight Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                PIN &amp; QR Sesi Aktif
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  activeSession
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {activeSession ? "AKTIF" : "TIDAK AKTIF"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
              {/* Mini Scannable QR Preview */}
              <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xs">
                <svg
                  width={68}
                  height={68}
                  viewBox={`0 0 ${activeQrMatrix.length + 4} ${activeQrMatrix.length + 4}`}
                  shapeRendering="crispEdges"
                >
                  <rect
                    x={0}
                    y={0}
                    width={activeQrMatrix.length + 4}
                    height={activeQrMatrix.length + 4}
                    fill="#ffffff"
                  />
                  {activeQrMatrix.map((row, rIdx) =>
                    row.map((isDark, cIdx) =>
                      isDark ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + 2}
                          y={rIdx + 2}
                          width={1}
                          height={1}
                          fill="#0f172a"
                        />
                      ) : null,
                    ),
                  )}
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xl font-bold tracking-widest text-indigo-950">
                  {activeSession ? activeSession.rune_code : "—"}
                </p>
                {activeSession && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(activeSession.rune_code)}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-2xs hover:bg-indigo-50"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin PIN</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <Link
              href="/absensi/qr"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <QrCode className="h-4 w-4" />
              <span>Buka Layar QR Ukuran Penuh →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Manual Check-In & Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Daftar Kehadiran Mahasiswa (`absensi_logs`) — Sesi:{" "}
              <span className="font-mono text-indigo-600">
                {currentSession?.rune_code ?? "-"}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {sessionLogs.length} peserta yang telah tercatat pada
              sesi ini
            </p>
          </div>

          {/* Quick Check-in / Update Form */}
          <form
            onSubmit={handleManualCheckIn}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              value={selectedMabaId}
              onChange={(e) => setSelectedMabaId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              {mabaList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama_ksatria} ({m.nim})
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as AttendanceStatus)
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="HADIR">HADIR</option>
              <option value="IZIN">IZIN</option>
              <option value="SAKIT">SAKIT</option>
              <option value="ALPHA">ALPHA</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Catat Kehadiran</span>
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <th className="px-6 py-3.5">Nama Ksatria (Maba)</th>
                <th className="px-6 py-3.5">NIM</th>
                <th className="px-6 py-3.5">Faksi</th>
                <th className="px-6 py-3.5">Kode Sesi (`rune_code`)</th>
                <th className="px-6 py-3.5">Status Kehadiran</th>
                <th className="px-6 py-3.5">Waktu Check-In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessionLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Belum ada mahasiswa yang melakukan check-in pada sesi ini.
                  </td>
                </tr>
              ) : (
                sessionLogs.map((log) => {
                  const maba = users.find((u) => u.id === log.maba_id);
                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {maba?.nama_ksatria ?? log.maba_id}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {maba?.nim ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {maba?.faksi ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                          {currentSession?.rune_code ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            log.status === "HADIR"
                              ? "bg-emerald-50 text-emerald-700"
                              : log.status === "IZIN"
                                ? "bg-amber-50 text-amber-700"
                                : log.status === "SAKIT"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
