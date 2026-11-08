import React, { useState } from "react";
import { AlertTriangle, Check, Headphones, Keyboard, RefreshCw } from "lucide-react";
import { version as appVersion } from "../../../package.json";
import type { DetectedDeviceStatus, FirmwareUpdate, FirmwareUpdateCheck } from "../../types";
import { Button, ConnectionLabel, Notice, readPref, Row, Section, Switch, writePref } from "../ui";
import type { AppUpdate } from "./useAppUpdate";
import { autoSendEnabled, setAutoSend } from "../../telemetry";
import { useT, type MessageKey } from "../../i18n";

const DEVICES: { id: string; titleKey: MessageKey; icon: React.ElementType }[] = [
  { id: "kb884l", titleKey: "device.kb884l", icon: Keyboard },
  { id: "fuxi-h7", titleKey: "device.fuxi", icon: Headphones },
];

export const AUTO_CHECK_PREF = "updates.autoCheck";

interface UpdatesViewProps {
  app: AppUpdate;
  devices: DetectedDeviceStatus[];
  check: FirmwareUpdateCheck | null;
  checking: boolean;
  checkError: string | null;
  lastChecked: Date | null;
  onCheck: () => void;
  onInstall: (update: FirmwareUpdate) => void;
}

const formatSize = (bytes: number) =>
  `${(bytes / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  app,
  devices,
  check,
  checking,
  checkError,
  lastChecked,
  onCheck,
  onInstall,
}) => {
  const { t, lang } = useT();
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [autoCheck, setAutoCheck] = useState(() => readPref(AUTO_CHECK_PREF, true));
  const [shareReports, setShareReports] = useState(autoSendEnabled);
  const updates = check?.updates ?? [];
  const a = app.state;
  const appBusy = a.phase === "downloading";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p role="status" aria-live="polite" className="m-0 text-xs text-secondary">
          {checking
            ? t("updates.checking")
            : lastChecked
              ? t("updates.lastChecked", { time: lastChecked.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) })
              : t("updates.notChecked")}
        </p>
        <Button onClick={onCheck} disabled={checking || appBusy}>
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`}
          />
          {t("updates.checkNow")}
        </Button>
      </div>

      {checkError && (
        <Notice tone="error" title={t("updates.checkFailed")}>
          {checkError}
        </Notice>
      )}

      {check && !check.supported && (
        <Notice tone="info" title={t("updates.fwUnavailable.title")}>
          {t("updates.fwUnavailable.body")}
        </Notice>
      )}

      <Section
        title={t("updates.app.title")}
        footer={
          a.phase === "available" || a.phase === "downloading" || a.phase === "ready"
            ? t("updates.app.footerActive")
            : t("updates.app.footerIdle")
        }
      >
        <Row
          label={t("common.version", { version: appVersion })}
          description={
            a.phase === "checking"
              ? t("updates.app.checking")
              : a.phase === "up-to-date"
                ? t("updates.app.upToDate")
                : a.phase === "available"
                  ? `${t("updates.app.available", { version: a.version ?? "" })}${a.released ? ` · ${a.released.slice(0, 10)}` : ""}`
                  : a.phase === "downloading"
                    ? a.progress === null
                      ? t("updates.app.downloading")
                      : t("updates.app.downloadingPct", { pct: a.progress })
                    : a.phase === "ready"
                      ? t("updates.app.ready", { version: a.version ?? "" })
                      : a.phase === "error"
                        ? t("updates.app.failed", { error: a.error ?? "" })
                        : t("updates.notChecked")
          }
        >
          {a.phase === "available" && (
            <Button variant="primary" onClick={app.install}>
              {t("updates.app.install")}
            </Button>
          )}
          {a.phase === "downloading" && (
            <progress
              aria-label={t("updates.app.progress")}
              className="h-1.5 w-[160px]"
              max={100}
              value={a.progress ?? undefined}
            />
          )}
          {a.phase === "ready" && (
            <Button variant="primary" onClick={app.restart}>
              {t("updates.app.relaunch")}
            </Button>
          )}
          {a.phase === "error" && <Button onClick={app.check}>{t("common.tryAgain")}</Button>}
        </Row>
        {a.notes && (a.phase === "available" || a.phase === "downloading" || a.phase === "ready") && (
          <div className="px-3.5 py-3">
            <span className="text-xs font-semibold text-secondary">{t("updates.notes")}</span>
            <p className="m-0 mt-1 text-xs leading-4 whitespace-pre-line text-secondary">{a.notes}</p>
          </div>
        )}
      </Section>

      {updates.length > 0 && (
        <Section
          title={t("updates.available.title")}
          footer={
            <span className="flex items-center gap-1.5">
              <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 flex-none text-warning" />
              {t("updates.available.footer")}
            </span>
          }
        >
          {updates.map((u) => {
            const notesOpen = openNotes === u.device_id;
            const notesId = `notes-${u.device_id}`;
            return (
              <div key={u.device_id} className="flex flex-col">
                <div className="flex min-h-14 flex-wrap items-center gap-3 px-3.5 py-2">
                  <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                    <span className="font-semibold">
                      {t("updates.fw.row", { device: u.device_name, version: u.version })}
                    </span>
                    <span className="text-xs leading-[15px] text-secondary">
                      {t("updates.fw.meta", { current: u.current_version ?? t("updates.unknown"), size: formatSize(u.size_bytes), date: u.released })}
                    </span>
                  </span>
                  <Button
                    variant="plain"
                    aria-expanded={notesOpen}
                    aria-controls={notesId}
                    onClick={() => setOpenNotes(notesOpen ? null : u.device_id)}
                  >
                    {notesOpen ? t("updates.hideNotes") : t("updates.notes")}
                  </Button>
                  <Button variant="primary" onClick={() => onInstall(u)}>
                    {t("updates.update")}
                  </Button>
                </div>
                {notesOpen && (
                  <ul id={notesId} className="m-0 flex list-disc flex-col gap-1 px-3.5 pb-3 pl-9 text-xs leading-4 text-secondary">
                    {u.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </Section>
      )}

      <Section title={t("updates.installed.title")}>
        {DEVICES.map(({ id, titleKey, icon: Icon }) => {
          const d = devices.find((x) => x.id === id);
          const pending = updates.some((u) => u.device_id === id);
          const upToDate = check?.supported && d?.connected && !pending;
          return (
            <div key={id} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
                <Icon aria-hidden="true" className="h-5 w-5 text-label" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{t(titleKey)}</span>
                <span className="text-xs leading-[15px] text-secondary">
                  {d?.firmware_version ? t("common.version", { version: d.firmware_version }) : t("common.versionUnknown")}
                </span>
              </span>
              {upToDate ? (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                  {t("updates.upToDate")}
                </span>
              ) : pending ? (
                <span className="text-xs text-accent-text">{t("updates.updateAvailable")}</span>
              ) : (
                <ConnectionLabel connected={d?.connected ?? false} />
              )}
            </div>
          );
        })}
      </Section>

      <Section title={t("updates.settings.title")}>
        <Row
          label={t("updates.autoCheck")}
          description={t("updates.autoCheck.desc")}
        >
          <Switch
            label={t("updates.autoCheck")}
            checked={autoCheck}
            onChange={(v) => {
              setAutoCheck(v);
              writePref(AUTO_CHECK_PREF, v);
            }}
          />
        </Row>
        <Row
          label={t("updates.share")}
          description={t("updates.share.desc")}
        >
          <Switch
            label={t("updates.share")}
            checked={shareReports}
            onChange={(v) => {
              setShareReports(v);
              setAutoSend(v);
            }}
          />
        </Row>
      </Section>
    </>
  );
};
