import React from "react";
import {
  Keyboard,
  Headphones,
  Sliders,
  Terminal,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { DetectedDeviceStatus } from "../types";

export type ActiveTab = "kb884l" | "fuxi-h7" | "profiles" | "diagnostics";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  devices: DetectedDeviceStatus[];
  onRefresh: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  devices,
  onRefresh,
  loading,
}) => {
  const kb884l = devices.find((d) => d.id === "kb884l");
  const fuxi = devices.find((d) => d.id === "fuxi-h7");

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-6 flex items-center justify-between select-none sticky top-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-base text-zinc-100">
              HAVIT<span className="text-rose-500">CONSOLE</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Open Source v0.1
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-normal">
            Birleşik Havit Donanım Kontrol Merkezi
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab("kb884l")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "kb884l"
              ? "bg-zinc-800 text-white shadow-sm shadow-zinc-950/50"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <Keyboard className="w-4 h-4 text-rose-400" />
          <span>KB884L Klavye</span>
          {kb884l?.connected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("fuxi-h7")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "fuxi-h7"
              ? "bg-zinc-800 text-white shadow-sm shadow-zinc-950/50"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <Headphones className="w-4 h-4 text-cyan-400" />
          <span>Fuxi-H7 Kulaklık</span>
          {fuxi?.connected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("profiles")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "profiles"
              ? "bg-zinc-800 text-white shadow-sm shadow-zinc-950/50"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Profiller</span>
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "diagnostics"
              ? "bg-zinc-800 text-white shadow-sm shadow-zinc-950/50"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>HID İzleyici</span>
        </button>
      </nav>

      {/* Right Hardware Status & Refresh */}
      <div className="flex items-center gap-3">
        {/* Device Badges */}
        <div className="hidden lg:flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              kb884l?.connected
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            {kb884l?.connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span>KB884L (05AC:024F)</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              fuxi?.connected
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            {fuxi?.connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span>FUXI-H7 (040B:0897)</span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          title="Donanımları Yeniden Tara"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-400" : ""}`} />
        </button>
      </div>
    </header>
  );
};
