import React from "react";
import { Download, Github, Headphones, Keyboard, Layers, LayoutGrid, Terminal } from "lucide-react";
import { version as appVersion } from "../../package.json";
import type { DetectedDeviceStatus } from "../types";
import { openExternal } from "../api";
import { useT, type MessageKey } from "../i18n";
import { cx, StatusDot } from "./ui";
import { BetaBadge } from "./DevicesView";
import { LogoMark } from "./Logo";

export const REPO_URL = "https://github.com/emirhannaneli/havit-console";

export type View = "devices" | "kb884l" | "fuxi-h7" | "profiles" | "updates" | "diagnostics";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  devices: DetectedDeviceStatus[];
  updateCount: number;
}

const SidebarItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}> = ({ icon: Icon, label, active, onClick, trailing }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className={cx(
      "flex h-11 w-full items-center gap-2.5 rounded-[7px] border-0 px-2 text-left",
      active ? "bg-fill font-medium text-label" : "bg-transparent text-label hover:bg-fill-hover"
    )}
  >
    <span
      className={cx(
        "flex h-6 w-6 flex-none items-center justify-center rounded-md",
        active ? "bg-accent text-on-accent" : "bg-fill text-accent-text"
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
    </span>
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {trailing}
  </button>
);

const DEVICE_ITEMS: { id: View & ("kb884l" | "fuxi-h7"); labelKey: MessageKey; icon: React.ElementType }[] = [
  { id: "kb884l", labelKey: "device.kb884l", icon: Keyboard },
  { id: "fuxi-h7", labelKey: "device.fuxi", icon: Headphones },
];

export const Sidebar: React.FC<SidebarProps> = ({ view, onNavigate, devices, updateCount }) => {
  const { t, tp } = useT();
  return (
    <aside className="flex w-[240px] flex-none flex-col overflow-y-auto border-r border-separator bg-sidebar">
      <div className="flex h-[52px] flex-none items-center gap-2 px-4 text-[13px] font-semibold">
        <LogoMark size={20} />
        Havit Console
        <BetaBadge />
      </div>

      <nav aria-label={t("sidebar.nav")} className="flex flex-col gap-0.5 px-2.5 pb-4">
        <SidebarItem
          icon={LayoutGrid}
          label={t("app.title.devices")}
          active={view === "devices"}
          onClick={() => onNavigate("devices")}
        />
        <SidebarItem
          icon={Layers}
          label={t("app.title.profiles")}
          active={view === "profiles"}
          onClick={() => onNavigate("profiles")}
        />
        <SidebarItem
          icon={Download}
          label={t("app.title.updates")}
          active={view === "updates"}
          onClick={() => onNavigate("updates")}
          trailing={
            updateCount > 0 ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">
                <span aria-hidden="true">{updateCount}</span>
                <span className="sr-only">{tp("sidebar.updatesAvailable", updateCount)}</span>
              </span>
            ) : undefined
          }
        />

        <span className="px-2 pt-3.5 pb-1.5 text-[11px] font-semibold text-secondary">{t("sidebar.devicesGroup")}</span>
        {DEVICE_ITEMS.map((item) => {
          const connected = devices.find((d) => d.id === item.id)?.connected ?? false;
          return (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={t(item.labelKey)}
              active={view === item.id}
              onClick={() => onNavigate(item.id)}
              trailing={
                <>
                  <StatusDot on={connected} />
                  <span className="sr-only">{connected ? t("common.connected") : t("common.notConnected")}</span>
                </>
              }
            />
          );
        })}
      </nav>

      <footer className="mt-auto flex h-11 flex-none items-center border-t border-separator px-3">
        <button
          type="button"
          aria-label={t("app.title.diagnostics")}
          aria-current={view === "diagnostics" ? "page" : undefined}
          title={t("app.title.diagnostics")}
          onClick={() => onNavigate("diagnostics")}
          className={cx(
            "flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent hover:bg-fill-hover hover:text-label",
            view === "diagnostics" ? "bg-fill text-label" : "text-secondary"
          )}
        >
          <Terminal aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="flex-1 text-center text-[11px] text-secondary tabular-nums">
          {t("sidebar.footer", { version: appVersion })}
        </span>
        <button
          type="button"
          aria-label={t("sidebar.github")}
          title="GitHub"
          onClick={() => openExternal(REPO_URL)}
          className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-secondary hover:bg-fill-hover hover:text-label"
        >
          <Github aria-hidden="true" className="h-4 w-4" />
        </button>
      </footer>
    </aside>
  );
};
