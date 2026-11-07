import React, { useState } from "react";
import { Sliders, RotateCcw, Sparkles } from "lucide-react";

export interface EqBand {
  freq: string;
  gain: number; // -20..+20 dB
}

export const EQ_FREQUENCIES = [
  "30 Hz",
  "60 Hz",
  "120 Hz",
  "250 Hz",
  "500 Hz",
  "1 kHz",
  "2 kHz",
  "4 kHz",
  "8 kHz",
  "16 kHz",
];

export const EQ_PRESETS: Record<string, number[]> = {
  Varsayılan: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bas Güçlendirme (Bass Boost)": [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  "Tiz Netleştirme (Treble)": [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  "Rock Müziği": [5, 3, -1, -2, 1, 3, 5, 6, 7, 7],
  "Canlı Konser (Live)": [-2, 0, 2, 3, 4, 4, 3, 2, 2, 1],
  "Elektronik / Dance": [6, 5, 2, 0, -1, 2, 4, 5, 4, 3],
  "PUBG / FPS Ayak Sesi": [2, 4, 6, 3, 0, 2, 5, 6, 4, 2],
  "Valorant Yetenek & Netlik": [1, 2, 3, 1, 0, 3, 6, 7, 5, 3],
};

interface EqualizerPanelProps {
  bands: number[];
  onChange: (newBands: number[]) => void;
  preamp: number;
  onPreampChange: (preamp: number) => void;
}

export const EqualizerPanel: React.FC<EqualizerPanelProps> = ({
  bands,
  onChange,
  preamp,
  onPreampChange,
}) => {
  const [activePreset, setActivePreset] = useState("Varsayılan");

  const handleBandChange = (index: number, val: number) => {
    const updated = [...bands];
    updated[index] = val;
    onChange(updated);
    setActivePreset("Özel (Custom)");
  };

  const handleApplyPreset = (name: string, gains: number[]) => {
    setActivePreset(name);
    onChange([...gains]);
  };

  const handleReset = () => {
    handleApplyPreset("Varsayılan", EQ_PRESETS["Varsayılan"]);
    onPreampChange(0);
  };

  // Generate SVG curve points for the spline
  // Width 600, Height 140. Y=70 is 0 dB. Range: +20 to -20 dB (so 1 dB = 3 px)
  const curvePoints = bands.map((g, i) => {
    const x = 30 + i * 60;
    const y = 70 - g * 2.8;
    return `${x},${y}`;
  });
  const splinePath = `M ${curvePoints.join(" L ")}`;

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            10-BANT GRAFİK EKOLAYZIR (DSP)
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">
            Profil: <span className="text-cyan-400 font-semibold">{activePreset}</span>
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sıfırla</span>
          </button>
        </div>
      </div>

      {/* Visual Curve Graph */}
      <div className="w-full bg-zinc-950 rounded-xl p-3 border border-zinc-800 relative overflow-hidden">
        <div className="flex justify-between text-[10px] font-mono text-zinc-600 px-2 select-none">
          <span>+20 dB</span>
          <span>0 dB</span>
          <span>-20 dB</span>
        </div>
        <svg viewBox="0 0 600 140" className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id="eqGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="14" x2="600" y2="14" stroke="#27272a" strokeDasharray="3 3" />
          <line x1="0" y1="70" x2="600" y2="70" stroke="#3f3f46" strokeWidth="1" />
          <line x1="0" y1="126" x2="600" y2="126" stroke="#27272a" strokeDasharray="3 3" />

          {/* Area fill */}
          <path
            d={`${splinePath} L 570,70 L 30,70 Z`}
            fill="url(#eqGradient)"
          />

          {/* Curve line */}
          <path
            d={splinePath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Node points */}
          {bands.map((g, i) => {
            const x = 30 + i * 60;
            const y = 70 - g * 2.8;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#ffffff"
                stroke="#0891b2"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {/* 10 Vertical Sliders */}
      <div className="grid grid-cols-10 gap-2 items-end pt-2">
        {EQ_FREQUENCIES.map((freq, idx) => {
          const val = bands[idx] ?? 0;
          return (
            <div key={freq} className="flex flex-col items-center gap-2 group">
              <span className="text-[11px] font-mono text-cyan-300 font-semibold h-4">
                {val > 0 ? `+${val}` : val}
              </span>

              {/* Vertical slider input container */}
              <div className="h-40 flex items-center justify-center py-2">
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={val}
                  onChange={(e) => handleBandChange(idx, Number(e.target.value))}
                  className="w-32 -rotate-90 accent-cyan-400 cursor-pointer"
                />
              </div>

              <span className="text-[10px] font-mono text-zinc-400 tracking-tight text-center whitespace-nowrap">
                {freq}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stock Presets Buttons */}
      <div className="space-y-2 pt-4 border-t border-zinc-800">
        <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Hazır Ekolayzır Profilleri
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EQ_PRESETS).map(([name, gains]) => (
            <button
              key={name}
              onClick={() => handleApplyPreset(name, gains)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === name
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-lg shadow-cyan-950/40"
                  : "bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
