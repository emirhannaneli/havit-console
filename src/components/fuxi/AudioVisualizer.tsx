import React, { useMemo } from "react";
import { cx } from "../ui";

interface AudioVisualizerProps {
  left: number; // 0..1
  right: number; // 0..1
  active?: boolean;
  className?: string;
}

/**
 * 16-bar stereo audio visualizer that animates smoothly with system audio.
 * Bars 0..7 respond to the left channel; bars 8..15 respond to the right channel.
 */
export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  left,
  right,
  active = true,
  className,
}) => {
  // Shape weights simulate natural frequency distribution (bass -> mids -> treble)
  const barHeights = useMemo(() => {
    const weights = [
      0.95, 0.85, 0.75, 0.9, 0.65, 0.55, 0.45, 0.35, // Left channel
      0.35, 0.45, 0.55, 0.65, 0.9, 0.75, 0.85, 0.95, // Right channel
    ];

    return weights.map((w, i) => {
      if (!active) return 3;
      const peak = i < 8 ? left : right;
      if (peak <= 0.005) return 3;
      // Calculate dynamic height between 3px (min) and 36px (max)
      const dynamic = Math.pow(peak, 0.8) * w * 33;
      return Math.max(3, Math.min(36, Math.round(dynamic + 3)));
    });
  }, [left, right, active]);

  return (
    <div
      aria-hidden="true"
      className={cx(
        "flex h-11 items-center justify-center gap-1 rounded-lg border border-separator bg-fill/40 px-3 py-1.5 backdrop-blur-sm",
        className
      )}
    >
      {barHeights.map((h, i) => (
        <span
          key={i}
          className={cx(
            "w-1.5 rounded-full transition-all duration-75",
            h > 4 ? "bg-accent opacity-90 shadow-[0_0_8px_rgba(255,146,48,0.4)]" : "bg-secondary/25"
          )}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
};

interface VuMeterProps {
  level: number; // 0..1
  muted?: boolean;
  className?: string;
  label?: string;
}

/**
 * Sleek horizontal audio level meter (VU meter) with green -> amber -> accent gradient.
 */
export const VuMeter: React.FC<VuMeterProps> = ({
  level,
  muted = false,
  className,
  label,
}) => {
  // Acoustic perception curve: human hearing and mic meters perceive loudness logarithmically.
  // Ambient room noise (< 0.008) stays 0; normal speech (0.05..0.25) maps to 20%..50%.
  const normalized = Math.max(0, Math.min(1, level));
  const scaled = normalized <= 0.008 ? 0 : Math.pow(normalized, 0.6);
  const pct = muted ? 0 : Math.round(scaled * 100);

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-fill border border-control-border/40">
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-75 ease-out",
            pct > 80
              ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-accent"
              : pct > 40
              ? "bg-gradient-to-r from-emerald-500 to-amber-400"
              : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && (
        <span className="text-[10px] text-secondary text-right tabular-nums">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Pulsing soundwave halo for icons.
 */
export const PulseHalo: React.FC<{
  level: number; // 0..1
  children: React.ReactNode;
  className?: string;
}> = ({ level, children, className }) => {
  const normalized = Math.max(0, Math.min(1, level));
  const intensity = normalized <= 0.008 ? 0 : Math.pow(normalized, 0.6);
  const active = intensity > 0.06;

  return (
    <div className={cx("relative inline-flex items-center justify-center", className)}>
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-accent/25 transition-transform duration-75 ease-out pointer-events-none"
          style={{
            transform: `scale(${1 + intensity * 0.7})`,
            opacity: Math.min(0.85, intensity * 0.9),
          }}
        />
      )}
      {children}
    </div>
  );
};

interface AmbientAudioGlowProps {
  left?: number; // 0..1
  right?: number; // 0..1
  peak?: number; // 0..1
  micPeak?: number; // 0..1
  active?: boolean;
}

/**
 * Subtle, dim ambient audio-reactive motions and glow along page edges and backdrop.
 * Perfectly non-intrusive: breathes gently with stereo audio playback and microphone activity.
 */
export const AmbientAudioGlow: React.FC<AmbientAudioGlowProps> = ({
  left = 0,
  right = 0,
  peak = 0,
  micPeak = 0,
  active = true,
}) => {
  const normLeft = Math.max(0, Math.min(1, left));
  const normRight = Math.max(0, Math.min(1, right));
  const normPeak = Math.max(0, Math.min(1, peak));
  const normMic = Math.max(0, Math.min(1, micPeak));

  // Perception scaling: room silence (< 0.01) is 0; gentle sounds glow softly (3% - 16%)
  const leftGlow = active && normLeft > 0.01 ? Math.min(0.2, Math.pow(normLeft, 0.7) * 0.25) : 0;
  const rightGlow = active && normRight > 0.01 ? Math.min(0.2, Math.pow(normRight, 0.7) * 0.25) : 0;
  const topGlow = active && normPeak > 0.01 ? Math.min(0.14, Math.pow(normPeak, 0.6) * 0.18) : 0;
  const micGlow = normMic > 0.02 ? Math.min(0.18, Math.pow(normMic, 0.6) * 0.22) : 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Top ambient diffuse radial bloom */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[80vw] max-w-[1200px] rounded-full transition-all duration-150 ease-out"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255, 146, 48, 0.45) 0%, rgba(255, 146, 48, 0.1) 45%, transparent 75%)",
          opacity: topGlow,
          transform: `translateX(-50%) scale(${1 + normPeak * 0.15})`,
        }}
      />

      {/* Left edge stereo ambient glow */}
      <div
        className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-accent/35 via-accent/10 to-transparent transition-all duration-150 ease-out"
        style={{
          opacity: leftGlow,
          transform: `scaleX(${1 + normLeft * 0.25})`,
          transformOrigin: "left center",
        }}
      />

      {/* Right edge stereo ambient glow */}
      <div
        className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-accent/35 via-accent/10 to-transparent transition-all duration-150 ease-out"
        style={{
          opacity: rightGlow,
          transform: `scaleX(${1 + normRight * 0.25})`,
          transformOrigin: "right center",
        }}
      />

      {/* Bottom subtle microphone speech ripple */}
      {micGlow > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-emerald-500/25 via-emerald-500/5 to-transparent transition-all duration-150 ease-out"
          style={{
            opacity: micGlow,
          }}
        />
      )}
    </div>
  );
};
