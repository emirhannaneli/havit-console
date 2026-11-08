import React from "react";
import type { Kb884lSettingsConfig } from "../../types";
import { ActionRow, Button, Row, Section, Select, Switch, type StatusMessage } from "../ui";

interface SettingsPanelProps {
  settings: Kb884lSettingsConfig;
  onChange: (cfg: Kb884lSettingsConfig) => void;
  onSave: () => void;
  saving: boolean;
  statusMessage: StatusMessage | null;
  /** Where the shown values came from. */
  note?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onSave,
  saving,
  statusMessage,
  note,
}) => (
  <Section title="Advanced" footer={note}>
    <Row label="Lock Windows key" description="Prevents accidentally minimizing games">
      <Switch
        label="Lock Windows key"
        checked={settings.win_lock}
        onChange={(win_lock) => onChange({ ...settings, win_lock })}
      />
    </Row>

    <Row label="Fn lock" description="Keeps the Fn layer active without holding Fn">
      <Switch
        label="Fn lock"
        checked={settings.fn_toggle}
        onChange={(fn_toggle) => onChange({ ...settings, fn_toggle })}
      />
    </Row>

    <Row label="Lighting sleep" description="Turns the lights off after this much idle time" htmlFor="kb-sleep">
      <Select
        id="kb-sleep"
        value={settings.sleep_minutes}
        options={[
          { value: 0, label: "Never" },
          { value: 1, label: "1 minute" },
          { value: 5, label: "5 minutes" },
          { value: 30, label: "30 minutes" },
        ]}
        onChange={(sleep_minutes) => onChange({ ...settings, sleep_minutes })}
        className="min-w-[200px]"
      />
    </Row>

    <ActionRow status={statusMessage}>
      <Button variant="primary" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save to keyboard"}
      </Button>
    </ActionRow>
  </Section>
);
