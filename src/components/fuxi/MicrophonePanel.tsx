import React from "react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { Row, Section, Slider, Switch } from "../ui";

interface MicrophonePanelProps {
  status: FuxiAudioEndpointStatus;
  onMicChange: (vol: number, muted: boolean) => void;
  encEnabled: boolean;
  onEncChange: (enabled: boolean) => void;
  sidetoneEnabled: boolean;
  onSidetoneChange: (enabled: boolean) => void;
}

export const MicrophonePanel: React.FC<MicrophonePanelProps> = ({
  status,
  onMicChange,
  encEnabled,
  onEncChange,
  sidetoneEnabled,
  onSidetoneChange,
}) => (
  <Section
    title="Microphone"
    footer={status.mic_found ? `Input device: ${status.mic_name}` : "Microphone not found."}
  >
    <Row label="Gain" htmlFor="fx-mic">
      <Slider
        id="fx-mic"
        min={0}
        max={100}
        value={status.mic_volume}
        disabled={status.mic_muted}
        onChange={(e) => onMicChange(Number(e.target.value), status.mic_muted)}
        valueText={status.mic_muted ? "Muted" : `${status.mic_volume}%`}
      />
    </Row>

    <Row label="Mute microphone">
      <Switch
        label="Mute microphone"
        checked={status.mic_muted}
        onChange={(muted) => onMicChange(status.mic_volume, muted)}
      />
    </Row>

    <Row label="Noise cancelling (ENC)" description="Suppresses keyboard clatter and background noise">
      <Switch label="Noise cancelling" checked={encEnabled} onChange={onEncChange} />
    </Row>

    <Row label="Sidetone" description="Hear your own voice in the headset while you talk">
      <Switch label="Sidetone" checked={sidetoneEnabled} onChange={onSidetoneChange} />
    </Row>
  </Section>
);
