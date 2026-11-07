import React, { useState, useEffect } from "react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { AudioControls } from "./AudioControls";
import { EqualizerPanel } from "./EqualizerPanel";
import { SurroundDspPanel } from "./SurroundDspPanel";
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

  // EQ Bands state
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [preamp, setPreamp] = useState(0);

  // DSP Surround & Mic states
  const [surround71, setSurround71] = useState(true);
  const [encEnabled, setEncEnabled] = useState(true);
  const [sidetoneEnabled, setSidetoneEnabled] = useState(false);
  const [roomSize, setRoomSize] = useState<"small" | "medium" | "large">("medium");

  useEffect(() => {
    fetchFuxiStatus().then(setAudioStatus).catch(console.error);
  }, []);

  const handleSpeakerChange = async (vol: number, muted: boolean) => {
    setAudioStatus((prev) => ({ ...prev, speaker_volume: vol, speaker_muted: muted }));
    try {
      await setFuxiSpeaker(vol, muted);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBalanceChange = async (left: number, right: number) => {
    setAudioStatus((prev) => ({ ...prev, left_balance: left, right_balance: right }));
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
    <div className="space-y-8 animate-fadeIn">
      {/* Disconnected warning banner */}
      {!connected && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200">
          <span>
            ⚠️ Fuxi-H7 kulaklık USB dongle'ı veya kablosu algılanamadı. Arayüz sanal test modunda çalışıyor.
          </span>
        </div>
      )}

      {/* 1. Master Audio & Mic Controls */}
      <AudioControls
        status={audioStatus}
        onVolumeChange={handleSpeakerChange}
        onBalanceChange={handleBalanceChange}
        onMicChange={handleMicChange}
      />

      {/* 2. 10-Band Graphic Equalizer */}
      <EqualizerPanel
        bands={eqBands}
        onChange={setEqBands}
        preamp={preamp}
        onPreampChange={setPreamp}
      />

      {/* 3. 7.1 Surround & DSP Mic Settings */}
      <SurroundDspPanel
        surround71={surround71}
        onSurroundChange={setSurround71}
        encEnabled={encEnabled}
        onEncChange={setEncEnabled}
        sidetoneEnabled={sidetoneEnabled}
        onSidetoneChange={setSidetoneEnabled}
        roomSize={roomSize}
        onRoomSizeChange={setRoomSize}
      />
    </div>
  );
};
