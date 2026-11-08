import React from "react";
import type { FuxiAudioEndpointStatus } from "../../types";
import { useT } from "../../i18n";
import {
  Radio,
  Bluetooth,
  Cable,
  Battery,
  BatteryCharging,
  BatteryMedium,
  Zap,
  Headphones,
  Info,
} from "lucide-react";

interface HeadsetStatusBarProps {
  status: FuxiAudioEndpointStatus;
  connected: boolean;
}

export const HeadsetStatusBar: React.FC<HeadsetStatusBarProps> = ({
  status,
  connected,
}) => {
  const { t } = useT();

  const connMode = status.connection_mode ?? (connected ? "dongle" : "unknown");

  const renderConnectionPill = () => {
    if (!connected) {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-fill/40 px-2.5 py-1 text-xs text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span>{t("common.notConnected")}</span>
        </div>
      );
    }

    if (connMode === "bluetooth") {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
          <Bluetooth className="h-3.5 w-3.5 text-blue-400" />
          <span>{t("headset.conn.bluetooth")}</span>
        </div>
      );
    }

    if (connMode === "wired") {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400">
          <Cable className="h-3.5 w-3.5 text-cyan-400" />
          <span>{t("headset.conn.wired")}</span>
        </div>
      );
    }

    // Default: 2.4 GHz Dongle
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
        <span>{t("headset.conn.dongle")}</span>
      </div>
    );
  };

  const renderPowerPill = () => {
    if (!connected) return null;

    if (status.battery_level !== null && status.battery_level !== undefined) {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
          {status.is_charging ? (
            <BatteryCharging className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
          ) : (
            <BatteryMedium className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span>{t("headset.power.batteryPct", { pct: status.battery_level })}</span>
          {status.is_charging && <span className="text-[11px] text-emerald-300">({t("headset.power.charging")})</span>}
        </div>
      );
    }

    if (status.is_charging || connMode === "wired") {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>{t("headset.power.wired")}</span>
        </div>
      );
    }

    // 2.4G Dongle mode: Internal battery with audio alert
    return (
      <div
        className="group relative flex cursor-help items-center gap-1.5 rounded-full border border-border/80 bg-fill/50 px-2.5 py-1 text-xs text-secondary hover:border-border hover:text-label"
        title={t("headset.power.dongleHint")}
      >
        <Battery className="h-3.5 w-3.5 text-secondary group-hover:text-label" />
        <span>{t("headset.power.dongle")}</span>
        <Info className="h-3 w-3 text-tertiary" />
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3.5 py-2 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        {renderConnectionPill()}
        {renderPowerPill()}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-secondary">
        <Headphones className="h-3.5 w-3.5 text-tertiary" />
        <span className="truncate max-w-[200px]" title={status.speaker_name}>
          {status.speaker_name}
        </span>
      </div>
    </div>
  );
};
