import React from "react";
import { Volume2, VolumeX, Mic, MicOff, SlidersHorizontal } from "lucide-react";
import type { FuxiAudioEndpointStatus } from "../../types";

interface AudioControlsProps {
  status: FuxiAudioEndpointStatus;
  onVolumeChange: (vol: number, muted: boolean) => void;
  onBalanceChange: (left: number, right: number) => void;
  onMicChange: (vol: number, muted: boolean) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  status,
  onVolumeChange,
  onBalanceChange,
  onMicChange,
}) => {
  return (
    <div className="bg-zinc-900/90 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            ANA SES & MİKROFON KONTROLLERİ (COREAUDIO)
          </h3>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          {status.speaker_found ? (
            <span className="text-emerald-400">● {status.speaker_name}</span>
          ) : (
            <span className="text-zinc-500">Ses Aygıtı Bekleniyor</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Master Headphone Volume */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-2">
              {status.speaker_muted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              Kulaklık Ses Seviyesi
            </span>
            <button
              onClick={() => onVolumeChange(status.speaker_volume, !status.speaker_muted)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                status.speaker_muted
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              {status.speaker_muted ? "Sessiz" : "Sesi Açık"}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>0%</span>
              <span className="text-cyan-300 font-bold">{status.speaker_volume}%</span>
              <span>100%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={status.speaker_volume}
              onChange={(e) => onVolumeChange(Number(e.target.value), status.speaker_muted)}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 2. Channel Balance (Left / Right) */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200">Kanal Dengesi (L / R)</span>
            <button
              onClick={() => onBalanceChange(100, 100)}
              className="text-[11px] font-mono text-zinc-500 hover:text-cyan-400 underline"
            >
              Merkeze Al (1:1)
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>Sol: {status.left_balance}%</span>
              <span>Sağ: {status.right_balance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={status.right_balance}
              onChange={(e) => {
                const r = Number(e.target.value);
                onBalanceChange(100 - (r > 50 ? (r - 50) * 2 : 0), 100 - (r < 50 ? (50 - r) * 2 : 0));
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Microphone Volume & Mute */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-2">
              {status.mic_muted ? (
                <MicOff className="w-4 h-4 text-red-400" />
              ) : (
                <Mic className="w-4 h-4 text-rose-400" />
              )}
              Mikrofon Kazancı
            </span>
            <button
              onClick={() => onMicChange(status.mic_volume, !status.mic_muted)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                status.mic_muted
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              {status.mic_muted ? "Sessiz" : "Aktif"}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>0%</span>
              <span className="text-rose-400 font-bold">{status.mic_volume}%</span>
              <span>100%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={status.mic_volume}
              onChange={(e) => onMicChange(Number(e.target.value), status.mic_muted)}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
