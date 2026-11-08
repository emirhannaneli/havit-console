import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  HeadsetDsp,
  HeadsetProfileData,
  Kb884lLightingConfig,
  Kb884lSettingsConfig,
  ProfileData,
  SavedProfile,
} from "../types";
import {
  applyKb884lLighting,
  applyKb884lSettings,
  fetchFuxiStatus,
  loadKb884lState,
  setFuxiBalance,
  setFuxiMic,
  setFuxiSpeaker,
} from "../api";
import { lightingModeName } from "../components/kb884l/LightingPanel";

/**
 * Device settings shared by the device pages and the profiles page.
 *
 * Neither device can report its configuration back, so this is the app's working copy:
 * the keyboard part starts from the last known state (`loadKb884lState`), the headset
 * DSP part is host-side only and is persisted in localStorage.
 */

export type StateSource = "app" | "vendor" | null;
export type DeviceId = "kb884l" | "fuxi-h7";

export const DEFAULT_LIGHTING: Kb884lLightingConfig = {
  mode: 1,
  brightness: 5,
  speed: 3,
  direction: 0,
  r: 255,
  g: 146,
  b: 48,
  random_color: false,
};

export const DEFAULT_SETTINGS: Kb884lSettingsConfig = {
  win_lock: false,
  fn_toggle: false,
  sleep_minutes: 5,
  debounce_ms: 2,
};

export const DEFAULT_DSP: HeadsetDsp = {
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  preamp: 0,
  preset: "Varsayılan",
  surround71: true,
  roomSize: "medium",
  enc: true,
  sidetone: false,
};

const DSP_KEY = "havit-console:fuxi.dsp";

function readDsp(): HeadsetDsp {
  try {
    const raw = localStorage.getItem(DSP_KEY);
    return raw ? { ...DEFAULT_DSP, ...(JSON.parse(raw) as Partial<HeadsetDsp>) } : DEFAULT_DSP;
  } catch {
    return DEFAULT_DSP;
  }
}

