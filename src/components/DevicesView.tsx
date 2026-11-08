import React, { useState } from "react";
import { FlaskConical, Headphones, Keyboard, Usb } from "lucide-react";
import type { DetectedDeviceStatus } from "../types";
import type { View } from "./Sidebar";
import { CompatibilityReport } from "./CompatibilityReport";
import { Button, ConnectionLabel, NavRow, Notice, Section } from "./ui";

interface DevicesViewProps {
  devices: DetectedDeviceStatus[];
  loading: boolean;
  scanError: string | null;
  onOpen: (view: View) => void;
  updateCount: number;
}

const KNOWN: { id: "kb884l" | "fuxi-h7"; title: string; icon: React.ElementType }[] = [
  { id: "kb884l", title: "KB884L Keyboard", icon: Keyboard },
  { id: "fuxi-h7", title: "Fuxi-H7 Headset", icon: Headphones },
];

export const BetaBadge: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={`inline-flex h-[18px] items-center rounded-full bg-fill px-1.5 text-[10px] font-semibold tracking-wide text-accent-text uppercase ${className ?? ""}`}
  >
    Beta
  </span>
);

export const DevicesView: React.FC<DevicesViewProps> = ({ devices, loading, scanError, onOpen, updateCount }) => {
  const scanned = devices.length > 0;
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [report, setReport] = useState<{ open: boolean; deviceId?: string }>({ open: false });

  const others = devices.filter((d) => d.support !== "verified");

  return (
    <>
      {scanError && (
        <Notice tone="error" title="Couldn’t scan devices">
          {scanError} · Check the USB connection and choose “Scan devices”.
        </Notice>
      )}

      {updateCount > 0 && !updateDismissed && (
        <Notice
          tone="info"
          title={updateCount === 1 ? "Firmware update available" : `${updateCount} firmware updates available`}
          actions={
            <>
              <Button onClick={() => setUpdateDismissed(true)}>Later</Button>
              <Button variant="primary" onClick={() => onOpen("updates")}>
                Go to Updates
              </Button>
            </>
          }
        >
          The device stops responding for about a minute while it updates.
        </Notice>
      )}

      <Section
        title="Devices"
        footer="A newly connected Havit device appears here within a few seconds."
      >
        {KNOWN.map(({ id, title, icon: Icon }) => {
          const d = devices.find((x) => x.id === id);
          const connected = d?.connected ?? false;
          const description = !scanned
            ? loading
              ? "Scanning…"
              : "Not scanned yet"
            : connected
              ? [d?.connection_type, d?.firmware_version && `Version ${d.firmware_version}`]
                  .filter(Boolean)
                  .join(" · ")
              : "Not connected";
          return (
            <NavRow
              key={id}
              icon={<Icon aria-hidden="true" className="h-5 w-5 text-label" />}
              title={title}
              description={description}
              trailing={<ConnectionLabel connected={connected} />}
              onClick={() => onOpen(id)}
            />
          );
        })}
      </Section>

      {others.length > 0 && (
        <Section
          title="Other Havit devices"
          footer="These devices are recognized but have no tested driver yet. A compatibility report tells us what to build next."
        >
          {others.map((d) => (
            <div key={d.id} className="flex min-h-14 flex-wrap items-center gap-3 px-3.5 py-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
                <Usb aria-hidden="true" className="h-5 w-5 text-label" />
              </span>
              <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-semibold">
                  {d.name}
                  <BetaBadge />
                </span>
                <span className="text-xs leading-[15px] text-secondary">
                  {d.support === "experimental" ? "Identified, not tested yet" : "Unrecognized Havit device"} ·{" "}
                  {d.vid_hex}:{d.pid_hex}
                  {d.firmware_version ? ` · Version ${d.firmware_version}` : ""}
                </span>
              </span>
              <Button onClick={() => setReport({ open: true, deviceId: d.id })}>Report compatibility…</Button>
            </div>
          ))}
        </Section>
      )}

      <Section
        title="Open beta"
        footer="Havit Console is an independent, open-source community project. It is not affiliated with Havit."
      >
        <div className="flex min-h-14 flex-wrap items-center gap-3 px-3.5 py-2">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
            <FlaskConical aria-hidden="true" className="h-5 w-5 text-accent-text" />
          </span>
          <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
            <span className="font-semibold">Help test more devices</span>
            <span className="text-xs leading-[15px] text-secondary">
              Only the KB884L and Fuxi-H7 are verified. Tell us what works on yours; nothing is sent
              without you seeing and submitting it.
            </span>
          </span>
          <Button onClick={() => setReport({ open: true })}>Report compatibility…</Button>
        </div>
      </Section>

      <CompatibilityReport
        open={report.open}
        onClose={() => setReport({ open: false })}
        devices={devices}
        deviceId={report.deviceId}
      />
    </>
  );
};
