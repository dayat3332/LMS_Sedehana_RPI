"use client";

/**
 * Ikon tangan penunjuk bergaya pixel/retro (seperti pada layar judul Wonder Boy)
 * dengan manset cokelat, sarung tangan oranye-emas, dan outline hitam tegas.
 */
export default function PixelHandCursor({ className = "w-11 h-8" }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 44 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 select-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)] ${className}`}
    >
      {/* Black Outer Outline */}
      <path
        d="M4 6H12V8H22V6H30V8H40V10H42V14H40V16H32V18H34V22H32V24H30V26H26V28H14V24H12V26H4V24H2V8H4V6Z"
        fill="#141013"
      />
      {/* Brown Cuff (Left Wrist) */}
      <rect x="4" y="8" width="6" height="16" fill="#c86428" />
      <rect x="4" y="8" width="6" height="4" fill="#e68a45" />
      <rect x="4" y="20" width="6" height="4" fill="#8f3f14" />
      {/* Cuff Inner Border */}
      <rect x="10" y="8" width="2" height="16" fill="#141013" />
      {/* Main Hand / Palm Base */}
      <rect x="12" y="10" width="16" height="14" fill="#f59e3d" />
      {/* Top Thumb Highlight */}
      <rect x="18" y="8" width="10" height="4" fill="#fbbf67" />
      {/* Pointing Index Finger */}
      <rect x="28" y="10" width="12" height="4" fill="#fbbf67" />
      <rect x="28" y="12" width="11" height="2" fill="#f59e3d" />
      {/* Curled Middle / Ring / Pinky Fingers Shading */}
      <rect x="24" y="14" width="6" height="2" fill="#141013" />
      <rect x="24" y="16" width="8" height="4" fill="#e07a24" />
      <rect x="22" y="20" width="8" height="2" fill="#141013" />
      <rect x="14" y="22" width="14" height="4" fill="#c96016" />
    </svg>
  );
}
