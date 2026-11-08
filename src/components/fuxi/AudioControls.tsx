import React from "react";
import { Volume1 } from "lucide-react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { Button, Row, Section, Segmented, Slider, Switch } from "../ui";

import type { RoomSize } from "../../types";
export type { RoomSize };

const ROOMS: { id: RoomSize; label: string }[] = [
  { id: "small", label: "Küçük oda" },
  { id: "medium", label: "Salon" },
  { id: "large", label: "Konser salonu" },
];

/**
 * Slider position 0..100 (50 = centre) <-> per-channel balance (100 = unattenuated).
 * Moving right attenuates the left channel and vice versa; the louder side stays at 100.
 */
const balanceFromPos = (pos: number): [number, number] => [
  100 - Math.max(0, (pos - 50) * 2),
  100 - Math.max(0, (50 - pos) * 2),
];

const posFromBalance = (left: number, right: number) =>
  left < right ? 50 + (100 - left) / 2 : 50 - (100 - right) / 2;

interface AudioControlsProps {
  status: FuxiAudioEndpointStatus;
  onVolumeChange: (vol: number, muted: boolean) => void;
  onBalanceChange: (left: number, right: number) => void;
  surround71: boolean;
  onSurroundChange: (enabled: boolean) => void;
  roomSize: RoomSize;
  onRoomSizeChange: (size: RoomSize) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  status,
  onVolumeChange,
  onBalanceChange,
  surround71,
  onSurroundChange,
  roomSize,
  onRoomSizeChange,
}) => {
  const balancePos = Math.round(
    posFromBalance(status.left_balance, status.right_balance),
  );
  return (
    <Section
      title="Ses"
      footer={
        status.speaker_found
          ? `Çıkış aygıtı: ${status.speaker_name}`
          : "Ses aygıtı bekleniyor. Kulaklığın USB alıcısının takılı olduğundan emin ol."
      }
    >
      <Row label="Ses düzeyi" htmlFor="fx-vol">
        <span className="flex items-center gap-2">
          <Volume1 aria-hidden="true" className="h-3.5 w-3.5 text-secondary" />
          <Slider
            id="fx-vol"
            min={0}
            max={100}
            value={status.speaker_volume}
            disabled={status.speaker_muted}
            onChange={(e) =>
              onVolumeChange(Number(e.target.value), status.speaker_muted)
            }
            valueText={
              status.speaker_muted ? "Sessiz" : `%${status.speaker_volume}`
            }
          />
        </span>
      </Row>

      <Row label="Sesi kapat">
        <Switch
          label="Sesi kapat"
          checked={status.speaker_muted}
          onChange={(muted) => onVolumeChange(status.speaker_volume, muted)}
        />
      </Row>

      <Row
        label="Kanal dengesi"
        description={
          balancePos === 50
            ? "Ortada"
            : balancePos < 50
              ? `Sola kaydırıldı · sağ kulak %${status.right_balance}`
              : `Sağa kaydırıldı · sol kulak %${status.left_balance}`
        }
        htmlFor="fx-bal"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-secondary">Sol</span>
          <input
            id="fx-bal"
            type="range"
            min={0}
            max={100}
            value={balancePos}
            onChange={(e) => {
              const [left, right] = balanceFromPos(Number(e.target.value));
              onBalanceChange(left, right);
            }}
            className="h-6 w-[220px] max-w-[50vw]"
          />
          <span className="text-xs text-secondary">Sağ</span>
          <Button
            onClick={() => onBalanceChange(100, 100)}
            disabled={balancePos === 50}
          >
            Ortala
          </Button>
        </span>
      </Row>

      <Row
        label="7.1 sanal surround"
        description="Oyunlarda yön algısını artırır; müzikte kapalı tutman önerilir"
        strong
      >
        <Switch
          label="7.1 sanal surround"
          checked={surround71}
          onChange={onSurroundChange}
        />
      </Row>

      {surround71 && (
        <Row
          label="Oda büyüklüğü"
          description="Surround yankısının ne kadar geniş duyulacağı"
        >
          <Segmented
            label="Oda büyüklüğü"
            options={ROOMS}
            value={roomSize}
            onChange={onRoomSizeChange}
          />
        </Row>
      )}
    </Section>
  );
};
