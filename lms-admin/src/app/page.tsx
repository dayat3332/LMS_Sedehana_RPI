"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  KeyRound,
  FileQuestion,
  Award,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  fetchAbsensiLogs,
  fetchAbsensiSessions,
  fetchGrades,
  fetchQuizzes,
  fetchUsers,
  resetAllDatabase,
} from "@/lib/admin-store";
import type {
  AbsensiLogRow,
  AbsensiSessionRow,
  GradeRow,
  QuizRow,
  UserRow,
} from "@/types/database";

export default function DashboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<AbsensiSessionRow[]>([]);
  const [logs, setLogs] = useState<AbsensiLogRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard(showLoading = true) {
    if (showLoading) setLoading(true);
    const [u, s, l, q, g] = await Promise.all([
      fetchUsers(),
      fetchAbsensiSessions(),
      fetchAbsensiLogs(),
      fetchQuizzes(),
      fetchGrades(),
    ]);
    setUsers(u);
    setSessions(s);
    setLogs(l);
    setQuizzes(q);
    setGrades(g);
    if (showLoading) setLoading(false);
  }

  useEffect(() => {
    void loadDashboard(true);
    const timer = window.setInterval(() => {
      void loadDashboard(false);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleResetAll() {
    await resetAllDatabase();
    await loadDashboard(true);
  }

  const mabaList = users.filter((u) => u.role === "maba");
  const activeSession = sessions.find((s) => s.is_active) ?? sessions[0];
  const activeSessionLogs = activeSession
    ? logs.filter((l) => l.session_id === activeSession.id)
    : logs;
  const presentCount = activeSessionLogs.filter(
    (l) => l.status === "HADIR",
  ).length;

  const avgFinalScore =
    grades.length > 0
      ? (
          grades.reduce((acc, g) => acc + Number(g.nilai_akhir || 0), 0) /
          grades.length
        ).toFixed(1)
      : "0.0";

  // Top 3 Maba by nilai_akhir
  const topMaba = [...grades]
    .sort((a, b) => Number(b.nilai_akhir) - Number(a.nilai_akhir))
    .slice(0, 3)
    .map((g) => ({
      ...g,
      maba: mabaList.find((m) => m.id === g.maba_id),
    }));

  // Faksi distribution
  const faksiCounts = mabaList.reduce<Record<string, number>>((acc, m) => {
    acc[m.faksi] = (acc[m.faksi] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
            Akademi Technomancer • Ordo Robotika Polindra
          </span>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Selamat Datang di Pusat Komando Komite
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pantau aktivitas ksatria mahasiswa baru (Maba), sesi PIN Rune Rahasia,
            bank soal Arena, dan rekapitulasi nilai akhir dalam satu antarmuka.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
            <span>Sinkronkan</span>
          </button>
          <button
            type="button"
            onClick={() => void handleResetAll()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Nol-kan Semua Data</span>
          </button>
          <Link
            href="/absensi/qr"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition hover:bg-indigo-700"
          >
            <KeyRound className="h-4 w-4" />
            <span>Buat QR Absensi (Scan HP Maba)</span>
          </Link>
          <Link
            href="/absensi"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span>Log Absensi</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">
              Total Ksatria (Maba)
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : mabaList.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Terdaftar dalam {Object.keys(faksiCounts).length} faksi/divisi
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">
              Sesi Rune Aktif
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
            {loading
              ? "..."
              : activeSession
                ? activeSession.rune_code
                : "NONAKTIF"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {activeSession
              ? `${presentCount} dari ${mabaList.length} Maba telah hadir`
              : "Belum ada sesi PIN yang diaktifkan"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">
              Bank Soal Arena
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <FileQuestion className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : quizzes.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Soal pilihan ganda siap diujikan di /arena
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">
              Rata-Rata Nilai Akhir
            </span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : avgFinalScore}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Skala 0–100 dari seluruh komponen evaluasi
          </p>
        </div>
      </div>

      {/* Two-Column Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Check-ins */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Log Kehadiran Sesi Aktif ({activeSession?.rune_code ?? "-"})
              </h3>
              <p className="text-xs text-slate-500">
                Daftar Maba yang baru saja memasukkan Rune Rahasia di /gerbang
              </p>
            </div>
            <Link
              href="/absensi"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Lihat Semua →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activeSessionLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Belum ada peserta yang melakukan check-in pada sesi aktif.
              </div>
            ) : (
              activeSessionLogs.slice(0, 5).map((log) => {
                const student = users.find((u) => u.id === log.maba_id);
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-6 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {(student?.nama_ksatria ?? "M").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {student?.nama_ksatria ?? "Peserta Tidak Dikenal"}
                        </p>
                        <p className="text-xs text-slate-500">
                          NIM: {student?.nim ?? "-"} • {student?.faksi ?? "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          log.status === "HADIR"
                            ? "bg-emerald-50 text-emerald-700"
                            : log.status === "IZIN"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {log.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top 3 Podium Preview & Faksi Distribution */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Peringkat 3 Teratas (/podium)
              </h3>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Ksatria dengan akumulasi Nilai Akhir tertinggi saat ini
            </p>

            <div className="mt-4 space-y-3">
              {topMaba.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800"
                          : idx === 1
                            ? "bg-slate-200 text-slate-700"
                            : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {entry.maba?.nama_ksatria ?? "Ksatria"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {entry.maba?.nim ?? "-"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-indigo-600 shadow-2xs">
                    {Number(entry.nilai_akhir).toFixed(1)} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900">
              Distribusi Faksi & Divisi
            </h3>
            <div className="mt-4 space-y-2.5">
              {Object.entries(faksiCounts).map(([faksi, count]) => (
                <div key={faksi} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-slate-700">
                      {faksi}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {count} Maba
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((count / Math.max(1, mabaList.length)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
