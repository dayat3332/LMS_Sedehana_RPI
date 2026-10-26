"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  X,
  FileQuestion,
} from "lucide-react";
import { deleteQuiz, fetchQuizzes, saveQuiz } from "@/lib/admin-store";
import type { AnswerOptionKey, QuizRow } from "@/types/database";

const OPTION_KEYS: readonly AnswerOptionKey[] = ["A", "B", "C", "D"];

export default function KuisPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizRow | null>(null);

  // Form states
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<AnswerOptionKey>("A");

  useEffect(() => {
    void fetchQuizzes().then(setQuizzes);
  }, []);

  const filteredQuizzes = quizzes.filter((q) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      q.question.toLowerCase().includes(query) ||
      Object.values(q.options).some((opt) =>
        opt.toLowerCase().includes(query),
      )
    );
  });

  function openCreateModal() {
    setEditingQuiz(null);
    setQuestion("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("A");
    setIsModalOpen(true);
  }

  function openEditModal(quiz: QuizRow) {
    setEditingQuiz(quiz);
    setQuestion(quiz.question);
    setOptionA(quiz.options.A);
    setOptionB(quiz.options.B);
    setOptionC(quiz.options.C);
    setOptionD(quiz.options.D);
    setCorrectAnswer(quiz.correct_answer);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const updated = await saveQuiz({
      id: editingQuiz?.id,
      question: question.trim(),
      options: {
        A: optionA.trim(),
        B: optionB.trim(),
        C: optionC.trim(),
        D: optionD.trim(),
      },
      correct_answer: correctAnswer,
    });

    setQuizzes(updated);
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    const updated = await deleteQuiz(id);
    setQuizzes(updated);
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan atau opsi jawaban..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Soal Kuis</span>
        </button>
      </div>

      {/* CRUD Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Bank Soal Pilihan Ganda (`quizzes`)
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {filteredQuizzes.length} Soal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <th className="w-14 px-6 py-3.5">No</th>
                <th className="px-6 py-3.5">Pertanyaan (`question`)</th>
                <th className="px-6 py-3.5">Opsi Jawaban (`options` JSON)</th>
                <th className="w-36 px-6 py-3.5">Kunci (`correct_answer`)</th>
                <th className="w-28 px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuizzes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Belum ada soal kuis yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz, index) => (
                  <tr
                    key={quiz.id}
                    className="align-top transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-400">
                      #{index + 1}
                    </td>
                    <td className="max-w-md px-6 py-4 font-medium text-slate-900">
                      {quiz.question}
                    </td>
                    <td className="px-6 py-4">
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {OPTION_KEYS.map((key) => {
                          const isCorrect = quiz.correct_answer === key;
                          return (
                            <div
                              key={key}
                              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                                isCorrect
                                  ? "border-emerald-200 bg-emerald-50/80 font-medium text-emerald-900"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {key}
                              </span>
                              <span className="truncate">
                                {quiz.options[key]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Opsi {quiz.correct_answer}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(quiz)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Soal"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(quiz.id)}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                          title="Hapus Soal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {editingQuiz ? "Edit Soal Kuis" : "Tambah Soal Kuis Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Pertanyaan (`question`)
                </label>
                <textarea
                  rows={3}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Tuliskan pertanyaan kuis untuk Arena Technomancer..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Opsi A
                  </label>
                  <input
                    type="text"
                    required
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Jawaban A"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Opsi B
                  </label>
                  <input
                    type="text"
                    required
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Jawaban B"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Opsi C
                  </label>
                  <input
                    type="text"
                    required
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="Jawaban C"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Opsi D
                  </label>
                  <input
                    type="text"
                    required
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="Jawaban D"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Jawaban Benar (`correct_answer`)
                </label>
                <div className="flex gap-3">
                  {OPTION_KEYS.map((key) => (
                    <label
                      key={key}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition ${
                        correctAnswer === key
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="correct_answer"
                        value={key}
                        checked={correctAnswer === key}
                        onChange={() => setCorrectAnswer(key)}
                        className="sr-only"
                      />
                      <span>Opsi {key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {editingQuiz ? "Simpan Perubahan" : "Tambahkan Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
