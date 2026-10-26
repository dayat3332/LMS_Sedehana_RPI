"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import RpgPageBackground from "@/components/shared/RpgPageBackground";
import WonderTitleLogo from "@/components/shared/WonderTitleLogo";
import {
  resolveAssetSrc,
  UI_BUTTON_SHEET,
  UI_CURSOR_HORIZ_SHEET,
  UI_HEADER_GOTHIC_CRIMSON,
  UI_HEADER_GOTHIC_SLATE,
  UI_PANEL_9SLICE,
  UI_SKULL_BAR,
} from "@/lib/assets";
import { registerUserAccount } from "@/lib/user-storage";
import {
  DEFAULT_DIVISI_RISET_OPTIONS,
  type ContestDivision,
} from "@/types/auth";

/**
 * Mengevaluasi syarat kekuatan password:
 * 1. Huruf depan besar / kapital (`/^[A-Z]/`)
 * 2. Mengandung simbol (`/[^A-Za-z0-9]/`)
 * 3. Mengandung angka (`/[0-9]/`)
 */
function evaluatePasswordStrength(pwd: string) {
  const startsWithCapital = /^[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9\s]/.test(pwd);

  const passedCount =
    (startsWithCapital ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSymbol ? 1 : 0);

  const percentage = pwd.length === 0 ? 0 : Math.round((passedCount / 3) * 100);

  const levelLabel =
    pwd.length === 0
      ? "BELUM DIISI"
      : passedCount === 1
        ? "LEMAH (1/3)"
        : passedCount === 2
          ? "SEDANG (2/3)"
          : passedCount === 3
            ? "KUAT (3/3)"
            : "LEMAH (0/3)";

  const barColorClass =
    passedCount === 3
      ? "bg-linear-to-b from-[#86efac] via-[#22c55e] to-[#15803d]"
      : passedCount === 2
        ? "bg-linear-to-b from-[#fde047] via-[#eab308] to-[#a16207]"
        : "bg-linear-to-b from-[#ff3b6b] via-[#e01e50] to-[#9e1136]";

  const textColorClass =
    passedCount === 3
      ? "text-lime-300"
      : passedCount === 2
        ? "text-yellow-300"
        : "text-rose-300";

  return {
    startsWithCapital,
    hasNumber,
    hasSymbol,
    passedCount,
    isStrong: passedCount === 3,
    percentage,
    levelLabel,
    barColorClass,
    textColorClass,
  };
}

/**
 * Halaman Register (`RegisterView`):
 * - Menggunakan desain 2D Pixel RPG di sisi kiri layar.
 * - Pengisian data terdiri dari:
 *   1. NIM
 *   2. Nama
 *   3. Program Studi atau Kelas
 *   4. Divisi Kontes (Hardware, Mekanik, Program)
 *   5. Email
 *   6. Password + Bar Kekuatan Password (syarat: huruf depan kapital, simbol, dan angka)
 *   7. Masukan Ulang Password
 */
