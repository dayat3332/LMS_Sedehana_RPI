"use client";

import { useEffect, useState } from "react";
import {
  Download,
  GraduationCap,
  Pencil,
  Search,
  X,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  BookOpenCheck,
} from "lucide-react";
import { fetchGrades, fetchUsers, upsertGrade } from "@/lib/admin-store";
import {
  calculateKeaktifanFromPertemuan,
  calculateKehadiranFromPertemuan,
  calculateNilaiAkhir,
  calculateTugasFromDetail,
} from "@/lib/supabase";
import {
  TOTAL_PERTEMUAN_KEAKTIFAN,
  TOTAL_PERTEMUAN_KEHADIRAN,
  TOTAL_TUGAS,
  type GradeRow,
  type UserRow,
} from "@/types/database";

interface CombinedGradeEntry {
  maba: UserRow;
  grade: GradeRow;
  kehadiranList: boolean[];
  keaktifanList: number[];
  tugasList: number[];
}

function normalizeBooleanArray(
  arr: boolean[] | undefined,
  len: number,
  fallbackScore: number,
): boolean[] {
  if (Array.isArray(arr) && arr.length === len) {
    return [...arr];
  }
  const approxTrueCount = Math.round((fallbackScore / 100) * len);
  return Array.from({ length: len }, (_, idx) => idx < approxTrueCount);
}

function normalizeNumberArray(
  arr: number[] | undefined,
  len: number,
  fallbackScore: number,
): number[] {
  if (Array.isArray(arr) && arr.length === len) {
    return arr.map((v) => Number(v || 0));
  }
  return Array.from({ length: len }, () => Math.round(fallbackScore));
}

