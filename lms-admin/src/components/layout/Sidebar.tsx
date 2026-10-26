"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  QrCode,
  ScanLine,
  FileQuestion,
  GraduationCap,
  Cpu,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    description: "Ringkasan statistik & metrik",
    icon: LayoutDashboard,
  },
  {
    name: "Data Peserta (Maba)",
    href: "/peserta",
    description: "Manajemen ksatria terdaftar",
    icon: Users,
  },
  {
    name: "Sesi & Log Absensi",
    href: "/absensi",
    description: "Generator PIN Rune & kehadiran",
    icon: QrCode,
  },
  {
    name: "Buat QR Absensi",
    href: "/absensi/qr",
    description: "Layar QR untuk scan HP Maba",
    icon: ScanLine,
  },
  {
    name: "Bank Soal Kuis",
    href: "/kuis",
    description: "Manajemen soal pilihan ganda",
    icon: FileQuestion,
  },
  {
    name: "Rekap Nilai",
    href: "/rekap-nilai",
    description: "Buku nilai & ekspor CSV",
    icon: GraduationCap,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-68 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
            Ordo Robotika
          </p>
          <p className="truncate text-xs text-slate-500">
            Akademi Technomancer • Admin
          </p>
        </div>
      </div>

      {/* Quick CTA Button for QR Absensi */}
      <div className="px-4 pt-4">
        <Link
          href="/absensi/qr"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
        >
          <QrCode className="h-4 w-4" />
          <span>Buat QR Absensi (HP Maba)</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu Komite
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/absensi"
                  ? pathname === "/absensi"
                  : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.name}</div>
                  <div
                    className={`truncate text-xs font-normal ${
                      isActive ? "text-indigo-600/80" : "text-slate-400"
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Panel Komite Polindra</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Terhubung ke skema database bersama{" "}
            <code className="rounded bg-slate-200/70 px-1 py-0.5 text-[10px] text-slate-700">
              lms-maba
            </code>
          </p>
        </div>
      </div>
    </aside>
  );
}
