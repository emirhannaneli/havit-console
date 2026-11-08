import React from "react";
import { Download, Github, Headphones, Keyboard, Layers, LayoutGrid, Terminal } from "lucide-react";
import { version as appVersion } from "../../package.json";
import type { DetectedDeviceStatus } from "../types";
import { openExternal } from "../api";
import { cx, StatusDot } from "./ui";

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

const DEVICE_ITEMS: { id: View & ("kb884l" | "fuxi-h7"); label: string; icon: React.ElementType }[] = [
  { id: "kb884l", label: "KB884L Klavye", icon: Keyboard },
  { id: "fuxi-h7", label: "Fuxi-H7 Kulaklık", icon: Headphones },
];

export const Sidebar: React.FC<SidebarProps> = ({ view, onNavigate, devices, updateCount }) => (
  <aside className="flex w-[240px] flex-none flex-col overflow-y-auto border-r border-separator bg-sidebar">
    <div className="flex h-[52px] flex-none items-center px-4 text-[13px] font-semibold">
      Havit Console
    </div>

    <nav aria-label="Kenar çubuğu" className="flex flex-col gap-0.5 px-2.5 pb-4">
      <SidebarItem
        icon={LayoutGrid}
        label="Cihazlar"
        active={view === "devices"}
        onClick={() => onNavigate("devices")}
      />
      <SidebarItem
        icon={Layers}
        label="Profiller"
        active={view === "profiles"}
        onClick={() => onNavigate("profiles")}
      />
      <SidebarItem
        icon={Download}
        label="Güncellemeler"
        active={view === "updates"}
        onClick={() => onNavigate("updates")}
        trailing={
          updateCount > 0 ? (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">
              {updateCount}
              <span className="sr-only"> güncelleme hazır</span>
            </span>
          ) : undefined
        }
      />
      <SidebarItem
        icon={Terminal}
        label="Tanılama"
        active={view === "diagnostics"}
        onClick={() => onNavigate("diagnostics")}
      />

      <span className="px-2 pt-3.5 pb-1.5 text-[11px] font-semibold text-secondary">Cihazlar</span>
      {DEVICE_ITEMS.map((item) => {
        const connected = devices.find((d) => d.id === item.id)?.connected ?? false;
        return (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={view === item.id}
            onClick={() => onNavigate(item.id)}
            trailing={
              <>
                <StatusDot on={connected} />
                <span className="sr-only">{connected ? "Bağlı" : "Bağlı değil"}</span>
              </>
            }
          />
        );
      })}
    </nav>

    <footer className="mt-auto flex h-11 flex-none items-center border-t border-separator px-3">
      <span className="w-8" aria-hidden="true" />
      <span className="flex-1 text-center text-[11px] text-secondary tabular-nums">Sürüm {appVersion}</span>
      <button
        type="button"
        aria-label="GitHub deposunu aç"
        title="GitHub"
        onClick={() => openExternal(REPO_URL)}
        className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-secondary hover:bg-fill-hover hover:text-label"
      >
        <Github aria-hidden="true" className="h-4 w-4" />
      </button>
    </footer>
  </aside>
);
