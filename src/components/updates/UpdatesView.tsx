import React, { useState } from "react";
import { AlertTriangle, Check, Headphones, Keyboard, RefreshCw } from "lucide-react";
import { version as appVersion } from "../../../package.json";
import type { DetectedDeviceStatus, FirmwareUpdate, FirmwareUpdateCheck } from "../../types";
import { Button, ConnectionLabel, Notice, readPref, Row, Section, Switch, writePref } from "../ui";
import type { AppUpdate } from "./useAppUpdate";

const DEVICES: { id: string; title: string; icon: React.ElementType }[] = [
  { id: "kb884l", title: "KB884L Keyboard", icon: Keyboard },
  { id: "fuxi-h7", title: "Fuxi-H7 Headset", icon: Headphones },
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
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [autoCheck, setAutoCheck] = useState(() => readPref(AUTO_CHECK_PREF, true));
  const updates = check?.updates ?? [];
  const a = app.state;
  const appBusy = a.phase === "downloading";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p role="status" aria-live="polite" className="m-0 text-xs text-secondary">
          {checking
            ? "Checking for updates…"
            : lastChecked
              ? `Last checked ${lastChecked.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
              : "Not checked yet"}
        </p>
        <Button onClick={onCheck} disabled={checking || appBusy}>
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`}
          />
          Check now
        </Button>
      </div>

      {checkError && (
        <Notice tone="error" title="Couldn’t check for updates">
          {checkError}
        </Notice>
      )}

      {check && !check.supported && (
        <Notice tone="info" title="Firmware updates aren’t available yet">
          This version has no firmware source. Installed firmware versions are listed below.
        </Notice>
      )}

      <Section
        title="Havit Console"
        footer={
          a.phase === "available" || a.phase === "downloading" || a.phase === "ready"
            ? "The update is downloaded from the signed GitHub release; the app relaunches when installation finishes."
            : "App updates are delivered through GitHub Releases."
        }
      >
        <Row
          label={`Version ${appVersion}`}
          description={
            a.phase === "checking"
              ? "Checking…"
              : a.phase === "up-to-date"
                ? "Up to date"
                : a.phase === "available"
                  ? `Version ${a.version} available${a.released ? ` · ${a.released.slice(0, 10)}` : ""}`
                  : a.phase === "downloading"
                    ? a.progress === null
                      ? "Downloading…"
                      : `Downloading… ${a.progress}%`
                    : a.phase === "ready"
                      ? `${a.version} installed; relaunch to finish`
                      : a.phase === "error"
                        ? `Update failed: ${a.error}`
                        : "Not checked yet"
          }
        >
          {a.phase === "available" && (
            <Button variant="primary" onClick={app.install}>
              Download and install
            </Button>
          )}
          {a.phase === "downloading" && (
            <progress
              aria-label="Download progress"
              className="h-1.5 w-[160px]"
              max={100}
              value={a.progress ?? undefined}
            />
          )}
          {a.phase === "ready" && (
            <Button variant="primary" onClick={app.restart}>
              Relaunch
            </Button>
          )}
          {a.phase === "error" && <Button onClick={app.check}>Try again</Button>}
        </Row>
        {a.notes && (a.phase === "available" || a.phase === "downloading" || a.phase === "ready") && (
          <div className="px-3.5 py-3">
            <span className="text-xs font-semibold text-secondary">Release notes</span>
            <p className="m-0 mt-1 text-xs leading-4 whitespace-pre-line text-secondary">{a.notes}</p>
          </div>
        )}
      </Section>

      {updates.length > 0 && (
        <Section
          title="Available updates"
          footer={
            <span className="flex items-center gap-1.5">
              <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 flex-none text-warning" />
              Don’t unplug the device or put the computer to sleep during the update.
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
                      {u.device_name} firmware {u.version}
                    </span>
                    <span className="text-xs leading-[15px] text-secondary">
                      Installed: {u.current_version ?? "unknown"} · {formatSize(u.size_bytes)} · Released: {u.released}
                    </span>
                  </span>
                  <Button
                    variant="plain"
                    aria-expanded={notesOpen}
                    aria-controls={notesId}
                    onClick={() => setOpenNotes(notesOpen ? null : u.device_id)}
                  >
                    {notesOpen ? "Hide notes" : "Release notes"}
                  </Button>
                  <Button variant="primary" onClick={() => onInstall(u)}>
                    Update…
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

      <Section title="Installed versions">
        {DEVICES.map(({ id, title, icon: Icon }) => {
          const d = devices.find((x) => x.id === id);
          const pending = updates.some((u) => u.device_id === id);
          const upToDate = check?.supported && d?.connected && !pending;
          return (
            <div key={id} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
                <Icon aria-hidden="true" className="h-5 w-5 text-label" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{title}</span>
                <span className="text-xs leading-[15px] text-secondary">
                  {d?.firmware_version ? `Version ${d.firmware_version}` : "Version unknown"}
                </span>
              </span>
              {upToDate ? (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                  Up to date
                </span>
              ) : pending ? (
                <span className="text-xs text-accent-text">Update available</span>
              ) : (
                <ConnectionLabel connected={d?.connected ?? false} />
              )}
            </div>
          );
        })}
      </Section>

      <Section title="Settings">
        <Row
          label="Check for updates automatically"
          description="Checks when the app opens; no device information is sent"
        >
          <Switch
            label="Check for updates automatically"
            checked={autoCheck}
            onChange={(v) => {
              setAutoCheck(v);
              writePref(AUTO_CHECK_PREF, v);
            }}
          />
        </Row>
      </Section>
    </>
  );
};
