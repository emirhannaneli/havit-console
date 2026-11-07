import React, { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Clock,
  Upload,
  Play,
  Pause,
  Film,
  CheckCircle2,
  AlertCircle,
  FileImage,
} from "lucide-react";
import type { LcdFramePreview } from "../../types";
import {
  pickMediaFile,
  previewKb884lMediaFile,
  uploadKb884lMedia,
  syncKb884lClock,
  saveTempMediaFile,
} from "../../api";

interface LcdManagerProps {
  onPreviewUpdate: (url: string | null) => void;
}

export const LcdManager: React.FC<LcdManagerProps> = ({ onPreviewUpdate }) => {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [frames, setFrames] = useState<LcdFramePreview[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [uploadSlot, setUploadSlot] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [clockSyncing, setClockSyncing] = useState(false);
  const animTimerRef = useRef<number | null>(null);

  // Play animation frames in preview
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const currentFrame = frames[activeFrameIndex];
    const delay = currentFrame ? Math.max(30, currentFrame.delay_ms) : 100;

    animTimerRef.current = window.setTimeout(() => {
      const nextIdx = (activeFrameIndex + 1) % frames.length;
      setActiveFrameIndex(nextIdx);
      onPreviewUpdate(frames[nextIdx]?.data_url || null);
    }, delay);

    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [isPlaying, activeFrameIndex, frames, onPreviewUpdate]);

  const handleSelectFile = async () => {
    try {
      const path = await pickMediaFile();
      if (!path) return;
      await loadFile(path);
    } catch (err) {
      setStatusMsg({ type: "error", text: `Dosya seçilemedi: ${err}` });
    }
  };

  const loadFile = async (path: string) => {
    try {
      setLoadingPreview(true);
      setStatusMsg(null);
      setSelectedFilePath(path);
      const decodedFrames = await previewKb884lMediaFile(path);
      setFrames(decodedFrames);
      setActiveFrameIndex(0);
      if (decodedFrames.length > 0) {
        onPreviewUpdate(decodedFrames[0].data_url);
        setStatusMsg({
          type: "success",
          text: `${decodedFrames.length} kare başarıyla 160×96 çözünürlüğe ölçeklendi.`,
        });
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: `Önizleme oluşturulamadı: ${err}` });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const raw = reader.result as string;
        const base64 = raw.split(",")[1];
        if (base64) {
          const cachedPath = await saveTempMediaFile(base64, file.name);
          await loadFile(cachedPath);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadToKeyboard = async () => {
    if (!selectedFilePath) {
      setStatusMsg({ type: "error", text: "Lütfen önce bir görsel veya GIF seçin." });
      return;
    }
    try {
      setUploading(true);
      setStatusMsg(null);
      const res = await uploadKb884lMedia(selectedFilePath, uploadSlot);
      setStatusMsg({ type: "success", text: res });
    } catch (err) {
      setStatusMsg({ type: "error", text: `Yükleme hatası: ${err}` });
    } finally {
      setUploading(false);
    }
  };

  const handleSyncClock = async () => {
    try {
      setClockSyncing(true);
      setStatusMsg(null);
      const res = await syncKb884lClock(uploadSlot);
      setStatusMsg({ type: "success", text: res });
    } catch (err) {
      setStatusMsg({ type: "error", text: `Saat senkronizasyon hatası: ${err}` });
    } finally {
      setClockSyncing(false);
    }
  };

  const currentPreviewDataUrl = frames[activeFrameIndex]?.data_url;

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-6">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Monitor className="w-5 h-5 text-rose-500" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            160×96 MİNİ TFT EKRAN & GIF YÖNETİCİSİ
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncClock}
            disabled={clockSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{clockSyncing ? "Eşitleniyor..." : "Bilgisayar Saatini Eşitle"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Screen Simulation Box */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-xl border border-zinc-800">
          <div className="text-xs font-mono text-zinc-500 mb-2 flex items-center justify-between w-full px-2">
            <span>TFT EKRAN ÖNİZLEMESİ</span>
            <span className="text-rose-400">160 × 96 RGB565</span>
          </div>

          {/* Exact ratio screen viewport */}
          <div className="w-[240px] h-[144px] bg-black rounded-lg border-2 border-zinc-700 flex items-center justify-center overflow-hidden shadow-inner relative group">
            {currentPreviewDataUrl ? (
              <img
                src={currentPreviewDataUrl}
                alt="Ekran Önizlemesi"
                className="w-full h-full object-contain pixelated"
              />
            ) : (
              <div className="flex flex-col items-center text-zinc-600 gap-1.5">
                <FileImage className="w-8 h-8 opacity-40" />
                <span className="text-[11px]">Medya Seçilmedi</span>
              </div>
            )}

            {/* Play/Pause overlay */}
            {frames.length > 1 && (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white drop-shadow" />
                ) : (
                  <Play className="w-8 h-8 text-white drop-shadow ml-1" />
                )}
              </button>
            )}
          </div>

          {/* Frame indicator */}
          {frames.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>
                Kare: {activeFrameIndex + 1} / {frames.length}
              </span>
              <span>•</span>
              <span>{frames[activeFrameIndex]?.delay_ms} ms</span>
            </div>
          )}
        </div>

        {/* Right: Drop zone & Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handleSelectFile}
            className="border-2 border-dashed border-zinc-800 hover:border-rose-500/50 bg-zinc-950/50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <Upload className="w-7 h-7 text-zinc-400" />
            <p className="text-xs text-zinc-300 font-medium">
              GIF veya Görseli Buraya Sürükleyin ya da <span className="text-rose-400 underline">Göz Atın</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              Desteklenen formatlar: .GIF (animasyonlu), .PNG, .JPG, .WEBP (otomatik 160×96 boyutlandırılır)
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 font-medium">Ekran Yuvası:</label>
              <select
                value={uploadSlot}
                onChange={(e) => setUploadSlot(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="0">Yuva 1 (Varsayılan Animasyon)</option>
                <option value="1">Yuva 2</option>
                <option value="2">Yuva 3</option>
              </select>
            </div>

            <button
              onClick={handleUploadToKeyboard}
              disabled={uploading || frames.length === 0}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-xs shadow-lg shadow-rose-950/50 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {uploading
                  ? "4KB Paketlerle TFT'ye Yükleniyor..."
                  : "Animasyonu Klavyeye Yükle"}
              </span>
            </button>
          </div>

          {/* Decoded Frames Carousel */}
          {frames.length > 1 && (
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">
                Ayrıştırılan Kareler ({frames.length})
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {frames.map((f) => (
                  <button
                    key={f.index}
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveFrameIndex(f.index);
                      onPreviewUpdate(f.data_url);
                    }}
                    className={`shrink-0 w-14 h-9 rounded border overflow-hidden transition-all ${
                      activeFrameIndex === f.index
                        ? "border-rose-500 ring-2 ring-rose-500/40"
                        : "border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={f.data_url}
                      alt={`Kare ${f.index}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback message */}
          {statusMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${
                statusMsg.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-300"
                  : "bg-red-950/40 border border-red-800/40 text-red-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
