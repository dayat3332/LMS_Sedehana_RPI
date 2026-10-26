"use client";

import { useMemo } from "react";
import { Download, Maximize2, Smartphone } from "lucide-react";
import { generateQrMatrix } from "@/lib/qr-generator";

interface QrCodeDisplayProps {
  readonly payload: string;
  readonly runeCode: string;
  readonly agendaTitle?: string;
  readonly faksiTarget?: string;
  readonly size?: number;
  readonly onOpenFullscreen?: () => void;
  readonly onSimulateMabaScan?: () => void;
}

export default function QrCodeDisplay({
  payload,
  runeCode,
  agendaTitle = "Pertemuan Riset Ordo Robotika",
  faksiTarget = "Semua Divisi (Hardware, Mekanik, Program)",
  size = 240,
  onOpenFullscreen,
  onSimulateMabaScan,
}: QrCodeDisplayProps) {
  const matrix = useMemo(
    () => generateQrMatrix(payload || runeCode || "RPI-ABSEN-2026"),
    [payload, runeCode],
  );

  const quietZone = 4;
  const totalModules = matrix.length + quietZone * 2;

  function handleDownloadPng() {
    const canvas = document.createElement("canvas");
    const scale = 16;
    const canvasSize = totalModules * scale;
    canvas.width = canvasSize;
    canvas.height = canvasSize + 96;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR modules
    ctx.fillStyle = "#0f172a";
    matrix.forEach((row, rIdx) => {
      row.forEach((isDark, cIdx) => {
        if (isDark) {
          ctx.fillRect(
            (cIdx + quietZone) * scale,
            (rIdx + quietZone) * scale,
            scale,
            scale,
          );
        }
      });
    });

    // Footer label on PNG
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `KODE QR: ${runeCode}`,
      canvas.width / 2,
      canvasSize + 36,
    );
    ctx.fillStyle = "#475569";
    ctx.font = "15px sans-serif";
    ctx.fillText(
      "Scan melalui Aplikasi LMS Maba (/absensi)",
      canvas.width / 2,
      canvasSize + 66,
    );

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-absensi-${runeCode.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      {/* QR Frame */}
      <div className="relative rounded-2xl border-2 border-indigo-100 bg-white p-3 shadow-xs">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${totalModules} ${totalModules}`}
          shapeRendering="crispEdges"
          aria-label={`QR Code Absensi ${runeCode}`}
          className="rounded-lg"
        >
          <rect
            x={0}
            y={0}
            width={totalModules}
            height={totalModules}
            fill="#ffffff"
          />
          {matrix.map((row, rIdx) =>
            row.map((isDark, cIdx) =>
              isDark ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx + quietZone}
                  y={rIdx + quietZone}
                  width={1}
                  height={1}
                  fill="#0f172a"
                />
              ) : null,
            ),
          )}
        </svg>
      </div>

      {/* Session Code Badge */}
      <div className="mt-4 text-center">
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1 font-mono text-sm font-bold tracking-widest text-indigo-700">
          {runeCode}
        </span>
        <p className="mt-1.5 text-xs font-semibold text-slate-800">
          {agendaTitle}
        </p>
        <p className="text-[11px] text-slate-500">{faksiTarget}</p>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex w-full flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Unduh QR (PNG)</span>
          </button>

          {onOpenFullscreen && (
            <button
              type="button"
              onClick={onOpenFullscreen}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Layar Proyektor</span>
            </button>
          )}
        </div>

        {onSimulateMabaScan && (
          <button
            type="button"
            onClick={onSimulateMabaScan}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Simulasi Scan dari HP Maba</span>
          </button>
        )}
      </div>
    </div>
  );
}
