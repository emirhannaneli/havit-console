import React, { useState, useEffect } from "react";
import {
  Sliders,
  Plus,
  Trash2,
  Download,
  Upload,
  Keyboard,
  Headphones,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { SavedProfile } from "../../types";
import {
  fetchProfiles,
  saveProfileToStorage,
  deleteProfileFromStorage,
} from "../../api";

interface ProfilesViewProps {
  onApplyProfile?: (profile: SavedProfile) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({ onApplyProfile }) => {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>("all");
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDevice, setNewProfileDevice] = useState<"kb884l" | "fuxi-h7">("kb884l");
  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      const list = await fetchProfiles();
      setProfiles(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const id = `${newProfileDevice}_${Date.now()}`;
    const newProf: SavedProfile = {
      id,
      name: newProfileName.trim(),
      device_id: newProfileDevice,
      updated_at: new Date().toISOString(),
      data: {
        created_via: "havit-console",
        device: newProfileDevice,
      },
    };

    try {
      await saveProfileToStorage(newProf);
      setNewProfileName("");
      setCreating(false);
      setStatusMsg("Yeni profil başarıyla kaydedildi.");
      setTimeout(() => setStatusMsg(null), 3000);
      await loadProfiles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu profili silmek istediğinize emin misiniz?")) {
      try {
        await deleteProfileFromStorage(id);
        await loadProfiles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExportJson = (profile: SavedProfile) => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `havit_${profile.device_id}_${profile.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = profiles.filter((p) =>
    selectedDeviceFilter === "all" ? true : p.device_id === selectedDeviceFilter
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              YAPILANDIRMA PROFİLLERİ
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Klavye RGB ve aydınlatma şemalarını, kulaklık EQ bantlarını profiller halinde saklayın.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Device Filter */}
          <select
            value={selectedDeviceFilter}
            onChange={(e) => setSelectedDeviceFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">Tüm Cihazlar ({profiles.length})</option>
            <option value="kb884l">Sadece KB884L Klavye</option>
            <option value="fuxi-h7">Sadece Fuxi-H7 Kulaklık</option>
          </select>

          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium shadow-lg shadow-amber-950/40 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Profil Ekle</span>
          </button>
        </div>
      </div>

      {/* Creation Box */}
      {creating && (
        <form
          onSubmit={handleCreateProfile}
          className="bg-zinc-900/90 p-5 rounded-2xl border border-amber-500/30 shadow-xl space-y-4 animate-fadeIn"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Yeni Profil Kaydet
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-300">Profil Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Gece CS2 Modu / Sinema EQ"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-300">Hedef Donanım</label>
              <select
                value={newProfileDevice}
                onChange={(e) =>
                  setNewProfileDevice(e.target.value as "kb884l" | "fuxi-h7")
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="kb884l">Havit KB884L Gaming Keyboard</option>
                <option value="fuxi-h7">Havit Fuxi-H7 Gaming Headset</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors"
              >
                Diske Kaydet
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Profile Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800/80 space-y-2">
          <Sliders className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-medium text-zinc-400">
            Kayıtlı Profil Bulunamadı
          </p>
          <p className="text-xs text-zinc-600">
            Donanım ayarlarınızı hızlıca değiştirmek için yukarıdaki "Yeni Profil Ekle" butonunu kullanın.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prof) => {
            const isKb = prof.device_id === "kb884l";
            return (
              <div
                key={prof.id}
                className="bg-zinc-900/90 rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                        isKb
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                      }`}
                    >
                      {isKb ? (
                        <Keyboard className="w-3.5 h-3.5" />
                      ) : (
                        <Headphones className="w-3.5 h-3.5" />
                      )}
                      <span>{isKb ? "KB884L Klavye" : "Fuxi-H7 Kulaklık"}</span>
                    </span>

                    <button
                      onClick={() => handleDelete(prof.id)}
                      title="Profili Sil"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-white">
                    {prof.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(prof.updated_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/80">
                  <button
                    onClick={() => onApplyProfile?.(prof)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                  >
                    Uygula
                  </button>
                  <button
                    onClick={() => handleExportJson(prof)}
                    title="JSON Dışa Aktar"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
