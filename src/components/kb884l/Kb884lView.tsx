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
    ? "Showing the settings last applied from this app."
    : source === "vendor"
      ? "Showing the settings stored by the Havit app."
      : "The keyboard can’t report its settings; showing defaults.";
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
      setLightingMsg({ tone: "error", text: `Couldn’t apply: ${err}` });
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
      setSettingsMsg({ tone: "error", text: `Couldn’t save: ${err}` });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      {!connected && (
        <Notice tone="warning" title="KB884L not detected">
          You’re in preview mode; changes can’t be sent to the keyboard. Plug in
          the USB cable and choose “Scan devices”.
        </Notice>
      )}

      <ProfileQuickBar device="kb884l" connected={connected} />

      <section aria-label="Keyboard layout" className="flex flex-col gap-2">
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
                ? `Couldn’t load the keyboard layout: ${layoutError}`
                : "Loading keyboard layout…"}
            </p>
          )}
        </div>
        <p className="m-0 px-1 text-[11px] leading-[14px] text-secondary">
          Click a key to assign a macro. The screen image and lighting reflect
          the settings below.
        </p>
      </section>

      <Section
        title="Macro"
        footer="Saving to the keyboard isn’t supported yet; recordings stay in this app."
      >
        <Row
          label={selectedKey ? `${selectedKey.label} key` : "No key selected"}
          description={
            selectedKey
              ? "Record a key sequence for this key"
              : "Select a key on the keyboard above"
          }
        >
          <Button onClick={() => setMacroOpen(true)} disabled={!selectedKey}>
            Record macro…
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
