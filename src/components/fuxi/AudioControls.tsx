import React from "react";
import { Volume1 } from "lucide-react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { Button, Row, Section, Segmented, Slider, Switch } from "../ui";

import type { RoomSize } from "../../types";
import { useT, type MessageKey } from "../../i18n";
export type { RoomSize };

const ROOMS: { id: RoomSize; labelKey: MessageKey }[] = [
  { id: "small", labelKey: "headset.room.small" },
  { id: "medium", labelKey: "headset.room.medium" },
  { id: "large", labelKey: "headset.room.large" },
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
  const { t } = useT();
  const balancePos = Math.round(
    posFromBalance(status.left_balance, status.right_balance),
  );
  return (
    <Section
      title={t("headset.sound.title")}
      footer={
        status.speaker_found
          ? t("headset.sound.output", { name: status.speaker_name })
          : t("headset.sound.waiting")
      }
    >
      <Row label={t("headset.volume")} htmlFor="fx-vol">
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
              status.speaker_muted ? t("headset.muted") : `${status.speaker_volume}%`
            }
          />
        </span>
      </Row>

      <Row label={t("headset.mute")}>
        <Switch
          label={t("headset.mute")}
          checked={status.speaker_muted}
          onChange={(muted) => onVolumeChange(status.speaker_volume, muted)}
        />
      </Row>

      <Row
        label={t("headset.balance")}
        description={
          balancePos === 50
            ? t("headset.balance.centered")
            : balancePos < 50
              ? t("headset.balance.left", { pct: status.right_balance })
              : t("headset.balance.right", { pct: status.left_balance })
        }
        htmlFor="fx-bal"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-secondary">L</span>
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
          <span className="text-xs text-secondary">R</span>
          <Button
            onClick={() => onBalanceChange(100, 100)}
            disabled={balancePos === 50}
          >
            {t("headset.balance.center")}
          </Button>
        </span>
      </Row>

      <Row
        label={t("headset.surround")}
        description={t("headset.surround.desc")}
        strong
      >
        <Switch
          label={t("headset.surround")}
          checked={surround71}
          onChange={onSurroundChange}
        />
      </Row>

      {surround71 && (
        <Row
          label={t("headset.room")}
          description={t("headset.room.desc")}
        >
          <Segmented
            label={t("headset.room")}
            options={ROOMS.map((r) => ({ id: r.id, label: t(r.labelKey) }))}
            value={roomSize}
            onChange={onRoomSizeChange}
          />
        </Row>
      )}
    </Section>
  );
};
