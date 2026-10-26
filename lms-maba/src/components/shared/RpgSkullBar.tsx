"use client";

import { resolveAssetSrc, UI_SKULL_BAR } from "@/lib/assets";

interface RpgSkullBarProps {
  readonly label: string;
  readonly current: number;
  readonly max: number;
  readonly variant?: "red" | "blue" | "gold" | "green";
  readonly valueText?: string;
  readonly showPercentageInside?: boolean;
}

/**
 * Bar HP/MP/Kehadiran bergaya RPG menggunakan frame `20251118darkDwellersBarE.png`.
 */
export default function RpgSkullBar({
  label,
  current,
  max,
  variant = "red",
  valueText,
  showPercentageInside = true,
}: RpgSkullBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((current / max) * 100))) : 0;

  const fillColor =
    variant === "red"
      ? "bg-linear-to-b from-[#ff3b6b] via-[#e01e50] to-[#9e1136]"
      : variant === "blue"
        ? "bg-linear-to-b from-[#38bdf8] via-[#2576e8] to-[#17469e]"
        : variant === "green"
          ? "bg-linear-to-b from-[#86efac] via-[#22c55e] to-[#15803d]"
          : "bg-linear-to-b from-[#fde047] via-[#eab308] to-[#a16207]";

  const labelColor =
    variant === "red"
      ? "text-rose-300"
      : variant === "blue"
        ? "text-sky-300"
        : variant === "green"
          ? "text-lime-300"
          : "text-yellow-300";

  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex items-center justify-between px-2 text-[8px] text-stroke-pixel sm:text-[10px]">
        <span className={`uppercase ${labelColor}`}>{label}</span>
        <span className="text-[#ffe4b5]">{valueText ?? `${current}/${max}`}</span>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        className="relative h-10 w-full select-none drop-shadow-[4px_4px_0_#000] sm:h-11"
      >
        <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] bg-[#201733]" />
        <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${fillColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <img
          src={resolveAssetSrc(UI_SKULL_BAR)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full"
        />
        {showPercentageInside && (
          <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-xs leading-none text-[#ffe4b5] text-stroke-pixel sm:left-5 sm:text-sm">
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}
