import React from "react";
import { Mic } from "lucide-react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { Row, Section, Slider, Switch } from "../ui";
import { PulseHalo, VuMeter } from "./AudioVisualizer";
import { useT } from "../../i18n";

interface MicrophonePanelProps {
  status: FuxiAudioEndpointStatus;
  peak?: number;
  onMicChange: (vol: number, muted: boolean) => void;
  encEnabled: boolean;
  onEncChange: (enabled: boolean) => void;
  sidetoneEnabled: boolean;
  onSidetoneChange: (enabled: boolean) => void;
}

export const MicrophonePanel: React.FC<MicrophonePanelProps> = ({
  status,
  peak = 0,
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
      <div className="flex flex-col gap-1.5 min-w-[240px] sm:min-w-[280px]">
        <div className="flex items-center gap-2">
          <PulseHalo level={peak}>
            <Mic aria-hidden="true" className="h-3.5 w-3.5 text-secondary flex-none" />
          </PulseHalo>
          <Slider
            id="fx-mic"
            min={0}
            max={100}
            value={status.mic_volume}
            disabled={status.mic_muted}
            onChange={(e) => onMicChange(Number(e.target.value), status.mic_muted)}
            valueText={status.mic_muted ? t("headset.muted") : `${status.mic_volume}%`}
          />
        </div>
        <div className="flex flex-col gap-0.5 pl-5 pr-12">
          <div className="flex items-center justify-between text-[10px] text-secondary">
            <span>{t("headset.mic.liveInput")}</span>
            <span className="tabular-nums font-mono text-[10px]">
              {status.mic_muted ? t("headset.muted") : `${Math.round(peak * 100)}%`}
            </span>
          </div>
          <VuMeter
            level={peak}
            muted={status.mic_muted}
          />
        </div>
      </div>
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
