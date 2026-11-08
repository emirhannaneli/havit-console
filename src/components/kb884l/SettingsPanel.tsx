import React from "react";
import type { Kb884lSettingsConfig } from "../../types";
import { ActionRow, Button, Row, Section, Select, Switch, type StatusMessage } from "../ui";
import { useT } from "../../i18n";

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
}) => {
  const { t, tp } = useT();
  return (
  <Section title={t("settings.title")} footer={note}>
    <Row label={t("settings.winLock")} description={t("settings.winLock.desc")}>
      <Switch
        label={t("settings.winLock")}
        checked={settings.win_lock}
        onChange={(win_lock) => onChange({ ...settings, win_lock })}
      />
    </Row>

    <Row label={t("settings.fnLock")} description={t("settings.fnLock.desc")}>
      <Switch
        label={t("settings.fnLock")}
        checked={settings.fn_toggle}
        onChange={(fn_toggle) => onChange({ ...settings, fn_toggle })}
      />
    </Row>

    <Row label={t("settings.sleep")} description={t("settings.sleep.desc")} htmlFor="kb-sleep">
      <Select
        id="kb-sleep"
        value={settings.sleep_minutes}
        options={[
          { value: 0, label: t("settings.sleep.never") },
          { value: 1, label: tp("settings.sleep.minutes", 1) },
          { value: 5, label: tp("settings.sleep.minutes", 5) },
          { value: 30, label: tp("settings.sleep.minutes", 30) },
        ]}
        onChange={(sleep_minutes) => onChange({ ...settings, sleep_minutes })}
        className="min-w-[200px]"
      />
    </Row>

    <ActionRow status={statusMessage}>
      <Button variant="primary" onClick={onSave} disabled={saving}>
        {saving ? t("settings.saving") : t("settings.save")}
      </Button>
    </ActionRow>
  </Section>
  );
};
