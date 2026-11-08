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
    title="Mikrofon"
    footer={status.mic_found ? `Giriş aygıtı: ${status.mic_name}` : "Mikrofon bulunamadı."}
  >
    <Row label="Kazanç" htmlFor="fx-mic">
      <Slider
        id="fx-mic"
        min={0}
        max={100}
        value={status.mic_volume}
        disabled={status.mic_muted}
        onChange={(e) => onMicChange(Number(e.target.value), status.mic_muted)}
        valueText={status.mic_muted ? "Sessiz" : `%${status.mic_volume}`}
      />
    </Row>

    <Row label="Mikrofonu sessize al">
      <Switch
        label="Mikrofonu sessize al"
        checked={status.mic_muted}
        onChange={(muted) => onMicChange(status.mic_volume, muted)}
      />
    </Row>

    <Row label="Gürültü engelleme (ENC)" description="Klavye tıkırtısını ve ortam gürültüsünü bastırır">
      <Switch label="Gürültü engelleme" checked={encEnabled} onChange={onEncChange} />
    </Row>

    <Row label="Yan ton" description="Konuşurken kendi sesini kulaklıktan duyarsın">
      <Switch label="Yan ton" checked={sidetoneEnabled} onChange={onSidetoneChange} />
    </Row>
  </Section>
);
