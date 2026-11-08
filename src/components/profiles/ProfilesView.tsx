import React, { useEffect, useRef, useState } from "react";
import { Download, Headphones, Keyboard, Layers, Plus, Trash2, Upload } from "lucide-react";
import type { DetectedDeviceStatus, SavedProfile } from "../../types";
import { deleteProfileFromStorage, fetchProfiles, saveProfileToStorage } from "../../api";
import {
  describeProfile,
  parseProfileData,
  useDeviceSettings,
  type DeviceId,
} from "../../state/DeviceSettings";
import {
  ActionRow,
  Button,
  Notice,
  Row,
  Section,
  Segmented,
  Select,
  TextField,
  type StatusMessage,
} from "../ui";

interface ProfilesViewProps {
  devices: DetectedDeviceStatus[];
}

const DEVICE_LABEL: Record<DeviceId, string> = {
  kb884l: "KB884L Keyboard",
  "fuxi-h7": "Fuxi-H7 Headset",
};

const isDeviceId = (v: unknown): v is DeviceId => v === "kb884l" || v === "fuxi-h7";

export const ProfilesView: React.FC<ProfilesViewProps> = ({ devices }) => {
  const { captureProfile, applyProfile } = useDeviceSettings();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [filter, setFilter] = useState<"all" | DeviceId>("all");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDevice, setNewDevice] = useState<DeviceId>("kb884l");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const loadProfiles = async () => {
    try {
      setProfiles(await fetchProfiles());
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(String(err));
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const flash = (m: StatusMessage) => {
    setStatus(m);
    if (m.tone === "success") setTimeout(() => setStatus(null), 4000);
  };

  const connected = (device: string) => devices.find((d) => d.id === device)?.connected ?? false;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await saveProfileToStorage({
        id: `${newDevice}_${Date.now()}`,
        name,
        device_id: newDevice,
        updated_at: new Date().toISOString(),
        data: await captureProfile(newDevice),
      });
      setNewName("");
      setCreating(false);
      flash({ tone: "success", text: `“${name}” saved.` });
      await loadProfiles();
    } catch (err) {
      flash({ tone: "error", text: `Couldn’t save the profile: ${err}` });
    }
  };

  const handleApply = async (profile: SavedProfile) => {
    setBusyId(profile.id);
    setStatus(null);
    try {
      flash({ tone: "success", text: `“${profile.name}”: ${await applyProfile(profile)}` });
    } catch (err) {
      flash({ tone: "error", text: `Couldn’t apply “${profile.name}”: ${err}` });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (profile: SavedProfile) => {
    if (!confirm(`Delete the profile “${profile.name}” permanently? This can’t be undone.`)) return;
    try {
      await deleteProfileFromStorage(profile.id);
      await loadProfiles();
    } catch (err) {
      flash({ tone: "error", text: `Couldn’t delete: ${err}` });
    }
  };

  const handleExport = (profile: SavedProfile) => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `havit_${profile.device_id}_${profile.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as Partial<SavedProfile>;
      if (!isDeviceId(raw.device_id) || typeof raw.name !== "string") {
        throw new Error("The file is not a Havit Console profile.");
      }
      const candidate: SavedProfile = {
        id: `${raw.device_id}_${Date.now()}`,
        name: raw.name.trim() || "Imported profile",
        device_id: raw.device_id,
        updated_at: new Date().toISOString(),
        data: (raw.data ?? {}) as SavedProfile["data"],
      };
      const data = parseProfileData(candidate);
      if (!data) throw new Error("The file holds no valid device settings.");
      await saveProfileToStorage({ ...candidate, data });
      flash({ tone: "success", text: `“${candidate.name}” imported.` });
      await loadProfiles();
    } catch (err) {
      flash({ tone: "error", text: `Couldn’t import: ${err instanceof Error ? err.message : err}` });
    }
  };

  const filtered = profiles.filter((p) => filter === "all" || p.device_id === filter);

  return (
    <>
      {loadError && (
        <Notice tone="error" title="Couldn’t load profiles">
          {loadError}
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filter by device"
          options={[
            { id: "all", label: `All (${profiles.length})` },
            { id: "kb884l", label: "Keyboard" },
            { id: "fuxi-h7", label: "Headset" },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex gap-2">
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          <Button onClick={() => importRef.current?.click()}>
            <Upload aria-hidden="true" className="h-4 w-4" />
            Import…
          </Button>
          {!creating && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              New profile
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate}>
          <Section
            title="New profile"
            footer="The selected device’s current settings are saved: lighting and advanced for the keyboard; equalizer, sound and microphone for the headset."
          >
            <Row label="Name" htmlFor="prof-name">
              <TextField
                id="prof-name"
                placeholder="e.g. Night gaming"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                className="w-[240px] max-w-full"
              />
            </Row>
            <Row label="Device" htmlFor="prof-device">
              <Select<DeviceId>
                id="prof-device"
                value={newDevice}
                options={[
                  { value: "kb884l", label: DEVICE_LABEL.kb884l },
                  { value: "fuxi-h7", label: DEVICE_LABEL["fuxi-h7"] },
                ]}
                onChange={setNewDevice}
                className="w-[240px]"
              />
            </Row>
            <ActionRow>
              <Button onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!newName.trim()}>
                Save
              </Button>
            </ActionRow>
          </Section>
        </form>
      )}

      {status && <Notice tone={status.tone} title={status.text} />}

      <Section
        title="Saved profiles"
        footer="Profiles are stored on this computer. “Apply” writes the settings to the device; if it’s not connected only the values in the app change."
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3.5 py-10 text-center">
            <Layers aria-hidden="true" className="h-7 w-7 text-tertiary" />
            <span className="font-semibold">No profiles yet</span>
            <span className="text-xs text-secondary">
              Adjust a device’s settings, then save them with “New profile”.
            </span>
          </div>
        ) : (
          filtered.map((prof) => {
            const Icon = prof.device_id === "kb884l" ? Keyboard : Headphones;
            const date = new Date(prof.updated_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const label = isDeviceId(prof.device_id) ? DEVICE_LABEL[prof.device_id] : prof.device_id;
            const hasData = parseProfileData(prof) !== null;
            return (
              <div key={prof.id} className="flex min-h-14 flex-wrap items-center gap-3 px-3.5 py-2">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{prof.name}</span>
                  <span className="text-xs leading-[15px] text-secondary">
                    {label} · {describeProfile(prof)} · {date}
                  </span>
                </span>
                <Button
                  variant="primary"
                  onClick={() => handleApply(prof)}
                  disabled={busyId !== null || !hasData}
                  title={!connected(prof.device_id) ? "Device not connected; only the settings in the app change" : undefined}
                >
                  {busyId === prof.id ? "Applying…" : "Apply"}
                </Button>
                <Button
                  aria-label={`Export the profile ${prof.name}`}
                  title="Export"
                  onClick={() => handleExport(prof)}
                  className="w-8 px-0"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  aria-label={`Delete the profile ${prof.name}`}
                  title="Delete"
                  onClick={() => handleDelete(prof)}
                  className="w-8 px-0"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </Section>
    </>
  );
};
