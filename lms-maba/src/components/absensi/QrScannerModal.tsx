"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import jsQR from "jsqr";
import {
  resolveAssetSrc,
  UI_BUTTON_SHEET,
  UI_CLOSE_BTN_SHEET,
  UI_HEADER_GOTHIC_GOLD,
  UI_HEADER_PURPLE,
  UI_PANEL_9SLICE,
  UI_TARGET_FRAME_SHEET,
} from "@/lib/assets";

interface QrScannerModalProps {
  readonly studentName: string;
  readonly defaultQrCode?: string;
  readonly onClose: () => void;
  readonly onScanSuccess: (qrCode: string) => void;
}

/**
 * Modal Scanner QR Absensi bergaya 2D RPG:
 * - Live Camera Scanner otomatis aktif saat modal dibuka (tanpa perlu jepret/foto manual).
 * - Real-time decoding menggunakan jsQR + native BarcodeDetector.
 * - Begitu QR code jelas terlihat di viewfinder kamera, sistem langsung otomatis scan & absen.
 * - Mendukung tombol ganti kamera (depan/belakang) serta fallback token manual jika kamera tidak tersedia.
 */
export default function QrScannerModal({
  studentName,
  defaultQrCode = "RPI-ABSEN-2026",
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const [manualCode, setManualCode] = useState<string>(defaultQrCode);
  const [serverRuneCode, setServerRuneCode] = useState<string>(defaultQrCode);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const extractQrToken = useCallback(
    (raw: string): string => {
      const trimmed = raw.trim();
      if (!trimmed) return serverRuneCode || defaultQrCode;
      try {
        const url = new URL(trimmed);
        const qrParam = url.searchParams.get("qr");
        if (qrParam) return qrParam.trim().toUpperCase();
      } catch {
        // Bukan URL penuh, gunakan teks langsung
      }
      return trimmed.toUpperCase();
    },
    [serverRuneCode, defaultQrCode],
  );

  const stopCamera = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  const handleDetectedQr = useCallback(
    (rawVal: string): void => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      setIsScanning(true);

      const finalToken = extractQrToken(rawVal);
      setScannedCode(finalToken);
      setManualCode(finalToken);

      // Feedback getaran di HP jika didukung
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(100);
        } catch {
          // ignore
        }
      }

      // Beri animasi feedback singkat 500ms agar user melihat QR berhasil terdeteksi
      window.setTimeout(() => {
        stopCamera();
        onScanSuccess(finalToken || serverRuneCode || defaultQrCode);
      }, 500);
    },
    [extractQrToken, onScanSuccess, serverRuneCode, defaultQrCode, stopCamera],
  );

  const startCamera = useCallback(
    async (mode: "environment" | "user"): Promise<void> => {
      setCameraLoading(true);
      setCameraError(null);

      // Hentikan kamera sebelumnya jika ada
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraLoading(false);
        setCameraActive(false);
        setCameraError(
          "Kamera live tidak didukung pada browser ini atau butuh akses HTTPS/localhost. Anda tetap bisa memasukkan kode token secara manual di bawah.",
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          // Coba dengan facingMode yang diminta (misal 'environment' untuk kamera belakang)
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback ke kamera default apa saja jika ideal facingMode gagal
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            // Autoplay mungkin perlu interaksi pada beberapa browser
          });
        }
        setCameraActive(true);
        setCameraLoading(false);
      } catch (err) {
        setCameraActive(false);
        setCameraLoading(false);
        const errName = err instanceof Error ? err.name : "";
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          setCameraError(
            "Izin kamera ditolak. Mohon izinkan akses kamera di browser Anda untuk melakukan scan QR langsung.",
          );
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          setCameraError("Kamera tidak ditemukan pada perangkat Anda.");
        } else {
          setCameraError(
            "Tidak dapat menyalakan kamera. Silakan gunakan tombol Simulasi atau input kode manual di bawah.",
          );
        }
      }
    },
    [],
  );

  // Ambil kode QR sesi aktif terbaru dari server saat modal dibuka
  useEffect(() => {
    void fetch("/api/db", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (db: {
          sessions?: Array<{ id: string; rune_code: string; is_active: boolean }>;
        }) => {
          const activeSes =
            db.sessions?.find((s) => s.is_active) ?? db.sessions?.[0];
          if (activeSes?.rune_code) {
            setServerRuneCode(activeSes.rune_code);
            setManualCode(activeSes.rune_code);
          }
        },
      )
      .catch(() => {
        // ignore
      });
  }, []);

  // Langsung buka kamera live begitu modal muncul
  useEffect(() => {
    void startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  // Real-time Frame Scanning Loop (jsQR + BarcodeDetector)
  useEffect(() => {
    if (!cameraActive || isScanning) return;

    let cancelled = false;

    // Cek ketersediaan BarcodeDetector bawaan browser (Chromium/Android native)
    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    const nativeDetector = BarcodeDetectorCtor
      ? new BarcodeDetectorCtor({ formats: ["qr_code"] })
      : null;

    let scanTimer: number | null = null;

    const scanFrame = async () => {
      if (cancelled || isScanningRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        // 1. Coba deteksi dengan native BarcodeDetector (lebih hemat CPU jika tersedia)
        if (nativeDetector) {
          try {
            const results = await nativeDetector.detect(video);
            const found = results[0]?.rawValue;
            if (found && !cancelled) {
              handleDetectedQr(found);
              return;
            }
          } catch {
            // fallback ke jsQR jika detector error pada frame tertentu
          }
        }

        // 2. Deteksi real-time menggunakan jsQR (kompatibel semua browser / mobile)
        try {
          if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
          }
          const canvas = canvasRef.current;
          // Optimasi: batasi resolusi analisa max 640px untuk kecepatan scan instan
          const maxDim = Math.max(video.videoWidth, video.videoHeight);
          const scale = maxDim > 640 ? 640 / maxDim : 1;
          const w = Math.floor(video.videoWidth * scale);
          const h = Math.floor(video.videoHeight * scale);

          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data && !cancelled) {
              handleDetectedQr(code.data);
              return;
            }
          }
        } catch {
          // Abaikan kesalahan frame sementara
        }
      }

      if (!cancelled && !isScanningRef.current) {
        scanTimer = window.setTimeout(scanFrame, 120);
      }
    };

    scanTimer = window.setTimeout(scanFrame, 150);

    return () => {
      cancelled = true;
      if (scanTimer !== null) {
        window.clearTimeout(scanTimer);
      }
    };
  }, [cameraActive, isScanning, handleDetectedQr]);

  const handleToggleCamera = (): void => {
    if (cameraActive) {
      stopCamera();
    } else {
      void startCamera(facingMode);
    }
  };

  const handleSwitchFacingMode = (): void => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  const handleSimulatedScan = (): void => {
    handleDetectedQr(serverRuneCode || manualCode);
  };

  const handleManualSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedQr(manualCode);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 font-pixel backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg p-6 drop-shadow-[8px_8px_0_#000] sm:p-8">
        {/* Ornate Cut-Corner Gothic Panel (`20251029darkDwellers9SlicesE.png`) */}
        <img
          src={resolveAssetSrc(UI_PANEL_9SLICE)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
        />

        <div className="relative z-10 flex flex-col gap-3">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b-2 border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2.5 animate-ping rounded-full bg-lime-400" />
              <h2
                id="qr-modal-title"
                className="text-xs text-yellow-300 text-stroke-pixel sm:text-sm"
              >
                LIVE CAMERA QR SCANNER
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              aria-label="Tutup"
              className="relative size-8 cursor-pointer overflow-hidden transition-transform hover:scale-110 active:translate-y-0.5"
            >
              <img
                src={resolveAssetSrc(UI_CLOSE_BTN_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none select-none"
              />
            </button>
          </div>

          {/* Student Info Banner */}
          <div className="relative flex min-h-10 items-center justify-between px-4 py-1.5 drop-shadow-[3px_3px_0_#000]">
            <img
              src={resolveAssetSrc(UI_HEADER_PURPLE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[8px] text-lime-300 text-stroke-pixel sm:text-[9px]">
              KSATRIA: {studentName}
            </span>
            <span className="relative z-10 text-[7px] text-amber-200 text-stroke-pixel sm:text-[8px]">
              MODE: SCAN OTOMATIS
            </span>
          </div>

          {/* 2D RPG Live Camera Viewfinder */}
          <div className="relative mx-auto flex h-64 w-full max-w-sm flex-col items-center justify-center overflow-hidden border-4 border-amber-400 bg-[#0d0718] p-2 shadow-[inset_0_0_24px_rgba(0,0,0,0.95)] sm:h-72">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                cameraActive ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Placeholder saat kamera sedang loading atau mati */}
            {!cameraActive && (
              <div className="relative z-10 flex flex-col items-center gap-2 p-4 text-center">
                {cameraLoading ? (
                  <>
                    <div className="size-6 animate-spin border-3 border-amber-400 border-t-transparent" />
                    <span className="text-[9px] text-yellow-300 text-stroke-pixel">
                      MEMULAI KAMERA LIVE...
                    </span>
                    <span className="text-[7px] text-slate-300">
                      Pastikan izin kamera diizinkan di browser
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📷</span>
                    <span className="text-[9px] text-amber-300 text-stroke-pixel">
                      KAMERA TIDAK AKTIF
                    </span>
                    <span className="max-w-xs text-[7px] text-slate-300">
                      Gunakan tombol Buka Kamera, Simulasi, atau Input Kode Manual di bawah
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Animated Golden Skull Target Frame Overlay */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-4 z-20 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-transform ${
                isScanning ? "scale-95 brightness-125" : ""
              }`}
            >
              <img
                src={resolveAssetSrc(UI_TARGET_FRAME_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
              />
            </div>

            {/* Scanning Laser Bar (hanya saat kamera aktif atau sedang scan) */}
            {(cameraActive || isScanning) && (
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-3 top-1/2 z-30 h-1 -translate-y-1/2 shadow-[0_0_14px_#4ade80] ${
                  isScanning
                    ? "bg-amber-300 shadow-[0_0_20px_#fde047]"
                    : "animate-pulse bg-lime-400"
                }`}
              />
            )}

            {/* Status Live Notification Pill */}
            <div className="relative z-30 mt-auto mb-1 max-w-[90%] truncate rounded border border-black/80 bg-black/85 px-3 py-1 text-center">
              <span
                className={`text-[8px] text-stroke-pixel sm:text-[9px] ${
                  isScanning
                    ? "text-lime-300"
                    : cameraActive
                      ? "text-yellow-300"
                      : "text-amber-200"
                }`}
              >
                {isScanning
                  ? `⚡ QR DITEMUKAN [${scannedCode ?? "OK"}]! MEMVERIFIKASI...`
                  : cameraActive
                    ? "🔍 ARAHKAN KE QR CODE (OTOMATIS SCAN)"
                    : cameraLoading
                      ? "MENYIAPKAN KAMERA..."
                      : "KAMERA NONAKTIF"}
              </span>
            </div>
          </div>

          {/* Camera Error / Guidance Alert */}
          {cameraError && (
            <div className="rounded border-2 border-red-900 bg-red-950/80 p-2 text-center text-[7px] leading-relaxed text-red-200 sm:text-[8px]">
              ⚠️ {cameraError}
            </div>
          )}

          {/* Action Controls: Ganti Kamera & Toggle On/Off */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="relative flex h-10 flex-1 cursor-pointer items-center justify-center px-4 drop-shadow-[3px_3px_0_#000] transition-transform hover:scale-[1.02] active:translate-y-0.5"
            >
              <img
                src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                {cameraActive ? "⏹️ MATIKAN KAMERA" : "📷 NYALAKAN KAMERA"}
              </span>
            </button>

            {cameraActive && (
              <button
                type="button"
                onClick={handleSwitchFacingMode}
                title="Ganti Kamera Belakang / Depan"
                className="relative flex h-10 cursor-pointer items-center justify-center px-4 drop-shadow-[3px_3px_0_#000] transition-transform hover:scale-[1.02] active:translate-y-0.5"
              >
                <img
                  src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                />
                <span className="relative z-10 text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                  🔄 {facingMode === "environment" ? "KAMERA BELAKANG" : "KAMERA DEPAN"}
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={isScanning}
              onClick={handleSimulatedScan}
              className="relative flex h-10 cursor-pointer items-center justify-center px-4 drop-shadow-[3px_3px_0_#000] transition-transform hover:scale-[1.02] active:translate-y-0.5 disabled:opacity-60"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <img
                  src={resolveAssetSrc(UI_BUTTON_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
                />
              </div>
              <span className="relative z-10 text-[8px] text-lime-300 text-stroke-pixel sm:text-[9px]">
                ⚡ SCAN CEPAT
              </span>
            </button>
          </div>

          {/* Manual Token Fallback */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Kode QR (mis. RPI-ABSEN-2026)"
              className="flex-1 border-3 border-black bg-[#140b24] px-3 py-2 text-[9px] text-amber-200 uppercase focus:border-amber-400 focus:outline-none sm:text-[10px]"
            />
            <button
              type="submit"
              disabled={isScanning || !manualCode.trim()}
              className="cursor-pointer border-3 border-black bg-amber-400 px-3 py-2 text-[8px] text-black hover:bg-amber-300 disabled:opacity-50 sm:text-[9px]"
            >
              KIRIM KODE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
