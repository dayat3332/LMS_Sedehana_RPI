"use client";

import {
  resolveAssetSrc,
  UI_HEADER_GOTHIC_GOLD,
  UI_SCROLL_BANNER_SHEET,
} from "@/lib/assets";

interface WonderTitleLogoProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly compact?: boolean;
}

/**
 * Logo judul 2D Pixel RPG di sisi kiri atas (mengikuti tata letak layar judul Wonder Boy
 * dengan bingkai & tipografi 2D RPG pixel-art seperti pada halaman Kuis).
 */
export default function WonderTitleLogo({
  title = "LMS RPI",
  subtitle = "THE RESEARCH QUEST",
  compact = false,
}: WonderTitleLogoProps) {
  return (
    <div className="flex flex-col items-start font-pixel select-none drop-shadow-[5px_5px_0_#000]">
      {/* Judul Utama 2D Pixel Art dengan Bingkai Gothic Emas */}
      <div
        className={`relative flex items-center justify-center px-10 ${
          compact ? "h-13 min-w-68 sm:h-15 sm:min-w-80" : "h-16 min-w-76 sm:h-20 sm:min-w-92"
        }`}
      >
        <img
          src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
        />
        <h1
          className={`relative z-10 text-center tracking-wider text-yellow-300 text-stroke-pixel ${
            compact ? "text-base sm:text-xl" : "text-xl sm:text-2xl md:text-3xl"
          }`}
        >
          ⚔ {title}
        </h1>
      </div>

      {/* Sub-judul Pita Scroll 2D RPG */}
      <div className="relative -mt-1.5 ml-3 flex h-9 min-w-60 items-center justify-center px-8 sm:h-10 sm:min-w-72">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={resolveAssetSrc(UI_SCROLL_BANNER_SHEET)}
            alt=""
            draggable={false}
            className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
          />
        </div>
        <p className="relative z-10 text-[8px] tracking-widest text-cyan-200 uppercase text-stroke-pixel sm:text-[10px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
