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

import { Button, Notice, Row, Section, type StatusMessage } from "../ui";
import { useT, type MessageKey } from "../../i18n";

const SOURCE_NOTE: Record<"app" | "vendor" | "none", MessageKey> = {
  app: "keyboard.source.app",
  vendor: "keyboard.source.vendor",
  none: "keyboard.source.none",
};
const sourceKey = (source: StateSource): MessageKey => SOURCE_NOTE[source ?? "none"];

interface Kb884lViewProps {
  connected: boolean;
}

export const Kb884lView: React.FC<Kb884lViewProps> = ({ connected }) => {
  const { t } = useT();
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
      setLightingMsg({ tone: "error", text: t("keyboard.applyFailed", { error: String(err) }) });
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
      setSettingsMsg({ tone: "error", text: t("keyboard.saveFailed", { error: String(err) }) });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      {!connected && (
        <Notice tone="warning" title={t("keyboard.notDetected.title")}>
          {t("keyboard.notDetected.body")}
        </Notice>
      )}

      <ProfileQuickBar device="kb884l" connected={connected} />

      <section aria-label={t("keyboard.layout")} className="flex flex-col gap-2">
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
                ? t("keyboard.layout.error", { error: layoutError })
                : t("keyboard.layout.loading")}
            </p>
          )}
        </div>
        <p className="m-0 px-1 text-[11px] leading-[14px] text-secondary">
          {t("keyboard.layout.hint")}
        </p>
      </section>

      <Section
        title={t("keyboard.macro.title")}
        footer={t("keyboard.macro.footer")}
      >
        <Row
          label={selectedKey ? t("keyboard.key", { key: selectedKey.label }) : t("keyboard.macro.noKey")}
          description={
            selectedKey
              ? t("keyboard.macro.recordDesc")
              : t("keyboard.macro.selectDesc")
          }
        >
          <Button onClick={() => setMacroOpen(true)} disabled={!selectedKey}>
            {t("keyboard.macro.record")}
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
        note={t(sourceKey(lightingSource))}
      />

      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        onSave={handleSaveSettings}
        saving={savingSettings}
        statusMessage={settingsMsg}
        note={t(sourceKey(settingsSource))}
      />
    </>
  );
};
