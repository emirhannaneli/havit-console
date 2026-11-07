import React from "react";
import { Sliders, Lock, Moon, Zap, CheckCircle2 } from "lucide-react";
import type { Kb884lSettingsConfig } from "../../types";

interface SettingsPanelProps {
  settings: Kb884lSettingsConfig;
  onChange: (cfg: Kb884lSettingsConfig) => void;
  onSave: () => void;
  saving: boolean;
  statusMessage: string | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onSave,
  saving,
  statusMessage,
}) => {
  return (
    <div className="bg-zinc-900/90 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-rose-500" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            DONANIM & YAZILIM KONTROLLERİ
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Win Key Lock */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-400" /> Win Tuşu Kilidi
            </span>
            <p className="text-[11px] text-zinc-500">Oyun sırasında kazara basılmasını engeller</p>
          </div>
          <button
            onClick={() => onChange({ ...settings, win_lock: !settings.win_lock })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.win_lock ? "bg-rose-600 justify-end" : "bg-zinc-800 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        {/* Fn Key Toggle */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Fn Modu Kilidi
            </span>
            <p className="text-[11px] text-zinc-500">Fn tuşunu basılı tutmadan aktif tutar</p>
          </div>
          <button
            onClick={() => onChange({ ...settings, fn_toggle: !settings.fn_toggle })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.fn_toggle ? "bg-rose-600 justify-end" : "bg-zinc-800 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        {/* Sleep Timer */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
          <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-indigo-400" /> Uyku Zamanlayıcısı
          </span>
          <select
            value={settings.sleep_minutes}
            onChange={(e) => onChange({ ...settings, sleep_minutes: Number(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
          >
            <option value="0">Hiçbir Zaman Uyumaz</option>
            <option value="1">1 Dakika Hareketsizlik</option>
            <option value="5">5 Dakika Hareketsizlik</option>
            <option value="10">10 Dakika Hareketsizlik</option>
            <option value="30">30 Dakika Hareketsizlik</option>
          </select>
        </div>

        {/* Debounce Time */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
          <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Debounce Gecikmesi
          </span>
          <select
            value={settings.debounce_ms}
            onChange={(e) => onChange({ ...settings, debounce_ms: Number(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
          >
            <option value="1">1 ms (Ultra Hızlı / Pro)</option>
            <option value="2">2 ms (Dengeli Oyun)</option>
            <option value="8">8 ms (Çift Tıklama Koruması)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {statusMessage && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-xs shadow-lg shadow-rose-950/50 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Ayarları Klavyeye Yaz & Kaydet"}
        </button>
      </div>
    </div>
  );
};
