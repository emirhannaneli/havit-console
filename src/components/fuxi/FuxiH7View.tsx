import React, { useState, useEffect, useRef } from "react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { AudioControls } from "./AudioControls";
import { ProfileQuickBar } from "../profiles/ProfileQuickBar";
import { useDeviceSettings } from "../../state/DeviceSettings";
import { EqualizerPanel } from "./EqualizerPanel";
import { MicrophonePanel } from "./MicrophonePanel";
import { useAudioPeaks } from "./useAudioPeaks";
import { AmbientAudioGlow } from "./AudioVisualizer";
import { HeadsetStatusBar } from "./HeadsetStatusBar";
import { Notice } from "../ui";
import {
  fetchFuxiStatus,
  setFuxiSpeaker,
  setFuxiBalance,
  setFuxiMic,
} from "../../api";
import { useT } from "../../i18n";

interface FuxiH7ViewProps {
  connected: boolean;
}

export const FuxiH7View: React.FC<FuxiH7ViewProps> = ({ connected }) => {
  const { t } = useT();
  const peaks = useAudioPeaks(true);
  const [audioStatus, setAudioStatus] = useState<FuxiAudioEndpointStatus>({
    speaker_found: true,
    speaker_name: "Havit Fuxi-H7 Audio",
    speaker_volume: 75,
    speaker_muted: false,
    left_balance: 100,
    right_balance: 100,
    mic_found: true,
    mic_name: "Havit Fuxi-H7 Mic",
    mic_volume: 85,
    mic_muted: false,
  });

  // EQ, surround and mic processing are host-side; shared with the profiles page.
  const { dsp, setDsp } = useDeviceSettings();

  const refreshStatus = () =>
    fetchFuxiStatus().then(setAudioStatus).catch(console.error);
  useEffect(() => {
    refreshStatus();
  }, []);

  // Smooth, throttled hardware IPC dispatching:
  // Updates UI state immediately (zero drag lag) while throttling WASAPI calls (~35ms)
  // to prevent DAC buffer interruptions, crackling, and driver flooding.
  const speakerThrottle = useRef<{ vol: number; muted: boolean } | null>(null);
  const speakerTimer = useRef<number | null>(null);

  const handleSpeakerChange = (vol: number, muted: boolean) => {
    setAudioStatus((prev) => ({
      ...prev,
      speaker_volume: vol,
      speaker_muted: muted,
    }));
    speakerThrottle.current = { vol, muted };
    if (!speakerTimer.current) {
      speakerTimer.current = window.setTimeout(async () => {
        speakerTimer.current = null;
        if (speakerThrottle.current) {
          const { vol: v, muted: m } = speakerThrottle.current;
          speakerThrottle.current = null;
          try {
            await setFuxiSpeaker(v, m);
          } catch (e) {
            console.error(e);
          }
        }
      }, 35);
    }
  };

  const balanceThrottle = useRef<{ left: number; right: number } | null>(null);
  const balanceTimer = useRef<number | null>(null);

  const handleBalanceChange = (left: number, right: number) => {
    setAudioStatus((prev) => ({
      ...prev,
      left_balance: left,
      right_balance: right,
    }));
    balanceThrottle.current = { left, right };
    if (!balanceTimer.current) {
      balanceTimer.current = window.setTimeout(async () => {
        balanceTimer.current = null;
        if (balanceThrottle.current) {
          const { left: l, right: r } = balanceThrottle.current;
          balanceThrottle.current = null;
          try {
            await setFuxiBalance(l, r);
          } catch (e) {
            console.error(e);
          }
        }
      }, 35);
    }
  };

  const micThrottle = useRef<{ vol: number; muted: boolean } | null>(null);
  const micTimer = useRef<number | null>(null);

  const handleMicChange = (vol: number, muted: boolean) => {
    setAudioStatus((prev) => ({ ...prev, mic_volume: vol, mic_muted: muted }));
    micThrottle.current = { vol, muted };
    if (!micTimer.current) {
      micTimer.current = window.setTimeout(async () => {
        micTimer.current = null;
        if (micThrottle.current) {
          const { vol: v, muted: m } = micThrottle.current;
          micThrottle.current = null;
          try {
            await setFuxiMic(v, m);
          } catch (e) {
            console.error(e);
          }
        }
      }, 35);
    }
  };

  useEffect(() => {
    return () => {
      if (speakerTimer.current) clearTimeout(speakerTimer.current);
      if (balanceTimer.current) clearTimeout(balanceTimer.current);
      if (micTimer.current) clearTimeout(micTimer.current);
    };
  }, []);

  return (
    <>
      <AmbientAudioGlow
        left={peaks.speaker_left}
        right={peaks.speaker_right}
        peak={peaks.speaker_peak}
        micPeak={peaks.mic_peak}
        active={!audioStatus.speaker_muted}
      />

      {!connected && (
        <Notice tone="warning" title={t("headset.notDetected.title")}>
          {t("headset.notDetected.body")}
        </Notice>
      )}

      <HeadsetStatusBar status={audioStatus} connected={connected} />

      <ProfileQuickBar
        device="fuxi-h7"
        connected={connected}
        onApplied={refreshStatus}
      />

      <EqualizerPanel
        bands={dsp.bands}
        onChange={(bands) => setDsp({ bands })}
        preamp={dsp.preamp}
        onPreampChange={(preamp) => setDsp({ preamp })}
        preset={dsp.preset}
        onPresetChange={(preset) => setDsp({ preset })}
      />

      <AudioControls
        status={audioStatus}
        peaks={peaks}
        onVolumeChange={handleSpeakerChange}
        onBalanceChange={handleBalanceChange}
        surround71={dsp.surround71}
        onSurroundChange={(surround71) => setDsp({ surround71 })}
        roomSize={dsp.roomSize}
        onRoomSizeChange={(roomSize) => setDsp({ roomSize })}
      />

      <MicrophonePanel
        status={audioStatus}
        peak={peaks.mic_peak}
        onMicChange={handleMicChange}
        encEnabled={dsp.enc}
        onEncChange={(enc) => setDsp({ enc })}
        sidetoneEnabled={dsp.sidetone}
        onSidetoneChange={(sidetone) => setDsp({ sidetone })}
      />
    </>
  );
};
