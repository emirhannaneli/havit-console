import React, { useEffect, useState } from "react";
import type { SavedProfile } from "../../types";
import { fetchProfiles, saveProfileToStorage } from "../../api";
import { describeProfile, useDeviceSettings, type DeviceId } from "../../state/DeviceSettings";
import { ActionRow, Button, Row, Section, Select, TextField, type StatusMessage } from "../ui";
import { useT } from "../../i18n";

/** Apply a saved profile or save the current settings, right on the device page. */
export const ProfileQuickBar: React.FC<{
  device: DeviceId;
  connected: boolean;
  /** Called after a profile was written to the device (e.g. to refetch volume). */
  onApplied?: () => void;
}> = ({ device, connected, onApplied }) => {
  const { t } = useT();
  const { captureProfile, applyProfile } = useDeviceSettings();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<StatusMessage | null>(null);

  useEffect(() => {
    fetchProfiles(device)
      .then((list) => setProfiles(list.filter((p) => p.device_id === device)))
      .catch((err) => setMsg({ tone: "error", text: t("quickbar.loadFailed", { error: String(err) }) }));
  }, [device]);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  const flash = (m: StatusMessage) => {
    setMsg(m);
    if (m.tone === "success") setTimeout(() => setMsg(null), 4000);
  };

  const handleApply = async () => {
    if (!selected) return;
    setBusy(true);
    setMsg(null);
    try {
      flash({ tone: "success", text: await applyProfile(selected) });
      onApplied?.();
    } catch (err) {
      flash({ tone: "error", text: t("quickbar.applyFailed", { error: String(err) }) });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setMsg(null);
    try {
      const saved = await saveProfileToStorage({
        id: `${device}_${Date.now()}`,
        name: trimmed,
        device_id: device,
        updated_at: new Date().toISOString(),
        data: await captureProfile(device),
      });
      setProfiles((list) => [...list, saved]);
      setSelectedId(saved.id);
      setName("");
      setNaming(false);
      flash({ tone: "success", text: t("profiles.msg.saved", { name: saved.name }) });
    } catch (err) {
      flash({ tone: "error", text: t("quickbar.saveFailed", { error: String(err) }) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title={t("quickbar.title")}
      footer={t("quickbar.footer")}
    >
      <Row
        label={t("quickbar.saved")}
        description={
          selected
            ? describeProfile(selected)
            : profiles.length === 0
              ? t("quickbar.noneHint")
              : t("quickbar.chooseHint")
        }
        htmlFor={`profile-${device}`}
      >
        <Select
          id={`profile-${device}`}
          value={selectedId}
          options={[
            { value: "", label: profiles.length === 0 ? t("quickbar.none") : t("quickbar.choose"), disabled: true },
            ...profiles.map((p) => ({ value: p.id, label: p.name })),
          ]}
          onChange={setSelectedId}
          className="min-w-[200px]"
        />
      </Row>

      {naming && (
        <form onSubmit={handleSave} className="contents">
          <Row label={t("quickbar.nameLabel")} description={t("quickbar.nameDesc")} htmlFor={`profile-name-${device}`}>
            <TextField
              id={`profile-name-${device}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profiles.namePlaceholder")}
              autoFocus
              required
              className="w-[220px]"
            />
          </Row>
          <ActionRow status={msg}>
            <Button onClick={() => setNaming(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
              {t("common.save")}
            </Button>
          </ActionRow>
        </form>
      )}

      {!naming && (
        <ActionRow status={msg}>
          <Button onClick={() => setNaming(true)} disabled={busy}>
            {t("quickbar.save")}
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={busy || !selected || !connected}
            title={!connected ? t("quickbar.notConnected") : undefined}
          >
            {busy ? t("common.applying") : t("common.apply")}
          </Button>
        </ActionRow>
      )}
    </Section>
  );
};
