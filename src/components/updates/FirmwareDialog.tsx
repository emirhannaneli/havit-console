import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Download, Keyboard } from "lucide-react";
import type { FirmwareUpdate } from "../../types";
import { installFirmwareUpdate } from "../../api";
import { Button, cx, Sheet } from "../ui";

type Phase = "confirm" | "progress" | "done" | "error";

const formatSize = (bytes: number) =>
  `${(bytes / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;

export const FirmwareDialog: React.FC<{
  update: FirmwareUpdate | null;
  onClose: () => void;
}> = ({ update, onClose }) => {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (update) {
      setPhase("confirm");
      setPct(0);
      setError(null);
      setCopied(false);
    }
  }, [update]);

  if (!update) return null;

  const start = async () => {
    setPhase("progress");
    setPct(0);
    setError(null);
    try {
      await installFirmwareUpdate(update, setPct);
      setPhase("done");
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setPhase("error");
    }
  };

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(error ?? "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const text: Record<Phase, [string, string]> = {
    confirm: [
      `${update.device_name} firmware’i güncellensin mi?`,
      "Güncelleme sırasında cihaz yaklaşık 1 dakika yanıt vermez. İşlem bitince cihaz kendini yeniden başlatır.",
    ],
    progress: [
      "Firmware yükleniyor…",
      "Cihazı çıkarma ve bilgisayarı uyutma. Yarıda kalırsa buradan tekrar denenebilir.",
    ],
    done: ["Güncelleme tamamlandı", `${update.device_name} artık ${update.version} sürümünde.`],
    error: [
      "Güncelleme tamamlanamadı",
      "Cihaz güncellenmedi. Cihazı çıkarmadan “Yeniden dene”ye bas veya günlüğü kopyalayıp sorunu bildir.",
    ],
  };

  const stage =
    pct < 20 ? "Paket doğrulanıyor" : pct < 90 ? "Bellek blokları yazılıyor" : "Doğrulanıyor ve yeniden başlatılıyor";

  const iconBg = phase === "done" ? "bg-success-dot" : phase === "error" ? "bg-danger" : "bg-accent";
  const Icon = phase === "done" ? Check : phase === "error" ? AlertCircle : phase === "progress" ? Keyboard : Download;

  return (
    <Sheet
      open
      alert
      onClose={onClose}
      dismissable={phase !== "progress"}
      labelledBy="fw-title"
      describedBy="fw-desc"
      className="w-[420px]"
    >
      <div className="flex flex-col gap-4 px-5 pt-[22px] pb-[18px]">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className={cx("flex h-14 w-14 flex-none items-center justify-center rounded-[14px]", iconBg)}>
            <Icon className={cx("h-[30px] w-[30px]", phase === "done" || phase === "error" ? "text-white" : "text-on-accent")} strokeWidth={2.4} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 id="fw-title" className="m-0 text-[15px] leading-5 font-bold">
              {text[phase][0]}
            </h2>
            <p id="fw-desc" className="m-0 leading-[17px] text-secondary">
              {text[phase][1]}
            </p>
          </div>
        </div>

        {phase === "confirm" && (
          <dl className="m-0 ml-[72px] grid grid-cols-[60px_1fr] gap-x-2 gap-y-1.5 text-xs leading-[15px]">
            <dt className="text-tertiary">Cihaz</dt>
            <dd className="m-0">{update.device_name}</dd>
            <dt className="text-tertiary">Sürüm</dt>
            <dd className="m-0">
              {update.current_version ?? "Bilinmiyor"} → {update.version}
            </dd>
            <dt className="text-tertiary">Boyut</dt>
            <dd className="m-0">{formatSize(update.size_bytes)}</dd>
          </dl>
        )}

        {phase === "progress" && (
          <div className="ml-[72px] flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label="Firmware yazılıyor"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-1.5 overflow-hidden rounded-full bg-fill"
            >
              <div className="h-1.5 rounded-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-secondary tabular-nums">
              <span>{stage}</span>
              <span>%{pct}</span>
            </div>
          </div>
        )}

        {phase === "error" && error && (
          <pre className="m-0 ml-[72px] rounded-lg border border-separator bg-window px-3 py-2.5 font-mono text-xs leading-[15px] whitespace-pre-wrap text-secondary">
            {error}
          </pre>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
          {phase === "confirm" && (
            <>
              <Button onClick={onClose}>Vazgeç</Button>
              <Button variant="primary" className="min-w-[90px]" onClick={start} autoFocus>
                Güncelle
              </Button>
            </>
          )}
          {phase === "progress" && (
            <>
              <span className="mr-auto flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle aria-hidden="true" className="h-[13px] w-[13px]" />
                Cihazı çıkarma
              </span>
              <Button disabled>Vazgeç</Button>
            </>
          )}
          {phase === "done" && (
            <Button variant="primary" className="min-w-[90px]" onClick={onClose} autoFocus>
              Kapat
            </Button>
          )}
          {phase === "error" && (
            <>
              <Button className="mr-auto" onClick={copyLog}>
                {copied ? "Kopyalandı" : "Günlüğü kopyala"}
              </Button>
              <Button onClick={onClose}>Kapat</Button>
              <Button variant="primary" className="min-w-[90px]" onClick={start} autoFocus>
                Yeniden dene
              </Button>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
};