function writeDsp(dsp: HeadsetDsp) {
  try {
    localStorage.setItem(DSP_KEY, JSON.stringify(dsp));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}

/** Validates stored profile data; returns null for profiles without settings. */
export function parseProfileData(profile: SavedProfile): ProfileData | null {
  const d = profile.data as unknown as
    | {
        kind?: string;
        lighting?: Partial<Kb884lLightingConfig>;
        settings?: Partial<Kb884lSettingsConfig>;
        dsp?: Partial<HeadsetDsp>;
        audio?: Partial<HeadsetProfileData["audio"]>;
      }
    | undefined;
  if (!d || typeof d !== "object") return null;
  if (d.kind === "kb884l" && d.lighting && d.settings) {
    return {
      kind: "kb884l",
      lighting: { ...DEFAULT_LIGHTING, ...d.lighting },
      settings: { ...DEFAULT_SETTINGS, ...d.settings },
    };
  }
  if (d.kind === "fuxi-h7" && d.dsp) {
    return {
      kind: "fuxi-h7",
      dsp: { ...DEFAULT_DSP, ...d.dsp },
      audio: {
        speaker_volume: 75,
        mic_volume: 85,
        left_balance: 100,
        right_balance: 100,
        ...(d.audio ?? {}),
      },
    };
  }
  return null;
}

const hex = (c: Kb884lLightingConfig) =>
  `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/** One-line summary for profile lists. */
export function describeProfile(profile: SavedProfile): string {
  const data = parseProfileData(profile);
  if (!data) return "Ayar içermiyor (eski biçim)";
  if (data.kind === "kb884l") {
    const l = data.lighting;
    const color = l.mode === 0 ? null : l.random_color ? "rastgele renk" : hex(l);
    return [lightingModeName(l.mode), color, `parlaklık ${l.brightness}`].filter(Boolean).join(" · ");
  }
  const { dsp, audio } = data;
  return [
    `EQ ${dsp.preset}`,
    dsp.surround71 ? "7.1 açık" : "7.1 kapalı",
    `ses %${audio.speaker_volume}`,
    `mikrofon %${audio.mic_volume}`,
  ].join(" · ");
}

interface DeviceSettingsValue {
  lighting: Kb884lLightingConfig;
  setLighting: (cfg: Kb884lLightingConfig) => void;
  lightingSource: StateSource;
  settings: Kb884lSettingsConfig;
  setSettings: (cfg: Kb884lSettingsConfig) => void;
  settingsSource: StateSource;
  /** Call after a successful write so the source note reads "bu uygulamadan". */
  markLightingApplied: () => void;
  markSettingsApplied: () => void;
  dsp: HeadsetDsp;
  setDsp: (patch: Partial<HeadsetDsp>) => void;
  /** Snapshot of the current settings for `device`, ready to store in a profile. */
  captureProfile: (device: DeviceId) => Promise<ProfileData>;
  /** Loads the profile into the UI and writes it to the device. Resolves with a message. */
  applyProfile: (profile: SavedProfile) => Promise<string>;
}

const Ctx = createContext<DeviceSettingsValue | null>(null);

export const DeviceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lighting, setLighting] = useState(DEFAULT_LIGHTING);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [lightingSource, setLightingSource] = useState<StateSource>(null);
  const [settingsSource, setSettingsSource] = useState<StateSource>(null);
  const [dsp, setDspState] = useState<HeadsetDsp>(readDsp);

  useEffect(() => {
    loadKb884lState()
      .then((s) => {
        if (s.lighting) setLighting(s.lighting);
        if (s.settings) setSettings(s.settings);
        setLightingSource(s.lighting_source);
        setSettingsSource(s.settings_source);
      })
      .catch((err) => console.error(err));
  }, []);

  const setDsp = useCallback((patch: Partial<HeadsetDsp>) => {
    setDspState((prev) => {
      const next = { ...prev, ...patch };
      writeDsp(next);
      return next;
    });
  }, []);

  const captureProfile = useCallback(
    async (device: DeviceId): Promise<ProfileData> => {
      if (device === "kb884l") return { kind: "kb884l", lighting, settings };
      const st = await fetchFuxiStatus();
      return {
        kind: "fuxi-h7",
        dsp,
        audio: {
          speaker_volume: st.speaker_volume,
          mic_volume: st.mic_volume,
          left_balance: st.left_balance,
          right_balance: st.right_balance,
        },
      };
    },
    [lighting, settings, dsp]
  );

  const applyProfile = useCallback(
    async (profile: SavedProfile): Promise<string> => {
      const data = parseProfileData(profile);
      if (!data) throw new Error("Bu profil eski biçimde; içinde ayar yok.");
      if (data.kind === "kb884l") {
        // Update the UI first so the page reflects the profile even if the write fails.
        setLighting(data.lighting);
        setSettings(data.settings);
        await applyKb884lLighting(data.lighting);
        setLightingSource("app");
        await applyKb884lSettings(data.settings);
        setSettingsSource("app");
        return "Profil klavyeye uygulandı.";
      }
      setDsp(data.dsp);
      const st = await fetchFuxiStatus();
      if (!st.speaker_found && !st.mic_found) {
        throw new Error("Kulaklık ses aygıtı bulunamadı; yalnızca ekolayzer ve efekt ayarları yüklendi.");
      }
      if (st.speaker_found) {
        await setFuxiSpeaker(data.audio.speaker_volume, st.speaker_muted);
        await setFuxiBalance(data.audio.left_balance, data.audio.right_balance);
      }
      if (st.mic_found) await setFuxiMic(data.audio.mic_volume, st.mic_muted);
      return "Profil kulaklığa uygulandı.";
    },
    [setDsp]
  );

  const value = useMemo<DeviceSettingsValue>(
    () => ({
      lighting,
      setLighting,
      lightingSource,
      settings,
      setSettings,
      settingsSource,
      markLightingApplied: () => setLightingSource("app"),
      markSettingsApplied: () => setSettingsSource("app"),
      dsp,
      setDsp,
      captureProfile,
      applyProfile,
    }),
    [lighting, lightingSource, settings, settingsSource, dsp, setDsp, captureProfile, applyProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useDeviceSettings(): DeviceSettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDeviceSettings must be used inside DeviceSettingsProvider");
  return v;
}
