import React, { useState, useEffect } from "react";
import type { Kb884lPhysicalLayout, KeyDef } from "../../types";
import { KeyboardSvgLayout } from "./KeyboardSvgLayout";
import { LightingPanel, lightingModeName } from "./LightingPanel";
import { LcdManager } from "./LcdManager";
import { SettingsPanel } from "./SettingsPanel";
import { MacroRecorder } from "./MacroRecorder";
import {
  fetchKb884lLayout,
  applyKb884lLighting,
  applyKb884lSettings,
} from "../../api";
import { ProfileQuickBar } from "../profiles/ProfileQuickBar";
import {
  useDeviceSettings,
  type StateSource,
} from "../../state/DeviceSettings";

const sourceNote = (source: StateSource) =>
  source === "app"
    ? "Bu uygulamadan en son uygulanan ayarlar gösteriliyor."
    : source === "vendor"
      ? "Havit uygulamasında kayıtlı ayarlar gösteriliyor."
      : "Klavye ayarlarını geri okuyamıyor; varsayılanlar gösteriliyor.";
import { Button, Notice, Row, Section, type StatusMessage } from "../ui";

interface Kb884lViewProps {
  connected: boolean;
}

export const Kb884lView: React.FC<Kb884lViewProps> = ({ connected }) => {
  const [layout, setLayout] = useState<Kb884lPhysicalLayout | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyDef | null>(null);
  const [tftPreviewUrl, setTftPreviewUrl] = useState<string | null>(null);
  const [macroOpen, setMacroOpen] = useState(false);

  // Lighting and settings live in DeviceSettings so profiles can read and apply them.
  const {
    lighting,
    setLighting,
    lightingSource,
    markLightingApplied,
    settings,
    setSettings,
    settingsSource,
    markSettingsApplied,
  } = useDeviceSettings();
  const [applyingLighting, setApplyingLighting] = useState(false);
  const [lightingMsg, setLightingMsg] = useState<StatusMessage | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<StatusMessage | null>(null);

  useEffect(() => {
    fetchKb884lLayout()
      .then(setLayout)
      .catch((err) => {
        console.error(err);
        setLayoutError(String(err));
      });
  }, []);

  const handleApplyLighting = async () => {
    try {
      setApplyingLighting(true);
      setLightingMsg(null);
      const res = await applyKb884lLighting(lighting);
      markLightingApplied();
      setLightingMsg({ tone: "success", text: res });
      setTimeout(() => setLightingMsg(null), 4000);
    } catch (err) {
      setLightingMsg({ tone: "error", text: `Uygulanamadı: ${err}` });
    } finally {
      setApplyingLighting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMsg(null);
      const res = await applyKb884lSettings(settings);
      markSettingsApplied();
      setSettingsMsg({ tone: "success", text: res });
      setTimeout(() => setSettingsMsg(null), 4000);
    } catch (err) {
      setSettingsMsg({ tone: "error", text: `Kaydedilemedi: ${err}` });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      {!connected && (
        <Notice tone="warning" title="KB884L algılanamadı">
          Önizleme modundasın; değişiklikler klavyeye gönderilemez. USB
          kablosunu takıp “Cihazları tara”ya bas.
        </Notice>
      )}

      <ProfileQuickBar device="kb884l" connected={connected} />

      <section aria-label="Klavye düzeni" className="flex flex-col gap-2">
        <div className="rounded-[10px] border border-separator bg-card p-4">
          {layout ? (
            <KeyboardSvgLayout
              layout={layout}
              lighting={lighting}
              effectName={lightingModeName(lighting.mode)}
              previewUrl={tftPreviewUrl}
              selectedKey={selectedKey}
              onKeySelect={setSelectedKey}
            />
          ) : (
            <p role="status" className="m-0 py-16 text-center text-secondary">
              {layoutError
                ? `Klavye düzeni yüklenemedi: ${layoutError}`
                : "Klavye düzeni yükleniyor…"}
            </p>
          )}
        </div>
        <p className="m-0 px-1 text-[11px] leading-[14px] text-secondary">
          Makro atamak için bir tuşa tıkla. Ekrandaki görüntü ve ışık rengi
          aşağıdaki ayarları yansıtır.
        </p>
      </section>

      <Section
        title="Makro"
        footer="Klavyeye kaydetme henüz desteklenmiyor; kayıt yalnızca bu uygulamada saklanır."
      >
        <Row
          label={selectedKey ? `${selectedKey.label} tuşu` : "Tuş seçilmedi"}
          description={
            selectedKey
              ? "Bu tuşa bir tuş dizisi kaydet"
              : "Yukarıdaki klavye görselinden bir tuş seç"
          }
        >
          <Button onClick={() => setMacroOpen(true)} disabled={!selectedKey}>
            Makro kaydet…
          </Button>
        </Row>
      </Section>

      {selectedKey && (
        <MacroRecorder
          open={macroOpen}
          keyName={selectedKey.label}
          onClose={() => setMacroOpen(false)}
        />
      )}

      <LcdManager onPreviewUpdate={setTftPreviewUrl} />

      <LightingPanel
        config={lighting}
        onChange={setLighting}
        onApply={handleApplyLighting}
        applying={applyingLighting}
        statusMessage={lightingMsg}
        note={sourceNote(lightingSource)}
      />

      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        onSave={handleSaveSettings}
        saving={savingSettings}
        statusMessage={settingsMsg}
        note={sourceNote(settingsSource)}
      />
    </>
  );
};
