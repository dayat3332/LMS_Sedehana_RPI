"use client";

import type { ReactNode } from "react";
import { HERO_BG_SRC, resolveAssetSrc } from "@/lib/assets";

interface RpgPageBackgroundProps {
  readonly children: ReactNode;
  readonly bgSrc?: string;
}

/**
 * Wrapper layout untuk halaman Login, Register, dan Home
 * menggunakan background `background_login dan register.jpeg` secara utuh dan bersih
 * (sisi kiri putih bersih untuk menu/form, sisi kanan ilustrasi karakter RPG).
 */
export default function RpgPageBackground({
  children,
  bgSrc = HERO_BG_SRC,
}: RpgPageBackgroundProps) {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-white text-[#1a1a1a]">
      {/* Background Ilustrasi RPG (Kiri Putih, Kanan Karakter Hero & Monster) */}
      <img
        src={resolveAssetSrc(bgSrc)}
        alt="LMS RPI Background"
        aria-hidden
        draggable={false}
        className="pointer-events-none fixed inset-0 h-full w-full object-cover object-right select-none md:object-center"
      />

      {/* Lapisan putih halus hanya pada layar HP kecil agar teks di sisi kiri tetap terbaca jelas */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-white/75 md:bg-transparent"
      />

      <div className="relative z-10 min-h-screen w-full">{children}</div>
    </main>
  );
}