function getGradeLetter(score: number): {
  letter: string;
  badgeClass: string;
} {
  if (score >= 85) {
    return {
      letter: "A (Grand Technomancer)",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (score >= 75) {
    return {
      letter: "B (Vanguard)",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }
  if (score >= 65) {
    return {
      letter: "C (Acolyte)",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    letter: "D (Novice)",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  };
}

export default function RekapNilaiPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<CombinedGradeEntry | null>(
    null,
  );

  // Detailed Modal Form States:
  // 1. Kehadiran: 8 Pertemuan (boolean[8])
  const [kehadiranPertemuan, setKehadiranPertemuan] = useState<boolean[]>(
    Array(TOTAL_PERTEMUAN_KEHADIRAN).fill(true),
  );
  // 2. Keaktifan: 8 Pertemuan (number[8])
  const [keaktifanPertemuan, setKeaktifanPertemuan] = useState<number[]>(
    Array(TOTAL_PERTEMUAN_KEAKTIFAN).fill(80),
  );
  // 3. Tugas: 3 Tugas (number[3])
  const [tugasDetail, setTugasDetail] = useState<number[]>(
    Array(TOTAL_TUGAS).fill(80),
  );
  // 4. Ujian: 1 Nilai Ujian (0-100)
  const [ujian, setUjian] = useState<number>(80);

  useEffect(() => {
    async function load() {
      const [u, g] = await Promise.all([fetchUsers(), fetchGrades()]);
      setUsers(u);
      setGrades(g);
    }
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const mabaList = users.filter((u) => u.role === "maba");

  const combinedRows: CombinedGradeEntry[] = mabaList
    .map((maba) => {
      const existing = grades.find((g) => g.maba_id === maba.id);
      const grade: GradeRow = existing ?? {
        id: `temp-${maba.id}`,
        maba_id: maba.id,
        kehadiran_pertemuan: Array(TOTAL_PERTEMUAN_KEHADIRAN).fill(false),
        keaktifan_pertemuan: Array(TOTAL_PERTEMUAN_KEAKTIFAN).fill(0),
        tugas_detail: Array(TOTAL_TUGAS).fill(0),
        kehadiran: 0,
        keaktifan: 0,
        tugas: 0,
        ujian: 0,
        nilai_akhir: 0,
      };

      const kehadiranList = normalizeBooleanArray(
        grade.kehadiran_pertemuan,
        TOTAL_PERTEMUAN_KEHADIRAN,
        Number(grade.kehadiran),
      );
      const keaktifanList = normalizeNumberArray(
        grade.keaktifan_pertemuan,
        TOTAL_PERTEMUAN_KEAKTIFAN,
        Number(grade.keaktifan),
      );
      const tugasList = normalizeNumberArray(
        grade.tugas_detail,
        TOTAL_TUGAS,
        Number(grade.tugas),
      );

      return { maba, grade, kehadiranList, keaktifanList, tugasList };
    })
    .sort((a, b) => Number(b.grade.nilai_akhir) - Number(a.grade.nilai_akhir));

  const filteredRows = combinedRows.filter(({ maba }) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      maba.nama_ksatria.toLowerCase().includes(q) ||
      maba.nim.toLowerCase().includes(q) ||
      maba.faksi.toLowerCase().includes(q)
    );
  });

  function openEditModal(entry: CombinedGradeEntry) {
    setEditingEntry(entry);
    setKehadiranPertemuan([...entry.kehadiranList]);
    setKeaktifanPertemuan([...entry.keaktifanList]);
    setTugasDetail([...entry.tugasList]);
    setUjian(Number(entry.grade.ujian));
  }

  function toggleKehadiranMeeting(idx: number) {
    setKehadiranPertemuan((prev) =>
      prev.map((val, i) => (i === idx ? !val : val)),
    );
  }

  function updateKeaktifanMeeting(idx: number, val: number) {
    const clamped = Math.max(0, Math.min(100, Number(val || 0)));
    setKeaktifanPertemuan((prev) =>
      prev.map((item, i) => (i === idx ? clamped : item)),
    );
  }

  function updateTugasItem(idx: number, val: number) {
    const clamped = Math.max(0, Math.min(100, Number(val || 0)));
    setTugasDetail((prev) =>
      prev.map((item, i) => (i === idx ? clamped : item)),
    );
  }

  async function handleSaveGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;

    const updated = await upsertGrade({
      maba_id: editingEntry.maba.id,
      kehadiran_pertemuan: kehadiranPertemuan,
      keaktifan_pertemuan: keaktifanPertemuan,
      tugas_detail: tugasDetail,
      ujian: Math.max(0, Math.min(100, Number(ujian || 0))),
    });

    setGrades(updated);
    setEditingEntry(null);
  }

  function handleExportCsv() {
    const headers = [
      "Peringkat",
      "NIM",
      "Nama Ksatria",
      "Faksi",
      "Hadir_8_Pertemuan",
      "Rekap_Kehadiran_20%",
      "Keaktifan_P1_P8",
      "Rekap_Keaktifan_20%",
      "Tugas_1",
      "Tugas_2",
      "Tugas_3",
      "Rekap_Tugas_30%",
      "Nilai_Ujian_30%",
      "Nilai_Akhir_Total",
    ];

    const rows = filteredRows.map(
      ({ maba, grade, kehadiranList, keaktifanList, tugasList }, idx) => {
        const hadirCount = kehadiranList.filter(Boolean).length;
        return [
          String(idx + 1),
          `"${maba.nim}"`,
          `"${maba.nama_ksatria}"`,
          `"${maba.faksi}"`,
          `"${hadirCount}/${TOTAL_PERTEMUAN_KEHADIRAN}"`,
          String(grade.kehadiran),
          `"${keaktifanList.join(" | ")}"`,
          String(grade.keaktifan),
          String(tugasList[0] ?? 0),
          String(tugasList[1] ?? 0),
          String(tugasList[2] ?? 0),
          String(grade.tugas),
          String(grade.ujian),
          String(grade.nilai_akhir),
        ];
      },
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `rekap-nilai-ordo-robotika-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Live preview calculations inside modal
  const previewKehadiranScore =
    calculateKehadiranFromPertemuan(kehadiranPertemuan);
  const previewKeaktifanScore =
    calculateKeaktifanFromPertemuan(keaktifanPertemuan);
  const previewTugasScore = calculateTugasFromDetail(tugasDetail);
  const previewNilaiAkhir = calculateNilaiAkhir({
    kehadiran: previewKehadiranScore,
    keaktifan: previewKeaktifanScore,
    tugas: previewTugasScore,
    ujian,
  });

  return (
    <div className="space-y-6">
      {/* Summary Component Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              1. Kehadiran (20%)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-base font-bold text-slate-900">
            Total 8 Pertemuan
          </p>
          <p className="text-xs text-slate-500">
            P1 s/d P8 direkap otomatis ke skor 0–100
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              2. Keaktifan Maba (20%)
            </span>
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-1.5 text-base font-bold text-slate-900">
            Total 8 Pertemuan
          </p>
          <p className="text-xs text-slate-500">
            Rata-rata poin aktif P1 s/d P8
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              3. Penugasan (30%)
            </span>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-base font-bold text-slate-900">
            Total 3 Tugas
          </p>
          <p className="text-xs text-slate-500">
            Rata-rata nilai Tugas 1, Tugas 2, &amp; Tugas 3
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              4. Ujian &amp; Rekap (30%)
            </span>
            <BookOpenCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-base font-bold text-slate-900">
            Digabung Jadi Satu
          </p>
          <p className="text-xs text-slate-500">
            Rekapitulasi akhir bersama nilai Ujian
          </p>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama ksatria, NIM, atau faksi..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-slate-500 xl:flex">
            <Calculator className="h-4 w-4 text-slate-400" />
            <span>
              Rekap: Kehadiran (8x) 20% + Keaktifan (8x) 20% + Tugas (3x) 30% +
              Ujian 30%
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Tabel Rekapitulasi Nilai Akhir (8 Pertemuan Kehadiran, 8 Pertemuan
              Keaktifan, 3 Tugas, &amp; Ujian)
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {filteredRows.length} Mahasiswa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <th className="w-14 px-5 py-3.5">Rank</th>
                <th className="px-5 py-3.5">Nama Ksatria (`maba_id`)</th>
                <th className="px-4 py-3.5">Kehadiran (8 Pertemuan)</th>
                <th className="px-4 py-3.5">Keaktifan (8 Pertemuan)</th>
                <th className="px-4 py-3.5">Tugas (3 Tugas)</th>
                <th className="px-4 py-3.5 text-center">Ujian (30%)</th>
                <th className="px-5 py-3.5 text-center">Rekap Nilai Akhir</th>
                <th className="px-5 py-3.5">Predikat Ordo</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Data nilai tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRows.map((entry, idx) => {
                  const {
                    maba,
                    grade,
                    kehadiranList,
                    keaktifanList,
                    tugasList,
                  } = entry;
                  const hadirCount = kehadiranList.filter(Boolean).length;
                  const finalScore = Number(grade.nilai_akhir);
                  const predicate = getGradeLetter(finalScore);

                  return (
                    <tr
                      key={maba.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800"
                              : idx === 1
                                ? "bg-slate-200 text-slate-700"
                                : idx === 2
                                  ? "bg-orange-100 text-orange-800"
                                  : "text-slate-400"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {maba.nama_ksatria}
                        </div>
                        <div className="text-xs text-slate-500">
                          NIM: <span className="font-mono">{maba.nim}</span> •{" "}
                          {maba.faksi}
                        </div>
                      </td>

                      {/* Kehadiran (8 Pertemuan) */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {Number(grade.kehadiran).toFixed(1)}
                          </span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            {hadirCount}/{TOTAL_PERTEMUAN_KEHADIRAN} Hadir
                          </span>
                        </div>
                        <div className="mt-1.5 flex gap-1">
                          {kehadiranList.map((isHadir, pIdx) => (
                            <span
                              key={pIdx}
                              title={`Pertemuan ${pIdx + 1}: ${isHadir ? "Hadir" : "Tidak Hadir"}`}
                              className={`h-2 w-3.5 rounded-xs ${
                                isHadir ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Keaktifan (8 Pertemuan) */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {Number(grade.keaktifan).toFixed(1)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Rata-rata 8 Ptm
                          </span>
                        </div>
                        <div className="mt-1 truncate font-mono text-[10px] text-slate-400">
                          {keaktifanList.join(" · ")}
                        </div>
                      </td>

                      {/* Tugas (3 Tugas) */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {Number(grade.tugas).toFixed(1)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Rata-rata 3 Tgs
                          </span>
                        </div>
                        <div className="mt-1 flex gap-1">
                          {tugasList.map((tScore, tIdx) => (
                            <span
                              key={tIdx}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                            >
                              T{tIdx + 1}: {tScore}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Ujian */}
                      <td className="px-4 py-4 text-center font-mono text-sm font-semibold text-slate-800">
                        {grade.ujian}
                      </td>

                      {/* Nilai Akhir Gabungan */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex rounded-md bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-white">
                          {finalScore.toFixed(1)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${predicate.badgeClass}`}
                        >
                          {predicate.letter}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Input &amp; Rekap</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Input & Recap Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Input &amp; Rekapitulasi Nilai Maba
                </h3>
                <p className="text-xs text-slate-500">
                  {editingEntry.maba.nama_ksatria} • NIM:{" "}
                  {editingEntry.maba.nim} ({editingEntry.maba.faksi})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-5 p-6">
              {/* 1. KEHADIRAN (8 PERTEMUAN) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-800">
                      1. Kehadiran Mahasiswa (Total 8 Pertemuan • Bobot 20%)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Klik pertemuan untuk menandai Hadir / Tidak Hadir
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setKehadiranPertemuan(
                          Array(TOTAL_PERTEMUAN_KEHADIRAN).fill(true),
                        )
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Hadir Semua (8/8)
                    </button>
                    <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
                      {kehadiranPertemuan.filter(Boolean).length}/8 Hadir ={" "}
                      {previewKehadiranScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {kehadiranPertemuan.map((isHadir, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleKehadiranMeeting(idx)}
                      className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs font-semibold transition ${
                        isHadir
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-[10px] uppercase">P{idx + 1}</span>
                      <span className="mt-0.5 text-[11px]">
                        {isHadir ? "Hadir" : "Alpha"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. KEAKTIFAN MABA (8 PERTEMUAN) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-800">
                      2. Keaktifan Maba (Total 8 Pertemuan • Bobot 20%)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Masukkan nilai keaktifan (0–100) untuk masing-masing
                      pertemuan P1 s/d P8
                    </p>
                  </div>
                  <span className="rounded-md bg-indigo-100 px-2.5 py-1 font-mono text-xs font-bold text-indigo-800">
                    Rata-rata 8 Ptm = {previewKeaktifanScore.toFixed(1)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {keaktifanPertemuan.map((score, idx) => (
                    <div key={idx} className="flex flex-col">
                      <label className="mb-1 text-center text-[10px] font-semibold text-slate-500">
                        P{idx + 1}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={score}
                        onChange={(e) =>
                          updateKeaktifanMeeting(idx, Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-mono text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. TUGAS (3 TUGAS) & 4. UJIAN */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* 3 Tugas */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-800">
                        3. Nilai Tugas (Total 3 Tugas • Bobot 30%)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Input nilai Tugas 1, Tugas 2, dan Tugas 3
                      </p>
                    </div>
                    <span className="rounded-md bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold text-amber-800">
                      Rata-rata = {previewTugasScore.toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    {tugasDetail.map((tVal, idx) => (
                      <div key={idx}>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Tugas {idx + 1}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={tVal}
                          onChange={(e) =>
                            updateTugasItem(idx, Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ujian */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-800">
                      4. Nilai Ujian (30%)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Skor evaluasi akhir (0–100)
                    </p>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Skor Ujian
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ujian}
                      onChange={(e) => setUjian(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rekapitulasi Gabungan Jadi Satu */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold text-indigo-950 uppercase">
                      Hasil Rekapitulasi Akhir (`nilai_akhir`)
                    </p>
                    <p className="mt-0.5 text-xs text-indigo-700">
                      Kehadiran ({previewKehadiranScore.toFixed(1)} × 20%) +
                      Keaktifan ({previewKeaktifanScore.toFixed(1)} × 20%) +
                      Tugas ({previewTugasScore.toFixed(1)} × 30%) + Ujian (
                      {ujian} × 30%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-600 px-4 py-2 font-mono text-lg font-bold text-white shadow-2xs">
                      {previewNilaiAkhir.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-2xs hover:bg-indigo-700"
                >
                  Simpan &amp; Rekap Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
