import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LMS RPI - 2D RPG Portal",
  description: "2D RPG Learning Management System: Login, Register, Home, Absensi & Quiz Arena",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={pressStart2P.variable}>
      <body className="bg-[#1a0b2e] font-pixel antialiased">{children}</body>
    </html>
  );
}
