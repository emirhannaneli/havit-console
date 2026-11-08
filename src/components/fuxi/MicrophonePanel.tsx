import React from "react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { Row, Section, Slider, Switch } from "../ui";
import { useT } from "../../i18n";

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
}) => {
  const { t } = useT();
  return (
  <Section
    title={t("headset.mic.title")}
    footer={status.mic_found ? t("headset.mic.input", { name: status.mic_name }) : t("headset.mic.notFound")}
  >
    <Row label={t("headset.mic.gain")} htmlFor="fx-mic">
      <Slider
        id="fx-mic"
        min={0}
        max={100}
        value={status.mic_volume}
        disabled={status.mic_muted}
        onChange={(e) => onMicChange(Number(e.target.value), status.mic_muted)}
        valueText={status.mic_muted ? t("headset.muted") : `${status.mic_volume}%`}
      />
    </Row>

    <Row label={t("headset.mic.mute")}>
      <Switch
        label={t("headset.mic.mute")}
        checked={status.mic_muted}
        onChange={(muted) => onMicChange(status.mic_volume, muted)}
      />
    </Row>

    <Row label={t("headset.mic.enc")} description={t("headset.mic.enc.desc")}>
      <Switch label={t("headset.mic.enc.aria")} checked={encEnabled} onChange={onEncChange} />
    </Row>

    <Row label={t("headset.mic.sidetone")} description={t("headset.mic.sidetone.desc")}>
      <Switch label={t("headset.mic.sidetone")} checked={sidetoneEnabled} onChange={onSidetoneChange} />
    </Row>
  </Section>
  );
};
