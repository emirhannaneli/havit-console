import React from "react";
import { Sun, Gauge, MoveRight, Sparkles, Check } from "lucide-react";
import type { Kb884lLightingConfig } from "../../types";

const LIGHTING_MODES = [
  { id: 0, name: "Sabit Renk (Static)" },
  { id: 1, name: "Nefes Alma (Breathing)" },
  { id: 2, name: "Renk Döngüsü (Spectrum)" },
  { id: 3, name: "Gökkuşağı Dalgası (Wave)" },
  { id: 4, name: "Su Dalgası (Ripple)" },
  { id: 5, name: "Yağmur Damlaları (Raindrops)" },
  { id: 6, name: "Yılan Modu (Snake)" },
  { id: 7, name: "Tepkisel (Reactive Touch)" },
  { id: 8, name: "Kuzey Işıkları (Aurora)" },
  { id: 9, name: "Yıldızlı Gece (Starlight)" },
  { id: 10, name: "Neon Akışı (Neon Stream)" },
];

const PRESET_COLORS = [
  { name: "Kırmızı", r: 255, g: 0, b: 0, hex: "#ff0000" },
  { name: "Turuncu", r: 255, g: 100, b: 0, hex: "#ff6400" },
  { name: "Sarı", r: 255, g: 215, b: 0, hex: "#ffd700" },
  { name: "Yeşil", r: 16, g: 185, b: 129, hex: "#10b981" },
  { name: "Camgöbeği", r: 6, g: 182, b: 212, hex: "#06b6d4" },
  { name: "Mavi", r: 59, g: 130, b: 246, hex: "#3b82f6" },
  { name: "Mor", r: 147, g: 51, b: 234, hex: "#9333ea" },
  { name: "Pembe", r: 244, g: 63, b: 94, hex: "#f43f5e" },
  { name: "Beyaz", r: 255, g: 255, b: 255, hex: "#ffffff" },
];

interface LightingPanelProps {
  config: Kb884lLightingConfig;
  onChange: (newCfg: Kb884lLightingConfig) => void;
  onApply: () => void;
  applying: boolean;
  statusMessage: string | null;
}

export const LightingPanel: React.FC<LightingPanelProps> = ({
  config,
  onChange,
  onApply,
  applying,
  statusMessage,
}) => {
  const currentHex = `#${config.r.toString(16).padStart(2, "0")}${config.g
    .toString(16)
    .padStart(2, "0")}${config.b.toString(16).padStart(2, "0")}`;

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    onChange({ ...config, r, g, b });
  };

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-rose-500" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            RGB AYDINLATMA EFEKTLERİ
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full border border-zinc-700 shadow-inner"
            style={{ backgroundColor: currentHex }}
          />
          <span className="font-mono text-xs text-zinc-400 uppercase">{currentHex}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Effect Mode */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">Aydınlatma Modu</label>
          <select
            value={config.mode}
            onChange={(e) => onChange({ ...config, mode: Number(e.target.value) })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 transition-colors"
          >
            {LIGHTING_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Brightness Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" /> Parlaklık
            </span>
            <span className="font-mono text-zinc-400">{config.brightness} / 5</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={config.brightness}
            onChange={(e) => onChange({ ...config, brightness: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        {/* Speed Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Efekt Hızı
            </span>
            <span className="font-mono text-zinc-400">{config.speed} / 5</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={config.speed}
            onChange={(e) => onChange({ ...config, speed: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        {/* Direction Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <MoveRight className="w-3.5 h-3.5 text-emerald-400" /> Dalga Yönü
          </label>
          <select
            value={config.direction}
            onChange={(e) => onChange({ ...config, direction: Number(e.target.value) })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 transition-colors"
          >
            <option value="0">Sola Doğru (←)</option>
            <option value="1">Sağa Doğru (→)</option>
            <option value="2">Yukarıya Doğru (↑)</option>
            <option value="3">Aşağıya Doğru (↓)</option>
          </select>
        </div>
      </div>

      {/* Preset Swatches & Custom Color */}
      <div className="space-y-3 pt-2 border-t border-zinc-800">
        <label className="text-xs font-medium text-zinc-300">Renk Paleti & Özel Seçim</label>
        <div className="flex flex-wrap items-center gap-2.5">
          {PRESET_COLORS.map((col) => {
            const isMatch =
              config.r === col.r && config.g === col.g && config.b === col.b;
            return (
              <button
                key={col.hex}
                onClick={() => onChange({ ...config, r: col.r, g: col.g, b: col.b })}
                title={col.name}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                  isMatch
                    ? "border-white ring-2 ring-rose-500/50 scale-110 shadow-lg"
                    : "border-transparent hover:border-zinc-500 hover:scale-105"
                }`}
                style={{ backgroundColor: col.hex }}
              >
                {isMatch && (
                  <Check
                    className={`w-4 h-4 ${
                      col.hex === "#ffffff" ? "text-black" : "text-white"
                    }`}
                  />
                )}
              </button>
            );
          })}

          {/* Native Color Picker Tool */}
          <div className="relative flex items-center ml-2">
            <input
              type="color"
              value={currentHex}
              onChange={handleHexChange}
              className="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer overflow-hidden p-0"
            />
          </div>
        </div>
      </div>

      {/* Apply Button & Feedback Message */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {statusMessage && (
            <p className="text-xs font-medium text-emerald-400 animate-fadeIn">
              {statusMessage}
            </p>
          )}
        </div>
        <button
          onClick={onApply}
          disabled={applying}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-xs shadow-lg shadow-rose-950/50 active:scale-95 transition-all disabled:opacity-50"
        >
          {applying ? "Klavyeye Gönderiliyor..." : "Klavyeye Uygula & NVRAM'e Kaydet"}
        </button>
      </div>
    </div>
  );
};
