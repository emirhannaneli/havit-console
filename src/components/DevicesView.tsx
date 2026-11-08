import React from "react";
import { Headphones, Keyboard } from "lucide-react";
import type { DetectedDeviceStatus } from "../types";
import type { View } from "./Sidebar";
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

export const DevicesView: React.FC<DevicesViewProps> = ({ devices, loading, scanError, onOpen, updateCount }) => {
  const scanned = devices.length > 0;
  const [updateDismissed, setUpdateDismissed] = React.useState(false);
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

      <p className="m-0 px-1 text-[11px] leading-[14px] text-secondary">
        Havit Console is an independent, open-source community project. It is not affiliated with Havit.
      </p>
    </>
  );
};
