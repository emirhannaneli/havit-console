import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, ChevronLeft, Download, PanelLeft, RefreshCw } from "lucide-react";
import type {
  DetectedDeviceStatus,
  FirmwareUpdate,
  FirmwareUpdateCheck,
} from "./types";
import { Sidebar, type View } from "./components/Sidebar";
import { DevicesView } from "./components/DevicesView";
import { Kb884lView } from "./components/kb884l/Kb884lView";
import { FuxiH7View } from "./components/fuxi/FuxiH7View";
import { ProfilesView } from "./components/profiles/ProfilesView";
import { PacketInspectorView } from "./components/diagnostics/PacketInspectorView";
import { AUTO_CHECK_PREF, UpdatesView } from "./components/updates/UpdatesView";
import { useAppUpdate } from "./components/updates/useAppUpdate";
import { FirmwareDialog } from "./components/updates/FirmwareDialog";
import { ONBOARDED_PREF, OnboardingSheet } from "./components/OnboardingSheet";
import { Button, readPref, Select, StatusDot } from "./components/ui";
import { checkFirmwareUpdates, fetchConnectedDevices } from "./api";
import { DeviceSettingsProvider } from "./state/DeviceSettings";
import { reportInventory } from "./telemetry";
import { LANGUAGES, useT, type MessageKey } from "./i18n";

const TITLES: Record<View, MessageKey> = {
  devices: "app.title.devices",
  kb884l: "device.kb884l",
  "fuxi-h7": "device.fuxi",
  profiles: "app.title.profiles",
  updates: "app.title.updates",
  diagnostics: "app.title.diagnostics",
};

