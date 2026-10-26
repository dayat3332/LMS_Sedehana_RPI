"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Bell, UserCheck, QrCode } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard Komite",
    subtitle: "Ringkasan operasional Akademi Technomancer: Ordo Robotika Polindra",
  },
  "/peserta": {
    title: "Manajemen Peserta (Maba)",
    subtitle: "Kelola data ksatria mahasiswa baru, NIM, dan faksi program studi",
  },
  "/absensi": {
    title: "Sesi & Log Absensi",
    subtitle: "Generate kode PIN Rune Rahasia dan pantau kehadiran peserta secara langsung",
  },
  "/absensi/qr": {
    title: "Generator QR Absensi (Layar Scan Maba)",
    subtitle: "Tampilkan QR Code presensi untuk dipindai mahasiswa baru lewat HP di aplikasi lms-maba",
  },
  "/kuis": {
    title: "Manajemen Bank Soal Kuis",
    subtitle: "Kelola daftar pertanyaan pilihan ganda untuk Arena Technomancer",
  },
  "/rekap-nilai": {
    title: "Rekapitulasi Nilai Akhir",
    subtitle: "Evaluasi nilai kehadiran, keaktifan, tugas, ujian, dan unduh laporan CSV",
  },
};

export default function Header() {
  const pathname = usePathname();
  const meta = ROUTE_TITLES[pathname] ?? {
    title: "Panel Komite",
    subtitle: "Akademi Technomancer: Ordo Robotika Polindra",
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur-xs">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{meta.title}</h1>
        <p className="hidden text-xs text-slate-500 sm:block">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {pathname !== "/absensi/qr" && (
          <Link
            href="/absensi/qr"
            className="hidden items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 md:inline-flex"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Bikin QR Absensi</span>
          </Link>
        )}

        {/* Database Status Pill */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            isSupabaseConfigured
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
          title={
            isSupabaseConfigured
              ? "Terhubung ke instance Supabase Live"
              : "Mode Lokal Aktif — Isi NEXT_PUBLIC_SUPABASE_URL di .env.local untuk sinkronisasi cloud"
          }
        >
          <Database className="h-3.5 w-3.5" />
          <span>
            {isSupabaseConfigured ? "Supabase Connected" : "Local Sync Mode"}
          </span>
        </div>

        <button
          type="button"
          className="relative rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600" />
        </button>

        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-semibold text-slate-800">
              Komite Ordo Robotika
            </p>
            <p className="text-[11px] text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
