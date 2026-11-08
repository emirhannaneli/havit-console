import React, { useState } from "react";
import { Headphones, Keyboard, Mic, Mouse, Sparkles, Usb } from "lucide-react";
import type { DetectedDeviceStatus, DeviceCategory } from "../types";
import type { View } from "./Sidebar";
import { useT, type MessageKey } from "../i18n";
import { CompatibilityReport } from "./CompatibilityReport";
import { Button, ConnectionLabel, NavRow, Notice, Section } from "./ui";

const categoryIcon = (category: DeviceCategory): React.ElementType => {
  switch (category) {
    case "keyboard":
      return Keyboard;
    case "headset":
      return Headphones;
    case "mouse":
      return Mouse;
    case "microphone":
      return Mic;
    default:
      return Usb;
  }
};

interface DevicesViewProps {
  devices: DetectedDeviceStatus[];
  loading: boolean;
  scanError: string | null;
  onOpen: (view: View) => void;
  updateCount: number;
}

const KNOWN: { id: "kb884l" | "fuxi-h7"; titleKey: MessageKey; icon: React.ElementType }[] = [
  { id: "kb884l", titleKey: "device.kb884l", icon: Keyboard },
  { id: "fuxi-h7", titleKey: "device.fuxi", icon: Headphones },
];

export const BetaBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useT();
  return (
    <span
      className={`inline-flex h-[18px] items-center rounded-full bg-fill px-1.5 text-[10px] font-semibold tracking-wide text-accent-text uppercase ${className ?? ""}`}
    >
      {t("common.beta")}
    </span>
  );
};

export const DevicesView: React.FC<DevicesViewProps> = ({ devices, loading, scanError, onOpen, updateCount }) => {
  const { t, tp } = useT();
  // Map raw connection strings to localized user-friendly labels.
  // Any technical hardware annotations like (HID 0xFF13 + 0xFF68) are stripped.
  const connectionLabel = (raw?: string) => {
    if (!raw) return "";
    const clean = raw.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
    if (clean.includes("wireless") || clean.includes("kablosuz") || clean.includes("receiver") || clean.includes("alıcı")) {
      return t("devices.conn.wireless");
    }
    if (clean.includes("usb") || clean.includes("wired") || clean.includes("kablolu")) {
      return t("devices.conn.usb");
    }
    return raw.replace(/\s*\([^)]*\)/g, "").trim();
  };
  const scanned = devices.length > 0;
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [report, setReport] = useState<{ open: boolean; deviceId?: string }>({ open: false });

  const others = devices.filter((d) => d.support !== "verified");

  return (
    <>
      {scanError && (
        <Notice tone="error" title={t("devices.scanError.title")}>
          {t("devices.scanError.body", { error: scanError })}
        </Notice>
      )}

      {updateCount > 0 && !updateDismissed && (
        <Notice
          tone="info"
          title={tp("devices.fwNotice.title", updateCount)}
          actions={
            <>
              <Button onClick={() => setUpdateDismissed(true)}>{t("common.later")}</Button>
              <Button variant="primary" onClick={() => onOpen("updates")}>
                {t("devices.fwNotice.go")}
              </Button>
            </>
          }
        >
          {t("devices.fwNotice.body")}
        </Notice>
      )}

      <Section title={t("devices.section.title")} footer={t("devices.section.footer")}>
        {KNOWN.map(({ id, titleKey, icon: Icon }) => {
          const d = devices.find((x) => x.id === id);
          const connected = d?.connected ?? false;
          const description = !scanned
            ? loading
              ? t("app.scanning")
              : t("devices.notScanned")
            : connected
              ? [connectionLabel(d?.connection_type), d?.firmware_version && t("common.version", { version: d.firmware_version })]
                  .filter(Boolean)
                  .join(" · ")
              : t("common.notConnected");
          return (
            <NavRow
              key={id}
              icon={<Icon aria-hidden="true" className="h-5 w-5 text-label" />}
              title={t(titleKey)}
              description={description}
              trailing={<ConnectionLabel connected={connected} />}
              onClick={() => onOpen(id)}
            />
          );
        })}
      </Section>

      {others.length > 0 && (
        <Section title={t("devices.others.title")} footer={t("devices.others.footer")}>
          {others.map((d) => {
            const DevIcon = categoryIcon(d.category);
            return (
              <div key={d.id} className="flex min-h-14 flex-wrap items-center gap-3 px-3.5 py-2">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
                  <DevIcon aria-hidden="true" className="h-5 w-5 text-label" />
                </span>
                <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-semibold">
                    {d.name}
                  </span>
                  <span className="text-xs leading-[15px] text-secondary">
                    {[connectionLabel(d.connection_type), d.support === "experimental" ? t("devices.others.experimental") : t("devices.others.unknown"), d.firmware_version && t("common.version", { version: d.firmware_version })].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Button onClick={() => setReport({ open: true, deviceId: d.id })}>{t("devices.report")}</Button>
              </div>
            );
          })}
        </Section>
      )}

      <Section title={t("devices.beta.title")} footer={t("devices.beta.footer")}>
        <div className="flex min-h-14 flex-wrap items-center gap-3 px-3.5 py-2">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-accent-text" />
          </span>
          <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
            <span className="font-semibold">{t("devices.beta.help")}</span>
            <span className="text-xs leading-[15px] text-secondary">{t("devices.beta.helpBody")}</span>
          </span>
          <Button onClick={() => setReport({ open: true })}>{t("devices.report")}</Button>
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
