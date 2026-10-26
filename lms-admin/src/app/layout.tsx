import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LMS Admin — Akademi Technomancer: Ordo Robotika Polindra",
  description:
    "Committee Dashboard for Akademi Technomancer: Ordo Robotika Polindra (Peserta, Absensi, Kuis, Rekap Nilai)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-68">
            <Header />
            <main className="flex-1 p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
