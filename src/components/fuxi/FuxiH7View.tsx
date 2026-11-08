import React, { useState, useEffect } from "react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { AudioControls } from "./AudioControls";
import { ProfileQuickBar } from "../profiles/ProfileQuickBar";
import { useDeviceSettings } from "../../state/DeviceSettings";
import { EqualizerPanel } from "./EqualizerPanel";
import { MicrophonePanel } from "./MicrophonePanel";
import { Notice } from "../ui";
import {
  fetchFuxiStatus,
  setFuxiSpeaker,
  setFuxiBalance,
  setFuxiMic,
} from "../../api";

interface FuxiH7ViewProps {
  connected: boolean;
}

export const FuxiH7View: React.FC<FuxiH7ViewProps> = ({ connected }) => {
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

  const handleSpeakerChange = async (vol: number, muted: boolean) => {
    setAudioStatus((prev) => ({
      ...prev,
      speaker_volume: vol,
      speaker_muted: muted,
    }));
    try {
      await setFuxiSpeaker(vol, muted);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBalanceChange = async (left: number, right: number) => {
    setAudioStatus((prev) => ({
      ...prev,
      left_balance: left,
      right_balance: right,
    }));
    try {
      await setFuxiBalance(left, right);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMicChange = async (vol: number, muted: boolean) => {
    setAudioStatus((prev) => ({ ...prev, mic_volume: vol, mic_muted: muted }));
    try {
      await setFuxiMic(vol, muted);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {!connected && (
        <Notice tone="warning" title="Fuxi-H7 not detected">
          You’re in preview mode. Plug in the USB receiver or cable and choose
          “Scan devices”.
        </Notice>
      )}

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
        onVolumeChange={handleSpeakerChange}
        onBalanceChange={handleBalanceChange}
        surround71={dsp.surround71}
        onSurroundChange={(surround71) => setDsp({ surround71 })}
        roomSize={dsp.roomSize}
        onRoomSizeChange={(roomSize) => setDsp({ roomSize })}
      />

      <MicrophonePanel
        status={audioStatus}
        onMicChange={handleMicChange}
        encEnabled={dsp.enc}
        onEncChange={(enc) => setDsp({ enc })}
        sidetoneEnabled={dsp.sidetone}
        onSidetoneChange={(sidetone) => setDsp({ sidetone })}
      />
    </>
  );
};
