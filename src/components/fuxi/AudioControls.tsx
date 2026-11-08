import React from "react";
import { Volume1 } from "lucide-react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { Button, Row, Section, Segmented, Slider, Switch } from "../ui";

import type { RoomSize } from "../../types";
export type { RoomSize };

const ROOMS: { id: RoomSize; label: string }[] = [
  { id: "small", label: "Small room" },
  { id: "medium", label: "Living room" },
  { id: "large", label: "Concert hall" },
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
      title="Sound"
      footer={
        status.speaker_found
          ? `Output device: ${status.speaker_name}`
          : "Waiting for the audio device. Make sure the headset’s USB receiver is plugged in."
      }
    >
      <Row label="Volume" htmlFor="fx-vol">
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
              status.speaker_muted ? "Muted" : `${status.speaker_volume}%`
            }
          />
        </span>
      </Row>

      <Row label="Mute">
        <Switch
          label="Mute"
          checked={status.speaker_muted}
          onChange={(muted) => onVolumeChange(status.speaker_volume, muted)}
        />
      </Row>

      <Row
        label="Balance"
        description={
          balancePos === 50
            ? "Centered"
            : balancePos < 50
              ? `Shifted left · right ear ${status.right_balance}%`
              : `Shifted right · left ear ${status.left_balance}%`
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
            Center
          </Button>
        </span>
      </Row>

      <Row
        label="7.1 virtual surround"
        description="Improves directional cues in games; keep it off for music"
        strong
      >
        <Switch
          label="7.1 virtual surround"
          checked={surround71}
          onChange={onSurroundChange}
        />
      </Row>

      {surround71 && (
        <Row
          label="Room size"
          description="How wide the surround reverb sounds"
        >
          <Segmented
            label="Room size"
            options={ROOMS}
            value={roomSize}
            onChange={onRoomSizeChange}
          />
        </Row>
      )}
    </Section>
  );
};
