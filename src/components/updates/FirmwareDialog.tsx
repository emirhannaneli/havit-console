import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Download, Keyboard } from "lucide-react";
import type { FirmwareUpdate } from "../../types";
import { installFirmwareUpdate } from "../../api";
import { Button, cx, Sheet } from "../ui";
import { useT } from "../../i18n";

type Phase = "confirm" | "progress" | "done" | "error";

const formatSize = (bytes: number, lang: string) =>
  `${(bytes / 1_000_000).toLocaleString(lang, { maximumFractionDigits: 1 })} MB`;

export const FirmwareDialog: React.FC<{
  update: FirmwareUpdate | null;
  onClose: () => void;
}> = ({ update, onClose }) => {
  const { t, lang } = useT();
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
    confirm: [t("firmware.confirm.title", { device: update.device_name }), t("firmware.confirm.body")],
    progress: [t("firmware.progress.title"), t("firmware.progress.body")],
    done: [t("firmware.done.title"), t("firmware.done.body", { device: update.device_name, version: update.version })],
    error: [t("firmware.error.title"), t("firmware.error.body")],
  };

  const stage =
    pct < 20 ? t("firmware.stage.verify") : pct < 90 ? t("firmware.stage.write") : t("firmware.stage.restart");

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
            <dt className="text-tertiary">{t("firmware.device")}</dt>
            <dd className="m-0">{update.device_name}</dd>
            <dt className="text-tertiary">{t("firmware.version")}</dt>
            <dd className="m-0">
              {update.current_version ?? t("firmware.unknown")} → {update.version}
            </dd>
            <dt className="text-tertiary">{t("firmware.size")}</dt>
            <dd className="m-0">{formatSize(update.size_bytes, lang)}</dd>
          </dl>
        )}

        {phase === "progress" && (
          <div className="ml-[72px] flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label={t("firmware.progress.aria")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-1.5 overflow-hidden rounded-full bg-fill"
            >
              <div className="h-1.5 rounded-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-secondary tabular-nums">
              <span>{stage}</span>
              <span>{pct}%</span>
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
              <Button onClick={onClose}>{t("common.cancel")}</Button>
              <Button variant="primary" className="min-w-[90px]" onClick={start} autoFocus>
                {t("firmware.update")}
              </Button>
            </>
          )}
          {phase === "progress" && (
            <>
              <span className="mr-auto flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle aria-hidden="true" className="h-[13px] w-[13px]" />
                {t("firmware.dontUnplug")}
              </span>
              <Button disabled>{t("common.cancel")}</Button>
            </>
          )}
          {phase === "done" && (
            <Button variant="primary" className="min-w-[90px]" onClick={onClose} autoFocus>
              {t("common.close")}
            </Button>
          )}
          {phase === "error" && (
            <>
              <Button className="mr-auto" onClick={copyLog}>
                {copied ? t("firmware.copied") : t("firmware.copyLog")}
              </Button>
              <Button onClick={onClose}>{t("common.close")}</Button>
              <Button variant="primary" className="min-w-[90px]" onClick={start} autoFocus>
                {t("common.tryAgain")}
              </Button>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
};
