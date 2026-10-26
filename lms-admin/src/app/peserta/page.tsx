"use client";

import { useEffect, useState } from "react";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Users,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  createMaba,
  deleteMaba,
  fetchUsers,
  updateMaba,
} from "@/lib/admin-store";
import type { UserRow } from "@/types/database";

const DIVISI_OPTIONS = ["Hardware", "Mekanik", "Program"] as const;

export default function PesertaPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [divisiFilter, setDivisiFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Form states (Sama persis dengan form Register Maba)
  const [nim, setNim] = useState("");
  const [namaKsatria, setNamaKsatria] = useState("");
  const [prodi, setProdi] = useState("");
  const [divisi, setDivisi] = useState<string>("Hardware");
  const [email, setEmail] = useState("");

  async function refreshUsers() {
    const data = await fetchUsers();
    setUsers(data);
  }

  useEffect(() => {
    void refreshUsers();
    const timer = window.setInterval(() => {
      void refreshUsers();
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const mabaUsers = users.filter((u) => u.role === "maba");

  const filteredMaba = mabaUsers.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.nama_ksatria.toLowerCase().includes(q) ||
      u.nim.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.prodi ?? "").toLowerCase().includes(q) ||
      u.faksi.toLowerCase().includes(q);
    const matchesDivisi =
      divisiFilter === "ALL" ||
      (u.divisi ?? "").toLowerCase() === divisiFilter.toLowerCase() ||
      u.faksi.toLowerCase().includes(divisiFilter.toLowerCase());
    return matchesSearch && matchesDivisi;
  });

  function openCreateModal() {
    setEditingUser(null);
    setNim("");
    setNamaKsatria("");
    setProdi("");
    setDivisi("Hardware");
    setEmail("");
    setIsModalOpen(true);
  }

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setNim(user.nim);
    setNamaKsatria(user.nama_ksatria);
    setProdi(user.prodi ?? user.faksi.split(" - ")[0] ?? "");
    setDivisi(user.divisi ?? "Hardware");
    setEmail(user.email);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!namaKsatria.trim() || !nim.trim() || !prodi.trim() || !email.trim()) {
      return;
    }

    const faksiCombined = `${prodi.trim()} - Divisi ${divisi.trim()}`;

    if (editingUser) {
      const updated = await updateMaba(editingUser.id, {
        nim: nim.trim(),
        nama_ksatria: namaKsatria.trim().toUpperCase(),
        prodi: prodi.trim(),
        divisi: divisi.trim(),
        faksi: faksiCombined,
        email: email.trim().toLowerCase(),
      });
      setUsers(updated);
    } else {
      await createMaba({
        nim: nim.trim(),
        nama_ksatria: namaKsatria.trim().toUpperCase(),
        prodi: prodi.trim(),
        divisi: divisi.trim(),
        faksi: faksiCombined,
        email: email.trim().toLowerCase(),
      });
      await refreshUsers();
    }

    setIsModalOpen(false);
  }

  async function handleDelete(user: UserRow) {
    const updated = await deleteMaba(user.id);
    setUsers(updated);
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIM, Nama Lengkap, Prodi/Kelas, atau Email..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={divisiFilter}
              onChange={(e) => setDivisiFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Semua Divisi Kontes</option>
              {DIVISI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Divisi {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refreshUsers()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-indigo-600" />
            <span>Sinkronkan</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Ksatria (Maba)</span>
          </button>
        </div>
      </div>

      {/* CRUD Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Daftar Peserta Terdaftar (Sinkron Langsung dengan Register{" "}
              <code>lms-maba</code>)
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {filteredMaba.length} Peserta
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <th className="px-6 py-3.5">1. NIM</th>
                <th className="px-6 py-3.5">2. Nama Lengkap</th>
                <th className="px-6 py-3.5">3. Prodi / Kelas</th>
                <th className="px-6 py-3.5">4. Divisi Kontes</th>
                <th className="px-6 py-3.5">5. Email</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMaba.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Belum ada peserta terdaftar (0 data). Silakan registrasi akun
                    baru di aplikasi <code>lms-maba/register</code> atau klik{" "}
                    <strong>Tambah Ksatria (Maba)</strong>.
                  </td>
                </tr>
              ) : (
                filteredMaba.map((user) => {
                  const displayProdi =
                    user.prodi || user.faksi.split(" - ")[0] || "-";
                  const displayDivisi =
                    user.divisi ||
                    user.faksi.split(" - Divisi ")[1] ||
                    user.faksi;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700">
                        {user.nim}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {user.nama_ksatria}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {displayProdi}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {displayDivisi}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Peserta"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                            title="Hapus Peserta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {editingUser
                  ? "Edit Data Ksatria (Maba)"
                  : "Tambah Ksatria (Maba) Baru"}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    1. NIM (`nim`)
                  </label>
                  <input
                    type="text"
                    required
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    placeholder="Contoh: 240101088"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    2. Nama Lengkap (`nama_ksatria`)
                  </label>
                  <input
                    type="text"
                    required
                    value={namaKsatria}
                    onChange={(e) => setNamaKsatria(e.target.value)}
                    placeholder="Ketik Nama Lengkap..."
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    3. Prodi / Kelas (`prodi`)
                  </label>
                  <input
                    type="text"
                    required
                    value={prodi}
                    onChange={(e) => setProdi(e.target.value)}
                    placeholder="Mis: Teknik Informatika / TI-2A"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    5. Email (`email`)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.ac.id"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  4. Divisi Kontes (`divisi`)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIVISI_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDivisi(opt)}
                      className={`rounded-lg border py-2 text-xs font-semibold transition ${
                        divisi === opt
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt}
                    </button>
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
                  {editingUser ? "Simpan Perubahan" : "Simpan Peserta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
