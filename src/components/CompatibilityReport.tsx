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
  const title = `Compatibility: ${selected.map((d) => d.name).join(", ") || "Havit device"}`;

  const openDraft = () => {
    let draft = body;
    if (draft.length > MAX_URL_BODY) draft = draft.slice(0, MAX_URL_BODY - 40) + "\n…(log truncated)\n```";
    const url = `${REPO_URL}/issues/new?labels=${encodeURIComponent("compatibility,beta")}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(draft)}`;
    void openExternal(url);
  };

  const send = async () => {
    setSending(true);
    setStatus(null);
    const payload = await makePayload("manual", title, body, `manual:${Date.now()}:${title}`);
    const res = await sendReport(payload);
    setSending(false);
    setSent(res);
    setStatus(
      res.ok
        ? { tone: "success", text: res.deduplicated ? "Thanks — added to an existing report." : "Thanks — report filed." }
        : { tone: "error", text: `Couldn’t send: ${res.error}. You can open it as a GitHub draft instead.` }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy="cr-title" describedBy="cr-desc" className="w-[680px]">
      <div className="flex max-h-[calc(100vh-80px)] flex-col">
        <div className="flex flex-col gap-1.5 px-6 pt-6 pb-4">
          <h2 id="cr-title" className="m-0 text-[17px] leading-[22px] font-bold">
            Report device compatibility
          </h2>
          <p id="cr-desc" className="m-0 text-xs leading-4 text-secondary">
            {direct
              ? "This is exactly what will be sent. It is filed as a public GitHub issue; remove anything you don’t want to share."
              : "Nothing is sent automatically. The report opens as a GitHub issue draft in your browser; review it there and submit it with your own account."}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-secondary">What did you try, and what happened?</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Lighting applied fine; the screen upload failed with “timed out”."
              className="w-full resize-y rounded-md border border-control-border bg-control px-2.5 py-1.5 text-[13px] text-label placeholder:text-tertiary"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] select-none">
            <input type="checkbox" checked={includeLog} onChange={(e) => setIncludeLog(e.target.checked)} />
            Include the last 40 diagnostics entries (packets exchanged with the devices)
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-secondary">Report preview</span>
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
              View issue
            </Button>
          )}
          <Button onClick={onClose}>{sent?.ok ? "Done" : "Cancel"}</Button>
          {direct && !sent?.ok && (
            <Button variant="primary" onClick={send} disabled={sending}>
              <Send aria-hidden="true" className="h-4 w-4" />
              {sending ? "Sending…" : "Send report"}
            </Button>
          )}
          {(!direct || (sent && !sent.ok)) && (
            <Button variant={direct ? "default" : "primary"} onClick={openDraft}>
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Open GitHub issue draft
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
};
