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
  { id: "kb884l", title: "KB884L Klavye", icon: Keyboard },
  { id: "fuxi-h7", title: "Fuxi-H7 Kulaklık", icon: Headphones },
];

export const DevicesView: React.FC<DevicesViewProps> = ({ devices, loading, scanError, onOpen, updateCount }) => {
  const scanned = devices.length > 0;
  const [updateDismissed, setUpdateDismissed] = React.useState(false);
  return (
    <>
      {scanError && (
        <Notice tone="error" title="Cihazlar taranamadı">
          {scanError} · USB bağlantısını kontrol edip “Cihazları tara”ya bas.
        </Notice>
      )}

      {updateCount > 0 && !updateDismissed && (
        <Notice
          tone="info"
          title={updateCount === 1 ? "Firmware güncellemesi hazır" : `${updateCount} firmware güncellemesi hazır`}
          actions={
            <>
              <Button onClick={() => setUpdateDismissed(true)}>Daha sonra</Button>
              <Button variant="primary" onClick={() => onOpen("updates")}>
                Güncellemelere git
              </Button>
            </>
          }
        >
          Güncelleme sırasında cihaz yaklaşık 1 dakika yanıt vermez.
        </Notice>
      )}

      <Section
        title="Cihazlar"
        footer="Yeni bir Havit cihazı taktığında birkaç saniye içinde otomatik olarak burada görünür."
      >
        {KNOWN.map(({ id, title, icon: Icon }) => {
          const d = devices.find((x) => x.id === id);
          const connected = d?.connected ?? false;
          const description = !scanned
            ? loading
              ? "Taranıyor…"
              : "Henüz taranmadı"
            : connected
              ? [d?.connection_type, d?.firmware_version && `Sürüm ${d.firmware_version}`]
                  .filter(Boolean)
                  .join(" · ")
              : "Bağlı değil";
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
        Havit Console bağımsız, açık kaynaklı bir topluluk projesidir; Havit ile bağlantılı değildir.
      </p>
    </>
  );
};
