import React, { useState, useEffect, useRef } from "react";
import { FileImage, Pause, Play, Upload } from "lucide-react";
import type { LcdFit, LcdFramePreview } from "../../types";
import { ActionRow, Button, Row, Section, Segmented, Select, cx } from "../ui";
import {
  pickMediaFile,
  previewKb884lMediaFile,
  uploadKb884lMedia,
  syncKb884lClock,
  saveTempMediaFile,
  loadKb884lScreen,
} from "../../api";
import { useT } from "../../i18n";

const FIT_IDS: LcdFit[] = ["fit", "fill", "stretch"];

/** What the preview is showing: a file picked now, or the last known screen content. */
type PreviewSource = "file" | "app" | "vendor" | null;

interface LcdManagerProps {
  onPreviewUpdate: (url: string | null) => void;
}

export const LcdManager: React.FC<LcdManagerProps> = ({ onPreviewUpdate }) => {
  const { t } = useT();
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
  const [fit, setFit] = useState<LcdFit>("fit");
  const [previewSource, setPreviewSource] = useState<PreviewSource>(null);
  const [onScreenSlot, setOnScreenSlot] = useState<number | null>(null);
  const filePickedRef = useRef(false);
  /** Increments per preview request so a slow, older result can't replace a newer one. */
  const previewRequestRef = useRef(0);

  // The screen can't be read back, so show the last known animation until a file is picked.
  useEffect(() => {
    loadKb884lScreen()
      .then((screen) => {
        // Skip if a file was picked while this was loading.
        if (!screen || screen.frames.length === 0 || filePickedRef.current) return;
        setFrames(screen.frames);
        setPreviewSource(screen.source);
        setOnScreenSlot(screen.slot);
        onPreviewUpdate(screen.frames[0].data_url);
      })
      .catch((err) => console.error(err));
  }, [onPreviewUpdate]);
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
      setStatusMsg({ type: "error", text: t("screen.error.file", { error: String(err) }) });
    }
  };

  const loadFile = async (path: string, placement: LcdFit = fit) => {
    const request = ++previewRequestRef.current;
    const isLatest = () => request === previewRequestRef.current;
    try {
      setLoadingPreview(true);
      setStatusMsg(null);
      setSelectedFilePath(path);
      filePickedRef.current = true;
      const decodedFrames = await previewKb884lMediaFile(path, placement);
      if (!isLatest()) return;
      setFrames(decodedFrames);
      setPreviewSource("file");
      setActiveFrameIndex(0);
      if (decodedFrames.length > 0) {
        onPreviewUpdate(decodedFrames[0].data_url);
      }
    } catch (err) {
      if (isLatest()) setStatusMsg({ type: "error", text: t("screen.error.preview", { error: String(err) }) });
    } finally {
      if (isLatest()) setLoadingPreview(false);
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
      setStatusMsg({ type: "error", text: t("screen.error.chooseFirst") });
      return;
    }
    try {
      setUploading(true);
      setStatusMsg(null);
      await uploadKb884lMedia(selectedFilePath, uploadSlot, fit);
      setOnScreenSlot(uploadSlot);
      setPreviewSource("app");
      setSelectedFilePath(null);
      setStatusMsg({ type: "success", text: t("screen.uploadSuccess") });
    } catch (err) {
      setStatusMsg({ type: "error", text: t("screen.error.upload", { error: String(err) }) });
    } finally {
      setUploading(false);
    }
  };

  const handleSyncClock = async () => {
    try {
      setClockSyncing(true);
      setStatusMsg(null);
      await syncKb884lClock(uploadSlot);
      setStatusMsg({ type: "success", text: t("screen.clock.success") });
    } catch (err) {
      setStatusMsg({ type: "error", text: t("screen.error.clock", { error: String(err) }) });
    } finally {
      setClockSyncing(false);
    }
  };

  const handleFitChange = (next: LcdFit) => {
    setFit(next);
    if (selectedFilePath) void loadFile(selectedFilePath, next);
  };

  const sourceNote =
    previewSource === "app"
      ? t("screen.source.app", { slot: onScreenSlot !== null ? t("screen.source.slot", { slot: onScreenSlot + 1 }) : "" })
      : previewSource === "vendor"
        ? t("screen.source.vendor")
        : null;

  const currentPreviewDataUrl = frames[activeFrameIndex]?.data_url;
  const status = statusMsg && { tone: statusMsg.type, text: statusMsg.text };

  return (
    <>
      <Section
        title={t("screen.title")}
        footer={sourceNote ?? t("screen.footer")}
      >
        <div className="flex flex-wrap items-stretch gap-4 p-3.5">
          <div className="flex flex-none flex-col items-center gap-2">
            <div className="group relative flex h-[144px] w-[240px] items-center justify-center overflow-hidden rounded-lg border border-control-border bg-black">
              {currentPreviewDataUrl ? (
                <img
                  src={currentPreviewDataUrl}
                  alt={t("screen.preview.alt")}
                  className="pixelated h-full w-full object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-1.5 text-[11px] text-[#9a9a9a]">
                  <FileImage aria-hidden="true" className="h-7 w-7 opacity-60" />
                  {t("screen.noMedia")}
                </span>
              )}
              {frames.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? t("screen.pause") : t("screen.play")}
                  className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-black/60 text-white"
                >
                  {isPlaying ? (
                    <Pause aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Play aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <span className="text-[11px] text-secondary tabular-nums">
              {frames.length > 0
                ? t("screen.frameOf", { index: activeFrameIndex + 1, count: frames.length, ms: frames[activeFrameIndex]?.delay_ms ?? 0 })
                : t("screen.size")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSelectFile}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            disabled={loadingPreview}
            className="flex min-h-[144px] min-w-[220px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-control-border bg-transparent p-4 text-center text-label hover:border-accent disabled:opacity-60"
          >
            <Upload aria-hidden="true" className="h-6 w-6 text-secondary" />
            <span className="font-medium">
              {loadingPreview ? t("screen.preparing") : t("screen.drop")}
            </span>
            <span className="text-xs text-secondary">{t("screen.gifHint")}</span>
          </button>
        </div>

        {frames.length > 1 && (
          <div className="flex flex-col gap-1.5 px-3.5 py-3">
            <span className="text-xs text-secondary">{t("screen.frames", { count: frames.length })}</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {frames.map((f) => (
                <button
                  key={f.index}
                  type="button"
                  aria-label={t("screen.frame", { index: f.index + 1 })}
                  aria-pressed={activeFrameIndex === f.index}
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveFrameIndex(f.index);
                    onPreviewUpdate(f.data_url);
                  }}
                  className={cx(
                    "h-9 w-14 flex-none overflow-hidden rounded border-2 bg-black p-0",
                    activeFrameIndex === f.index ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={f.data_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <Row label={t("screen.placement")} description={t(`screen.fit.hint.${fit}` as const)}>
          <Segmented
            label={t("screen.placement.aria")}
            options={FIT_IDS.map((id) => ({ id, label: t(`screen.fit.${id}` as const) }))}
            value={fit}
            onChange={handleFitChange}
          />
        </Row>

        <Row label={t("screen.slot")} htmlFor="lcd-slot">
          <Select
            id="lcd-slot"
            value={uploadSlot}
            options={[
              { value: 0, label: t("screen.slot.default") },
              { value: 1, label: t("screen.slot.n", { n: 2 }) },
              { value: 2, label: t("screen.slot.n", { n: 3 }) },
            ]}
            onChange={setUploadSlot}
          />
        </Row>

        <ActionRow status={status}>
          <Button variant="primary" onClick={handleUploadToKeyboard} disabled={uploading || !selectedFilePath || frames.length === 0}>
            {uploading ? t("screen.uploading") : t("screen.upload")}
          </Button>
        </ActionRow>
      </Section>

      <Section title={t("screen.clock.title")}>
        <Row label={t("screen.clock.sync")} description={t("screen.clock.desc")}>
          <Button onClick={handleSyncClock} disabled={clockSyncing}>
            {clockSyncing ? t("screen.clock.syncing") : t("screen.clock.button")}
          </Button>
        </Row>
      </Section>
    </>
  );
};
