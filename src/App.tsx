import { useState, useEffect, useCallback } from "react";
import type { DetectedDeviceStatus } from "./types";
import { Navbar, type ActiveTab } from "./components/Navbar";
import { Kb884lView } from "./components/kb884l/Kb884lView";
import { FuxiH7View } from "./components/fuxi/FuxiH7View";
import { ProfilesView } from "./components/profiles/ProfilesView";
import { PacketInspectorView } from "./components/diagnostics/PacketInspectorView";
import { fetchConnectedDevices } from "./api";
import { Github, ShieldCheck, Heart } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("kb884l");
  const [devices, setDevices] = useState<DetectedDeviceStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshHardware = useCallback(async () => {
    setLoading(true);
    try {
      const devList = await fetchConnectedDevices();
      setDevices(devList);
    } catch (err) {
      console.error("Cihaz tarama hatası:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHardware();
    // Auto-refresh devices every 5 seconds
    const interval = setInterval(refreshHardware, 5000);
    return () => clearInterval(interval);
  }, [refreshHardware]);

  const kb884l = devices.find((d) => d.id === "kb884l");
  const fuxi = devices.find((d) => d.id === "fuxi-h7");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      {/* 1. Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        devices={devices}
        onRefresh={refreshHardware}
        loading={loading}
      />

      {/* 2. Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {activeTab === "kb884l" && (
          <Kb884lView connected={kb884l?.connected ?? false} />
        )}

        {activeTab === "fuxi-h7" && (
          <FuxiH7View connected={fuxi?.connected ?? false} />
        )}

        {activeTab === "profiles" && <ProfilesView />}

        {activeTab === "diagnostics" && <PacketInspectorView />}
      </main>

      {/* 3. Bottom Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 px-6 py-4 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-500" />
          <span>
            Havit Console — Açık kaynaklı ve temiz oda (clean-room) tersine mühendislikle geliştirilmiştir.
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            Topluluk için <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> ile üretildi
          </span>
          <span className="text-zinc-700">•</span>
          <span className="font-mono text-zinc-400">Tauri v2 + Rust</span>
          <span className="text-zinc-700">•</span>
          <a
            href="https://github.com/morluto/rea"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            <span>rea toolchain</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
