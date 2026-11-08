import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import type { DetectedDeviceStatus, PacketLogEntry } from "../types";
import { fetchPacketLogs, openExternal } from "../api";
import {
  autoSendEnabled,
  buildReportBody,
  makePayload,
  sendReport,
  type SendResult,
} from "../telemetry";
import { REPO_URL } from "./Sidebar";
import { useT } from "../i18n";
import { Button, InlineStatus, Sheet, type StatusMessage } from "./ui";

/** GitHub rejects very long URLs; the draft path keeps the body under this. */
const MAX_URL_BODY = 6000;

/**
 * Manual compatibility report. With sharing enabled it goes to the relay directly; otherwise
 * it opens as a prefilled GitHub issue draft that the user reviews and submits. Either way the
 * full text is shown first.
 */
export const CompatibilityReport: React.FC<{
  open: boolean;
  onClose: () => void;
  devices: DetectedDeviceStatus[];
  /** Pre-select one device; otherwise every detected device is listed. */
  deviceId?: string;
}> = ({ open, onClose, devices, deviceId }) => {
  const { t } = useT();
  const [notes, setNotes] = useState("");
  const [includeLog, setIncludeLog] = useState(false);
  const [logs, setLogs] = useState<PacketLogEntry[] | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [sent, setSent] = useState<SendResult | null>(null);
  const direct = autoSendEnabled();

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setIncludeLog(false);
    setLogs(null);
    setStatus(null);
    setSent(null);
  }, [open]);

  useEffect(() => {
    if (!includeLog) {
      setLogs(null);
      return;
    }
    fetchPacketLogs()
      .then(setLogs)
      .catch(() => setLogs([]));
  }, [includeLog]);

  const selected = useMemo(
    () => (deviceId ? devices.filter((d) => d.id === deviceId) : devices),
    [devices, deviceId]
  );
  const body = buildReportBody({ devices: selected, notes, logs: includeLog ? logs : null });
  const title = t("report.subject", { devices: selected.map((d) => d.name).join(", ") || t("device.generic") });

  const openDraft = () => {
    let draft = body;
    if (draft.length > MAX_URL_BODY) draft = draft.slice(0, MAX_URL_BODY - 40) + "\n…(log truncated)\n```";
    const url = `${REPO_URL}/issues/new?labels=${encodeURIComponent("compatibility,beta")}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(draft)}`;
    void openExternal(url);
  };

  const send = async () => {
    setSending(true);
    setStatus(null);
    const payload = await makePayload(
      "manual",
      { devices: selected, notes, logs: includeLog ? logs : null, logDetail: "full" },
      `manual:${Date.now()}:${title}`
    );
    const res = await sendReport(payload);
    setSending(false);
    setSent(res);
    setStatus(
      res.ok
        ? { tone: "success", text: res.deduplicated ? t("report.okDedup") : t("report.ok") }
        : { tone: "error", text: t("report.fail", { error: res.error ?? "" }) }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy="cr-title" describedBy="cr-desc" className="w-[680px]">
      <div className="flex max-h-[calc(100vh-80px)] flex-col">
        <div className="flex flex-col gap-1.5 px-6 pt-6 pb-4">
          <h2 id="cr-title" className="m-0 text-[17px] leading-[22px] font-bold">
            {t("report.title")}
          </h2>
          <p id="cr-desc" className="m-0 text-xs leading-4 text-secondary">
            {direct ? t("report.desc.direct") : t("report.desc.draft")}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-secondary">{t("report.notes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("report.notes.placeholder")}
              className="w-full resize-y rounded-md border border-control-border bg-control px-2.5 py-1.5 text-[13px] text-label placeholder:text-tertiary"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] select-none">
            <input type="checkbox" checked={includeLog} onChange={(e) => setIncludeLog(e.target.checked)} />
            {t("report.includeLog", { count: 40 })}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-secondary">{t("report.preview")}</span>
            <pre className="m-0 max-h-[260px] overflow-auto rounded-md border border-separator bg-window p-3 text-[11px] leading-4 whitespace-pre-wrap text-secondary">
              {body}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-separator px-6 py-4">
          <InlineStatus message={status} />
          {sent?.ok && sent.url && (
            <Button onClick={() => openExternal(sent.url!)}>
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              {t("report.view")}
            </Button>
          )}
          <Button onClick={onClose}>{sent?.ok ? t("common.done") : t("common.cancel")}</Button>
          {direct && !sent?.ok && (
            <Button variant="primary" onClick={send} disabled={sending}>
              <Send aria-hidden="true" className="h-4 w-4" />
              {sending ? t("report.sending") : t("report.send")}
            </Button>
          )}
          {(!direct || (sent && !sent.ok)) && (
            <Button variant={direct ? "default" : "primary"} onClick={openDraft}>
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              {t("report.draft")}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
};
