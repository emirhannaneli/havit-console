import React, { useState, useEffect } from "react";
import type { KeyDef, Kb884lPhysicalLayout } from "../../types";

interface KeyboardSvgLayoutProps {
  layout: Kb884lPhysicalLayout;
  activeColor: { r: number; g: number; b: number };
  lightingMode: number;
  previewUrl: string | null;
  onKeySelect?: (key: KeyDef) => void;
  selectedKey: KeyDef | null;
}

export const KeyboardSvgLayout: React.FC<KeyboardSvgLayoutProps> = ({
  layout,
  activeColor,
  lightingMode,
  previewUrl,
  onKeySelect,
  selectedKey,
}) => {
  const [clockString, setClockString] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockString(
        now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const rgbCss = `rgb(${activeColor.r}, ${activeColor.g}, ${activeColor.b})`;
  const rgbGlow = `rgba(${activeColor.r}, ${activeColor.g}, ${activeColor.b}, 0.35)`;

  return (
    <div className="relative w-full rounded-2xl bg-zinc-950 p-6 border border-zinc-800 shadow-2xl flex flex-col items-center select-none overflow-hidden">
      {/* Subtle top glare effect */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />

      {/* Keyboard Case & Keys */}
      <div className="w-full max-w-[900px] aspect-[800/310] relative">
        <svg
          viewBox={`0 0 ${layout.canvas_width || 800} ${layout.canvas_height || 300}`}
          className="w-full h-full drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
        >
          <defs>
            <linearGradient id="caseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c1c20" />
              <stop offset="100%" stopColor="#0d0d10" />
            </linearGradient>

            <linearGradient id="keyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2c2c34" />
              <stop offset="100%" stopColor="#1a1a20" />
            </linearGradient>

            <linearGradient id="selectedKeyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4c1d24" />
              <stop offset="100%" stopColor="#280f14" />
            </linearGradient>

            <filter id="rgbGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Keyboard Chassis Outer Frame */}
          <rect
            x="4"
            y="6"
            width={layout.canvas_width - 8}
            height={layout.canvas_height - 12}
            rx="16"
            fill="url(#caseGradient)"
            stroke="#2e2e38"
            strokeWidth="3"
          />

          {/* Inner Plate Bevel */}
          <rect
            x="10"
            y="12"
            width={layout.canvas_width - 20}
            height={layout.canvas_height - 24}
            rx="12"
            fill="#121216"
            stroke="#1c1c22"
            strokeWidth="2"
          />

          {/* Mini TFT Screen Bezel (Top-Right Slot) */}
          <rect
            x={layout.screen.x - 4}
            y={layout.screen.y - 4}
            width={layout.screen.w + 8}
            height={layout.screen.h + 8}
            rx="6"
            fill="#09090b"
            stroke="#3f3f46"
            strokeWidth="2"
          />

          {/* Mini TFT Screen Active Display Area (160x96 native) */}
          <foreignObject
            x={layout.screen.x}
            y={layout.screen.y}
            width={layout.screen.w}
            height={layout.screen.h}
            className="rounded overflow-hidden"
          >
            <div className="w-full h-full bg-black flex flex-col items-center justify-center p-1 text-center relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="TFT Screen Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-300">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-rose-400">
                    {clockString}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[7px] text-zinc-400 uppercase tracking-tighter">
                      HAVIT TFT
                    </span>
                  </div>
                </div>
              )}
            </div>
          </foreignObject>

          {/* 85 Physical Keys */}
          {layout.keys.map((k) => {
            const isSelected = selectedKey?.key_index === k.key_index;
            return (
              <g
                key={k.key_index}
                onClick={() => onKeySelect?.(k)}
                className="cursor-pointer transition-transform duration-75 hover:opacity-90 active:scale-95"
              >
                {/* RGB Underglow per key */}
                <rect
                  x={k.x + 2}
                  y={k.y + 2}
                  width={k.w - 4}
                  height={k.h - 4}
                  rx="4"
                  fill="none"
                  stroke={rgbCss}
                  strokeWidth={lightingMode === 0 ? "1.5" : "2"}
                  opacity={isSelected ? "1" : "0.6"}
                  filter="url(#rgbGlowFilter)"
                />

                {/* Keycap Surface */}
                <rect
                  x={k.x}
                  y={k.y}
                  width={k.w}
                  height={k.h}
                  rx="5"
                  fill={isSelected ? "url(#selectedKeyGradient)" : "url(#keyGradient)"}
                  stroke={isSelected ? "#f43f5e" : "#373742"}
                  strokeWidth={isSelected ? "1.5" : "1"}
                  className="transition-colors"
                />

                {/* Key Label Text */}
                <text
                  x={k.x + k.w / 2}
                  y={k.y + k.h / 2 + 3.5}
                  textAnchor="middle"
                  fill={isSelected ? "#ffffff" : "#d4d4d8"}
                  fontSize={k.label.length > 3 ? "9" : "11"}
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {k.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Key Details Bar */}
      {selectedKey ? (
        <div className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-6 text-xs text-zinc-300">
          <div>
            <span className="text-zinc-500 font-mono">SEÇİLEN TUŞ:</span>{" "}
            <span className="font-bold text-white text-sm">{selectedKey.label}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-mono">HID CODE:</span>{" "}
            <span className="font-mono text-rose-400">
              0x{selectedKey.hid_code.toString(16).toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 font-mono">MATRİS İNDEKSİ:</span>{" "}
            <span className="font-mono text-cyan-400">#{selectedKey.key_index}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-mono">LED ID:</span>{" "}
            <span className="font-mono text-emerald-400">LED_{selectedKey.light_index}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-xs text-zinc-500 font-medium">
          İpucu: Tuş detaylarını ve LED adreslerini incelemek için klavye üzerindeki herhangi bir tuşa tıklayın.
        </div>
      )}
    </div>
  );
};
