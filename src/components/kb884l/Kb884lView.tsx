import React, { useState, useEffect } from "react";
import type {
  Kb884lPhysicalLayout,
  Kb884lLightingConfig,
  Kb884lSettingsConfig,
  KeyDef,
} from "../../types";
import { KeyboardSvgLayout } from "./KeyboardSvgLayout";
import { LightingPanel } from "./LightingPanel";
import { LcdManager } from "./LcdManager";
import { SettingsPanel } from "./SettingsPanel";
import {
  fetchKb884lLayout,
  applyKb884lLighting,
  applyKb884lSettings,
} from "../../api";

interface Kb884lViewProps {
  connected: boolean;
}

export const Kb884lView: React.FC<Kb884lViewProps> = ({ connected }) => {
  const [layout, setLayout] = useState<Kb884lPhysicalLayout | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyDef | null>(null);
  const [tftPreviewUrl, setTftPreviewUrl] = useState<string | null>(null);

  // Lighting state
  const [lighting, setLighting] = useState<Kb884lLightingConfig>({
    mode: 3, // Wave default
    brightness: 4,
    speed: 3,
    direction: 0,
    r: 244,
    g: 63,
    b: 94,
  });
  const [applyingLighting, setApplyingLighting] = useState(false);
  const [lightingMsg, setLightingMsg] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<Kb884lSettingsConfig>({
    win_lock: false,
    fn_toggle: false,
    sleep_minutes: 5,
    debounce_ms: 2,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchKb884lLayout().then(setLayout).catch(console.error);
  }, []);

  const handleApplyLighting = async () => {
    try {
      setApplyingLighting(true);
      setLightingMsg(null);
      const res = await applyKb884lLighting(lighting);
      setLightingMsg(res);
      setTimeout(() => setLightingMsg(null), 4000);
    } catch (err) {
      setLightingMsg(`Hata: ${err}`);
    } finally {
      setApplyingLighting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMsg(null);
      const res = await applyKb884lSettings(settings);
      setSettingsMsg(res);
      setTimeout(() => setSettingsMsg(null), 4000);
    } catch (err) {
      setSettingsMsg(`Hata: ${err}`);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!layout) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Klavye yerleşimi yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hardware Connection Banner if disconnected */}
      {!connected && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200">
          <span>
            ⚠️ KB884L klavye şu anda doğrudan algılanamadı. Arayüz önizleme modunda çalışıyor; USB kablosunun takılı olduğundan emin olun.
          </span>
        </div>
      )}

      {/* 1. Interactive 85-Key SVG Layout */}
      <KeyboardSvgLayout
        layout={layout}
        activeColor={{ r: lighting.r, g: lighting.g, b: lighting.b }}
        lightingMode={lighting.mode}
        previewUrl={tftPreviewUrl}
        selectedKey={selectedKey}
        onKeySelect={setSelectedKey}
      />

      {/* 2. RGB Lighting Controls */}
      <LightingPanel
        config={lighting}
        onChange={setLighting}
        onApply={handleApplyLighting}
        applying={applyingLighting}
        statusMessage={lightingMsg}
      />

      {/* 3. Mini TFT Screen & GIF Manager */}
      <LcdManager onPreviewUpdate={setTftPreviewUrl} />

      {/* 4. Hardware Settings */}
      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        onSave={handleSaveSettings}
        saving={savingSettings}
        statusMessage={settingsMsg}
      />
    </div>
  );
};
