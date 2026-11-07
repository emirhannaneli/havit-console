import React from "react";
import { Disc3, ShieldAlert, Radio, Headphones } from "lucide-react";

interface SurroundDspPanelProps {
  surround71: boolean;
  onSurroundChange: (enabled: boolean) => void;
  encEnabled: boolean;
  onEncChange: (enabled: boolean) => void;
  sidetoneEnabled: boolean;
  onSidetoneChange: (enabled: boolean) => void;
  roomSize: "small" | "medium" | "large";
  onRoomSizeChange: (size: "small" | "medium" | "large") => void;
}

export const SurroundDspPanel: React.FC<SurroundDspPanelProps> = ({
  surround71,
  onSurroundChange,
  encEnabled,
  onEncChange,
  sidetoneEnabled,
  onSidetoneChange,
  roomSize,
  onRoomSizeChange,
}) => {
  return (
    <div className="bg-zinc-900/90 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Headphones className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            7.1 SANAL ÇEVRESEL SES & MİKROFON DSP
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 7.1 Virtual Surround */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-2">
              <Disc3 className={`w-4 h-4 ${surround71 ? "text-cyan-400 animate-spin" : "text-zinc-500"}`} />
              7.1 Sanal Surround Ses
            </span>
            <button
              onClick={() => onSurroundChange(!surround71)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                surround71 ? "bg-cyan-500 justify-end" : "bg-zinc-800 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Oyunlarda 360 derecelik konumlandırma hissi için çok kanallı ses uzamlaştırması
          </p>
        </div>

        {/* Environmental Noise Cancellation */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Mikrofon ENC Filtresi
            </span>
            <button
              onClick={() => onEncChange(!encEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                encEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Klavye tıkırtısı ve ortam gürültülerini filtreleyerek sesinizi berraklaştırır
          </p>
        </div>

        {/* Sidetone / Mic Monitoring */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              Sidetone (Mikrofon Dinleme)
            </span>
            <button
              onClick={() => onSidetoneChange(!sidetoneEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                sidetoneEnabled ? "bg-amber-500 justify-end" : "bg-zinc-800 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Konuşurken kendi sesinizi kulaklıktan gecikmesiz duymanızı sağlar
          </p>
        </div>
      </div>

      {/* Room Reverb Size Selection */}
      {surround71 && (
        <div className="space-y-2 pt-2 border-t border-zinc-800 animate-fadeIn">
          <label className="text-xs font-medium text-zinc-300">
            Surround Oda Büyüklüğü & Akustik
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "small", label: "Küçük Oda (FPS Stüdyo)" },
              { id: "medium", label: "Orta Salon (Sinema)" },
              { id: "large", label: "Büyük Konser Salonu" },
            ].map((room) => (
              <button
                key={room.id}
                onClick={() => onRoomSizeChange(room.id as "small" | "medium" | "large")}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                  roomSize === room.id
                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {room.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