export default function App() {
  const { t, lang, setLang } = useT();
  const [view, setView] = useState<View>("devices");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [devices, setDevices] = useState<DetectedDeviceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(
    () => !readPref(ONBOARDED_PREF, false),
  );
  const [updateCheck, setUpdateCheck] = useState<FirmwareUpdateCheck | null>(
    null,
  );
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [installing, setInstalling] = useState<FirmwareUpdate | null>(null);
  const appUpdate = useAppUpdate();
  const checkApp = appUpdate.check;

  const runUpdateCheck = useCallback(async () => {
    setCheckingUpdates(true);
    void checkApp();
    try {
      setUpdateCheck(await checkFirmwareUpdates());
      setUpdateError(null);
      setLastChecked(new Date());
    } catch (err) {
      setUpdateError(String(err));
    } finally {
      setCheckingUpdates(false);
    }
  }, [checkApp]);

  useEffect(() => {
    if (readPref(AUTO_CHECK_PREF, true)) runUpdateCheck();
  }, [runUpdateCheck]);

  const updateCount =
    (updateCheck?.updates.length ?? 0) +
    (appUpdate.state.phase === "available" ? 1 : 0);

  // `loading` only reflects a scan the user asked for; the background poll stays silent.
  const refreshHardware = useCallback(async (manual = false) => {
    if (manual) setLoading(true);
    try {
      const devList = await fetchConnectedDevices();
      setDevices(devList);
      setScanError(null);
      void reportInventory(devList);
    } catch (err) {
      console.error("Device scan failed:", err);
      setScanError(String(err));
    } finally {
      if (manual) setLoading(false);
    }
  }, []);

  const scanNow = useCallback(() => refreshHardware(true), [refreshHardware]);

  useEffect(() => {
    refreshHardware();
    // Auto-refresh devices every 5 seconds
    const interval = setInterval(() => refreshHardware(), 5000);
    return () => clearInterval(interval);
  }, [refreshHardware]);

  const kb884l = devices.find((d) => d.id === "kb884l");
  const fuxi = devices.find((d) => d.id === "fuxi-h7");
  const currentDevice =
    view === "kb884l" ? kb884l : view === "fuxi-h7" ? fuxi : undefined;
  const isDeviceView = view === "kb884l" || view === "fuxi-h7";

  return (
    <DeviceSettingsProvider>
      <div className="flex h-full bg-window text-label">
        {sidebarOpen && (
          <Sidebar
            view={view}
            onNavigate={setView}
            devices={devices}
            updateCount={updateCount}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] flex-none items-center gap-2 border-b border-separator bg-sidebar px-4">
            <Button
              variant="plain"
              aria-label={sidebarOpen ? t("app.sidebar.hide") : t("app.sidebar.show")}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((o) => !o)}
              className="h-8 w-8 px-0 text-secondary"
            >
              <PanelLeft aria-hidden="true" className="h-[18px] w-[18px]" />
            </Button>
            {isDeviceView && (
              <Button
                variant="plain"
                aria-label={t("app.back")}
                onClick={() => setView("devices")}
                className="h-8 w-8 px-0 text-secondary"
              >
                <ChevronLeft aria-hidden="true" className="h-[18px] w-[18px]" />
              </Button>
            )}
            <h1 className="m-0 ml-1 mr-auto flex min-w-0 items-center gap-2.5 text-[15px] leading-5 font-semibold">
              <span className="truncate">{t(TITLES[view])}</span>
              {isDeviceView && (
                <span className="flex flex-none items-center gap-1.5 text-xs font-normal text-secondary">
                  <StatusDot on={currentDevice?.connected ?? false} />
                  {currentDevice?.connected ? t("common.connected") : t("common.notConnected")}
                </span>
              )}
            </h1>
            <Select
              label={t("common.language")}
              value={lang}
              options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
              onChange={setLang}
              className="h-8 min-w-0! border-transparent bg-transparent text-secondary hover:bg-fill"
            />
            <Button
              variant="plain"
              onClick={scanNow}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
              {loading ? t("app.scanning") : t("app.scan")}
            </Button>
          </header>

          {appUpdate.state.phase === "available" && view !== "updates" && (
            <div className="flex items-center justify-between gap-3 border-b border-accent/30 bg-accent/15 px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Download aria-hidden="true" className="h-4 w-4 flex-none text-accent" />
                <span className="font-medium text-label">
                  {t("updates.app.available", { version: appUpdate.state.version ?? "" })}
                </span>
              </div>
              <Button variant="primary" onClick={() => setView("updates")}>
                {t("updates.app.install")}
              </Button>
            </div>
          )}

          {appUpdate.state.phase === "ready" && (
            <div className="flex items-center justify-between gap-3 border-b border-success/30 bg-success/15 px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 flex-none text-success" />
                <span className="font-medium text-label">
                  {t("updates.app.ready", { version: appUpdate.state.version ?? "" })}
                </span>
              </div>
              <Button variant="primary" onClick={appUpdate.restart}>
                {t("updates.app.relaunch")}
              </Button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-4 pt-6 pb-10 sm:px-8">
            <div
              className={`mx-auto flex flex-col gap-6 ${view === "diagnostics" ? "max-w-[1040px]" : "max-w-[880px]"}`}
            >
              {view === "devices" && (
                <DevicesView
                  devices={devices}
                  loading={loading}
                  scanError={scanError}
                  onOpen={setView}
                  updateCount={updateCount}
                />
              )}
              {view === "kb884l" && (
                <Kb884lView connected={kb884l?.connected ?? false} />
              )}
              {view === "fuxi-h7" && (
                <FuxiH7View connected={fuxi?.connected ?? false} />
              )}
              {view === "profiles" && <ProfilesView devices={devices} />}
              {view === "updates" && (
                <UpdatesView
                  app={appUpdate}
                  devices={devices}
                  check={updateCheck}
                  checking={checkingUpdates}
                  checkError={updateError}
                  lastChecked={lastChecked}
                  onCheck={runUpdateCheck}
                  onInstall={setInstalling}
                />
              )}
              {view === "diagnostics" && <PacketInspectorView />}
            </div>
          </main>
        </div>
        <OnboardingSheet
          open={onboarding}
          devices={devices}
          scanning={loading}
          onDone={() => setOnboarding(false)}
        />
        <FirmwareDialog
          update={installing}
          onClose={() => {
            setInstalling(null);
            runUpdateCheck();
          }}
        />
      </div>
    </DeviceSettingsProvider>
  );
}
