"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import RpgPageBackground from "@/components/shared/RpgPageBackground";
import WonderTitleLogo from "@/components/shared/WonderTitleLogo";
import {
  resolveAssetSrc,
  UI_BUTTON_SHEET,
  UI_CURSOR_HORIZ_SHEET,
  UI_HEADER_GOTHIC_CRIMSON,
  UI_HEADER_GOTHIC_SLATE,
  UI_PANEL_9SLICE,
} from "@/lib/assets";
import { loginWithIdentifier } from "@/lib/user-storage";

/**
 * Halaman Login (`LoginView`):
 * - Tata letak di sisi kiri layar (ilustrasi karakter di sisi kanan tetap terlihat utuh).
 * - Menggunakan desain 2D Pixel RPG (bingkai 9-slice Dark Dwellers, font pixel,
 *   kursor belati emas animasi, dan tombol berlian 2D RPG).
 * - Meliputi input Nama/NIM/Email dan Password. Setelah login langsung menuju `/home`.
 */
export default function LoginView() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<"login" | "register">("login");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("PERINGATAN: Masukkan Nama, NIM, atau Email!");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("PERINGATAN: Masukkan Password!");
      return;
    }

    const result = await loginWithIdentifier({
      identifier: identifier.trim(),
      password: password.trim(),
    });

    if (!result.ok) {
      setErrorMsg(
        result.error ??
          "PERINGATAN: Akun belum terdaftar! Silakan klik REGISTER terlebih dahulu.",
      );
      return;
    }

    router.push("/home");
  };

  return (
    <RpgPageBackground>
      <div className="flex min-h-screen w-full flex-col justify-between px-4 py-6 font-pixel sm:px-10 sm:py-8 md:w-[56%] lg:w-[48%] lg:pl-14">
        {/* 1. Kiri Atas: Logo Judul 2D RPG */}
        <header>
          <WonderTitleLogo
            title="LMS RPI"
            subtitle="GERBANG LOGIN KSATRIA"
            compact
          />
        </header>

        {/* 2. Kiri Tengah: Panel Form Login 2D RPG */}
        <form
          onSubmit={handleSubmit}
          className="my-auto flex w-full max-w-md flex-col gap-3.5 py-3"
        >
          {/* Kotak Input Berbingkai Gothic 2D RPG */}
          <div className="relative flex flex-col gap-3.5 p-6 drop-shadow-[6px_6px_0_#000] sm:p-7">
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />

            <div className="relative z-10 flex flex-col gap-3.5">
              {errorMsg && (
                <div
                  role="alert"
                  className="relative flex min-h-10 items-center justify-center px-5 py-2 drop-shadow-[3px_3px_0_#000]"
                >
                  <img
                    src={resolveAssetSrc(UI_HEADER_GOTHIC_CRIMSON)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                  />
                  <span className="relative z-10 text-center text-[8px] leading-relaxed text-rose-200 text-stroke-pixel sm:text-[9px]">
                    {errorMsg}
                  </span>
                </div>
              )}

              {/* Field 1: Nama / NIM / Email */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                  ⚔ NAMA / NIM / EMAIL
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Ketik Nama, NIM, atau Email..."
                  autoComplete="username"
                  className="w-full border-4 border-black bg-[#140b24] px-3 py-2.5 text-[9px] text-lime-200 shadow-[inset_0_3px_0_rgba(0,0,0,0.7)] placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[10px]"
                />
              </label>

              {/* Field 2: Password */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                  🗝 PASSWORD
                </span>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Ketik Password..."
                    autoComplete="current-password"
                    className="w-full border-4 border-black bg-[#140b24] py-2.5 pr-18 pl-3 text-[9px] text-lime-200 shadow-[inset_0_3px_0_rgba(0,0,0,0.7)] placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 cursor-pointer border-2 border-black bg-[#2e1a52] px-2 py-1 text-[7px] text-amber-300 text-stroke-pixel hover:bg-[#3f246e] sm:text-[8px]"
                  >
                    {showPassword ? "TUTUP" : "LIHAT"}
                  </button>
                </div>
              </label>
            </div>
          </div>

          {/* Tombol Aksi Menu 2D RPG: LOGIN & REGISTER */}
          <div className="flex flex-col items-start gap-2.5 pt-1">
            {/* Opsi 1: LOGIN */}
            <div
              className={`flex items-center transition-transform duration-150 ${
                activeAction === "login" ? "translate-x-2 sm:translate-x-3" : "translate-x-0"
              }`}
            >
              <div
                aria-hidden
                className={`mr-1.5 h-8 w-12 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-9 sm:w-14 ${
                  activeAction === "login" ? "opacity-100" : "mr-0 w-0 opacity-0"
                }`}
              >
                <img
                  src={resolveAssetSrc(UI_CURSOR_HORIZ_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                />
              </div>

              <button
                type="submit"
                onMouseEnter={() => setActiveAction("login")}
                onFocus={() => setActiveAction("login")}
                className="relative flex h-13 w-68 cursor-pointer items-center justify-center px-8 drop-shadow-[5px_5px_0_#000] transition-transform active:translate-x-1 active:translate-y-1 sm:h-14 sm:w-76"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  <img
                    src={resolveAssetSrc(UI_BUTTON_SHEET)}
                    alt=""
                    draggable={false}
                    className={`pixelated h-full w-[400%] max-w-none select-none ${
                      activeAction === "login" ? "-translate-x-1/4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="relative z-10 text-[10px] text-yellow-300 text-stroke-pixel sm:text-xs">
                  ▶ LOGIN
                </span>
              </button>
            </div>

            {/* Opsi 2: REGISTER */}
            <div
              className={`flex items-center transition-transform duration-150 ${
                activeAction === "register" ? "translate-x-2 sm:translate-x-3" : "translate-x-0"
              }`}
            >
              <div
                aria-hidden
                className={`mr-1.5 h-8 w-12 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-9 sm:w-14 ${
                  activeAction === "register" ? "opacity-100" : "mr-0 w-0 opacity-0"
                }`}
              >
                <img
                  src={resolveAssetSrc(UI_CURSOR_HORIZ_SHEET)}
                  alt=""
                  draggable={false}
                  className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                />
              </div>

              <Link
                href="/register"
                onMouseEnter={() => setActiveAction("register")}
                onFocus={() => setActiveAction("register")}
                className="relative flex h-12 w-68 items-center justify-center px-8 drop-shadow-[5px_5px_0_#000] transition-transform active:translate-x-1 active:translate-y-1 sm:h-13 sm:w-76"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  <img
                    src={resolveAssetSrc(UI_BUTTON_SHEET)}
                    alt=""
                    draggable={false}
                    className={`pixelated h-full w-[400%] max-w-none select-none ${
                      activeAction === "register" ? "-translate-x-1/4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="relative z-10 text-[10px] text-white text-stroke-pixel sm:text-xs">
                  REGISTER
                </span>
              </Link>
            </div>
          </div>
        </form>

        {/* 3. Kiri Bawah: Banner Kredit 2D RPG */}
        <footer className="relative flex h-9 items-center justify-center self-start px-6 drop-shadow-[3px_3px_0_#000]">
          <img
            src={resolveAssetSrc(UI_HEADER_GOTHIC_SLATE)}
            alt=""
            aria-hidden
            draggable={false}
            className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <span className="relative z-10 text-[7px] text-[#ffe4b5] text-stroke-pixel sm:text-[8px]">
            © LMS RPI • 2D RPG PORTAL
          </span>
        </footer>
      </div>
    </RpgPageBackground>
  );
}
