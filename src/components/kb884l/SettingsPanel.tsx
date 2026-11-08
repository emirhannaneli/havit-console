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
  <Section title="Gelişmiş" footer={note}>
    <Row label="Windows tuşunu kilitle" description="Oyun sırasında yanlışlıkla masaüstüne düşmeni önler">
      <Switch
        label="Windows tuşunu kilitle"
        checked={settings.win_lock}
        onChange={(win_lock) => onChange({ ...settings, win_lock })}
      />
    </Row>

    <Row label="Fn kilidi" description="Fn tuşunu basılı tutmadan Fn katmanını etkin tutar">
      <Switch
        label="Fn kilidi"
        checked={settings.fn_toggle}
        onChange={(fn_toggle) => onChange({ ...settings, fn_toggle })}
      />
    </Row>

    <Row label="Işık uyku süresi" description="Bu süre boyunca kullanılmazsa klavyenin ışıkları kapanır" htmlFor="kb-sleep">
      <Select
        id="kb-sleep"
        value={settings.sleep_minutes}
        options={[
          { value: 0, label: "Hiçbir zaman" },
          { value: 1, label: "1 dakika" },
          { value: 5, label: "5 dakika" },
          { value: 30, label: "30 dakika" },
        ]}
        onChange={(sleep_minutes) => onChange({ ...settings, sleep_minutes })}
        className="min-w-[200px]"
      />
    </Row>

    <ActionRow status={statusMessage}>
      <Button variant="primary" onClick={onSave} disabled={saving}>
        {saving ? "Kaydediliyor…" : "Klavyeye kaydet"}
      </Button>
    </ActionRow>
  </Section>
);