export default function RegisterView() {
  const router = useRouter();

  const [nim, setNim] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [prodiOrClass, setProdiOrClass] = useState<string>("");
  const [divisiKontes, setDivisiKontes] = useState<ContestDivision>("Hardware");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [activeAction, setActiveAction] = useState<"register" | "login">("register");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pwdStrength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const isConfirmMatched =
    confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!nim.trim()) {
      setErrorMsg("PERINGATAN: NIM wajib diisi!");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("PERINGATAN: Nama wajib diisi!");
      return;
    }
    if (!prodiOrClass.trim()) {
      setErrorMsg("PERINGATAN: Program Studi atau Kelas wajib diisi!");
      return;
    }
    if (!divisiKontes) {
      setErrorMsg("PERINGATAN: Pilih Divisi Kontes (Hardware, Mekanik, atau Program)!");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("PERINGATAN: Masukkan alamat Email yang valid!");
      return;
    }
    if (!pwdStrength.isStrong) {
      setErrorMsg(
        "PERINGATAN: Password belum kuat! Wajib diawali huruf Kapital, ada Simbol, dan Angka.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("PERINGATAN: Masukan ulang password tidak sama dengan password!");
      return;
    }

    await registerUserAccount({
      nim: nim.trim(),
      name: name.trim(),
      prodi: prodiOrClass.trim(),
      divisiRiset: divisiKontes,
      email: email.trim(),
      password,
    });

    router.push("/home");
  };

  return (
    <RpgPageBackground>
      <div className="flex min-h-screen w-full flex-col justify-between px-4 py-4 font-pixel sm:px-8 sm:py-5 md:w-[58%] lg:w-[50%] lg:pl-12">
        {/* 1. Kiri Atas: Logo Judul 2D RPG */}
        <header>
          <WonderTitleLogo
            title="LMS RPI"
            subtitle="DAFTAR KSATRIA KONTES"
            compact
          />
        </header>

        {/* 2. Kiri Tengah: Panel Form Register 2D RPG */}
        <form
          onSubmit={handleSubmit}
          className="my-auto flex w-full max-w-lg flex-col gap-2.5 py-2"
        >
          <div className="relative flex flex-col gap-2.5 p-5 drop-shadow-[6px_6px_0_#000] sm:p-6">
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />

            <div className="relative z-10 flex flex-col gap-2.5">
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
                  <span className="relative z-10 text-center text-[7px] leading-relaxed text-rose-200 text-stroke-pixel sm:text-[8px]">
                    {errorMsg}
                  </span>
                </div>
              )}

              {/* Baris 1: NIM & Nama */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* 1. NIM */}
                <label className="flex flex-col gap-1">
                  <span className="text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                    1. NIM
                  </span>
                  <input
                    type="text"
                    value={nim}
                    onChange={(e) => {
                      setNim(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Contoh: 240101088"
                    className="w-full border-3 border-black bg-[#140b24] px-2.5 py-2 text-[8px] text-lime-200 shadow-[inset_0_3px_0_rgba(0,0,0,0.7)] placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[9px]"
                  />
                </label>

                {/* 2. Nama */}
                <label className="flex flex-col gap-1">
                  <span className="text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                    2. NAMA LENGKAP
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Ketik Nama..."
                    className="w-full border-3 border-black bg-[#140b24] px-2.5 py-2 text-[8px] text-lime-200 shadow-[inset_0_3px_0_rgba(0,0,0,0.7)] placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[9px]"
                  />
                </label>
              </div>

              {/* Baris 2: Program Studi atau Kelas & Email */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* 3. Program Studi atau Kelas */}
                <label className="flex flex-col gap-1">
                  <span className="text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                    3. PRODI / KELAS
                  </span>
                  <input
                    type="text"
                    value={prodiOrClass}
                    onChange={(e) => {
                      setProdiOrClass(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Mis: Teknik Informatika / TI-2A"
                    className="w-full border-3 border-black bg-[#140b24] px-2.5 py-2 text-[8px] text-amber-200 shadow-[inset_0_3px_0_rgba(0,0,0,0.7)] placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[9px]"
                  />
                </label>

                {/* 5. Email */}
                <label className="flex flex-col gap-1">
                  <span className="text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                    5. EMAIL
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="nama@email.ac.id"
                    className="w-full border-3 border-black bg-[#140b24] px-2.5 py-2 text-[8px] text-lime-200 shadow-[inset_0_3px_0_rgba(0,0,0,0.7)] placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[9px]"
                  />
                </label>
              </div>

              {/* 4. Divisi Kontes (Hardware, Mekanik, Program) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                    4. DIVISI KONTES
                  </span>
                  <span className="text-[7px] text-cyan-300 text-stroke-pixel sm:text-[8px]">
                    TERPILIH: {divisiKontes.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {DEFAULT_DIVISI_RISET_OPTIONS.map((div) => {
                    const isSelected = divisiKontes === div.name;
                    return (
                      <button
                        key={div.id}
                        type="button"
                        onClick={() => {
                          setDivisiKontes(div.name);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className={`cursor-pointer border-3 px-2 py-2 text-center text-[8px] text-stroke-pixel transition-all active:translate-y-0.5 sm:text-[9px] ${
                          isSelected
                            ? "border-amber-300 bg-[#3a1f66] text-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                            : "border-black bg-[#140b24] text-slate-300 hover:border-purple-400"
                        }`}
                      >
                        {isSelected ? `★ ${div.name.toUpperCase()}` : div.name.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Password + Indikator Bar Kekuatan Password */}
              <div className="flex flex-col gap-1.5 rounded border-2 border-[#4c2f7a] bg-[#120920]/90 p-2.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {/* Input Password */}
                  <label className="flex flex-col gap-1">
                    <span className="text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                      6. PASSWORD
                    </span>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Contoh: Ksatria@1"
                        className="w-full border-3 border-black bg-[#140b24] py-2 pr-14 pl-2.5 text-[8px] text-lime-200 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[9px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-1.5 cursor-pointer border border-black bg-[#2e1a52] px-1.5 py-0.5 text-[6px] text-amber-300 text-stroke-pixel sm:text-[7px]"
                      >
                        {showPassword ? "TUTUP" : "LIHAT"}
                      </button>
                    </div>
                  </label>

                  {/* 7. Masukan Ulang Password */}
                  <label className="flex flex-col gap-1">
                    <span className="flex items-center justify-between text-[8px] text-yellow-300 text-stroke-pixel sm:text-[9px]">
                      <span>7. ULANGI PASSWORD</span>
                      {confirmPassword.length > 0 && (
                        <span
                          className={
                            isConfirmMatched ? "text-lime-300" : "text-rose-300"
                          }
                        >
                          {isConfirmMatched ? "✔ COCOK" : "✖ BEDA"}
                        </span>
                      )}
                    </span>
                    <div className="relative flex items-center">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Ketik ulang password..."
                        className="w-full border-3 border-black bg-[#140b24] py-2 pr-14 pl-2.5 text-[8px] text-lime-200 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-[9px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-1.5 cursor-pointer border border-black bg-[#2e1a52] px-1.5 py-0.5 text-[6px] text-amber-300 text-stroke-pixel sm:text-[7px]"
                      >
                        {showConfirmPassword ? "TUTUP" : "LIHAT"}
                      </button>
                    </div>
                  </label>
                </div>

                {/* Bar Kekuatan Password 2D RPG */}
                <div className="mt-0.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between px-1 text-[7px] text-stroke-pixel sm:text-[8px]">
                    <span className="text-[#ffe4b5]">BAR KEKUATAN PASSWORD:</span>
                    <span className={pwdStrength.textColorClass}>
                      {pwdStrength.levelLabel}
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-label="Kekuatan Password"
                    aria-valuenow={pwdStrength.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="relative h-8 w-full select-none drop-shadow-[3px_3px_0_#000] sm:h-9"
                  >
                    <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] bg-[#201733]" />
                    <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.barColorClass}`}
                        style={{ width: `${pwdStrength.percentage}%` }}
                      />
                    </div>
                    <img
                      src={resolveAssetSrc(UI_SKULL_BAR)}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="pixelated pointer-events-none absolute inset-0 h-full w-full"
                    />
                    <span className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-[9px] leading-none text-[#ffe4b5] text-stroke-pixel sm:text-[10px]">
                      {pwdStrength.percentage}%
                    </span>
                  </div>

                  {/* Indikator 3 Syarat Password */}
                  <div className="grid grid-cols-1 gap-1 pt-0.5 text-[7px] sm:grid-cols-3 sm:text-[8px]">
                    <span
                      className={`border border-black px-1.5 py-1 text-stroke-pixel ${
                        pwdStrength.startsWithCapital
                          ? "bg-emerald-950/90 text-lime-300"
                          : "bg-[#1a0f2e] text-slate-400"
                      }`}
                    >
                      {pwdStrength.startsWithCapital ? "✔" : "✖"} Huruf Depan Kapital
                    </span>
                    <span
                      className={`border border-black px-1.5 py-1 text-stroke-pixel ${
                        pwdStrength.hasSymbol
                          ? "bg-emerald-950/90 text-lime-300"
                          : "bg-[#1a0f2e] text-slate-400"
                      }`}
                    >
                      {pwdStrength.hasSymbol ? "✔" : "✖"} Ada Simbol (!@#$)
                    </span>
                    <span
                      className={`border border-black px-1.5 py-1 text-stroke-pixel ${
                        pwdStrength.hasNumber
                          ? "bg-emerald-950/90 text-lime-300"
                          : "bg-[#1a0f2e] text-slate-400"
                      }`}
                    >
                      {pwdStrength.hasNumber ? "✔" : "✖"} Ada Angka (0-9)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Menu 2D RPG: REGISTER & LOGIN */}
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {/* Opsi 1: REGISTER */}
            <div
              className={`flex items-center transition-transform duration-150 ${
                activeAction === "register" ? "translate-x-1" : "translate-x-0"
              }`}
            >
              <div
                aria-hidden
                className={`mr-1 h-7 w-10 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-8 sm:w-11 ${
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

              <button
                type="submit"
                onMouseEnter={() => setActiveAction("register")}
                onFocus={() => setActiveAction("register")}
                className="relative flex h-12 w-56 cursor-pointer items-center justify-center px-6 drop-shadow-[5px_5px_0_#000] transition-transform active:translate-x-1 active:translate-y-1 sm:w-60"
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
                <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[11px]">
                  ▶ REGISTER
                </span>
              </button>
            </div>

            {/* Opsi 2: LOGIN */}
            <div
              className={`flex items-center transition-transform duration-150 ${
                activeAction === "login" ? "translate-x-1" : "translate-x-0"
              }`}
            >
              <div
                aria-hidden
                className={`mr-1 h-7 w-10 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-8 sm:w-11 ${
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

              <Link
                href="/login"
                onMouseEnter={() => setActiveAction("login")}
                onFocus={() => setActiveAction("login")}
                className="relative flex h-12 w-48 items-center justify-center px-6 drop-shadow-[5px_5px_0_#000] transition-transform active:translate-x-1 active:translate-y-1 sm:w-52"
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
                <span className="relative z-10 text-[9px] text-white text-stroke-pixel sm:text-[11px]">
                  LOGIN
                </span>
              </Link>
            </div>
          </div>
        </form>

        {/* 3. Kiri Bawah: Banner Kredit 2D RPG */}
        <footer className="relative flex h-8 items-center justify-center self-start px-6 drop-shadow-[3px_3px_0_#000]">
          <img
            src={resolveAssetSrc(UI_HEADER_GOTHIC_SLATE)}
            alt=""
            aria-hidden
            draggable={false}
            className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <span className="relative z-10 text-[7px] text-[#ffe4b5] text-stroke-pixel sm:text-[8px]">
            © LMS RPI • HARDWARE • MEKANIK • PROGRAM
          </span>
        </footer>
      </div>
    </RpgPageBackground>
  );
}
