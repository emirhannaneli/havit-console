import React, { useState, useEffect } from "react";
import type { KeyDef, Kb884lLightingConfig, Kb884lPhysicalLayout } from "../../types";
import { useT } from "../../i18n";

interface KeyboardSvgLayoutProps {
  layout: Kb884lPhysicalLayout;
  lighting: Kb884lLightingConfig;
  /** Shown as a caption on the chassis, e.g. "Breath". */
  effectName: string;
  previewUrl: string | null;
  onKeySelect?: (key: KeyDef) => void;
  selectedKey: KeyDef | null;
}

/**
 * Approximates the keyboard's lighting effects with CSS animations (keyframes live in
 * index.css as `kb-*`). Vendor mode ids: 0 off, 1 static, 2/3 press on/off, 4 glittering,
 * 5 falling, 6 colourful, 7 breath, 8 spectrum, 9 outward, 10 scrolling, 11 rolling,
 * 12 rotating, 13 explode, 14 launch, 15 ripples, 16 flowing, 17 pulsating, 18 tilt, 19 shuttle.
 */
function glowStyle(
  k: KeyDef,
  lighting: Kb884lLightingConfig,
  width: number,
  height: number
): { stroke: string; style: React.CSSProperties; baseOpacity: number } {
  const { mode, speed, direction, random_color } = lighting;
  const duration = 0.8 + (5 - Math.min(5, speed)) * 0.5; // seconds per cycle
  const hueOf = (k.key_index * 47) % 360;
  const perKeyColor = random_color || mode === 6 || mode === 8;
  const stroke = perKeyColor
    ? `hsl(${mode === 8 ? 0 : hueOf} 90% 60%)`
    : `rgb(${lighting.r}, ${lighting.g}, ${lighting.b})`;

  const cx = k.x + k.w / 2;
  const cy = k.y + k.h / 2;
  const fx = cx / width; // 0..1 across
  const fy = cy / height; // 0..1 down
  const radial = Math.hypot(cx - width / 2, cy - height / 2) / Math.hypot(width / 2, height / 2);
  const angle = (Math.atan2(cy - height / 2, cx - width / 2) + Math.PI) / (2 * Math.PI);
  const reversed = direction === 1 || direction === 2;
  const along = (f: number) => (reversed ? 1 - f : f);
  const anim = (name: string, phase: number, dur = duration) => ({
    animation: `${name} ${dur}s ease-in-out ${-phase * dur}s infinite`,
  });

  switch (mode) {
    case 0:
      return { stroke, style: {}, baseOpacity: 0 };
    case 2: // lights on press: idle keys stay dark
      return { stroke, style: {}, baseOpacity: 0.08 };
    case 4: // glittering: sparse random twinkles
      return { stroke, style: anim("kb-twinkle", ((k.key_index * 7919) % 100) / 100, duration * 3), baseOpacity: 1 };
    case 7:
      return { stroke, style: anim("kb-breath", 0), baseOpacity: 1 };
    case 17:
      return { stroke, style: anim("kb-breath", 0, duration / 2), baseOpacity: 1 };
    case 6:
    case 8:
      return { stroke, style: anim("kb-hue", mode === 8 ? along(fx) * 0.25 : 0, duration * 3), baseOpacity: 1 };
    case 5: // falling
    case 11: // rolling
      return { stroke, style: anim("kb-wave", along(fy)), baseOpacity: 1 };
    case 14: // launch: bottom to top
      return { stroke, style: anim("kb-wave", 1 - fy), baseOpacity: 1 };
    case 10:
    case 16:
    case 18:
    case 19:
      return { stroke, style: anim("kb-wave", along(fx)), baseOpacity: 1 };
    case 9: // outward
    case 13: // explode
    case 15: // ripples
      return { stroke, style: anim("kb-wave", radial), baseOpacity: 1 };
    case 12: // rotating
      return { stroke, style: anim("kb-wave", angle), baseOpacity: 1 };
    case 1:
    case 3:
    default:
      return { stroke, style: {}, baseOpacity: 1 };
  }
}

export const KeyboardSvgLayout: React.FC<KeyboardSvgLayoutProps> = ({
  layout,
  lighting,
  effectName,
  previewUrl,
  onKeySelect,
  selectedKey,
}) => {
  const { t } = useT();
  const [clockString, setClockString] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockString(
        now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const width = layout.canvas_width || 800;
  const height = layout.canvas_height || 300;
  const brightness = 0.25 + Math.min(5, lighting.brightness) * 0.15; // 0.25..1

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full min-w-[640px] select-none"
        role="group"
        aria-label={t("keyboard.layout")}
      >
        <defs>
          <filter id="rgbGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Chassis */}
        <rect
          x="4"
          y="6"
          width={width - 8}
          height={height - 12}
          rx="14"
          className="fill-window stroke-separator"
          strokeWidth="2"
        />
        <text
          x={width - 18}
          y={height - 14}
          textAnchor="end"
          className="fill-secondary"
          fontSize="10"
          fontWeight="600"
          style={{ pointerEvents: "none" }}
        >
          {lighting.mode === 0 ? t("keyboard.lightsOff") : t("keyboard.effectCaption", { effect: effectName })}
        </text>

        {/* Mini TFT screen bezel */}
        <rect
          x={layout.screen.x - 4}
          y={layout.screen.y - 4}
          width={layout.screen.w + 8}
          height={layout.screen.h + 8}
          rx="6"
          className="fill-black stroke-control-border"
          strokeWidth="1.5"
        />

        {/* Mini TFT active area (160x96 native) */}
        <foreignObject
          x={layout.screen.x}
          y={layout.screen.y}
          width={layout.screen.w}
          height={layout.screen.h}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded bg-black">
            {previewUrl ? (
              <img src={previewUrl} alt="Screen preview" className="pixelated h-full w-full object-cover" />
            ) : (
              <span className="font-mono text-[10px] font-bold tracking-wider text-[#ffb266]">
                {clockString}
              </span>
            )}
          </div>
        </foreignObject>

        {layout.keys.map((k) => {
          const isSelected = selectedKey?.key_index === k.key_index;
          const glow = glowStyle(k, lighting, width, height);
          return (
            <g
              key={k.key_index}
              role="button"
              tabIndex={0}
              aria-label={t("keyboard.key", { key: k.label })}
              aria-pressed={isSelected}
              onClick={() => onKeySelect?.(k)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onKeySelect?.(k);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>rect:nth-child(2)]:stroke-focus"
            >
              {/* Per-key RGB underglow; the inner group carries the effect animation */}
              <g opacity={glow.baseOpacity * brightness}>
                <g style={glow.style}>
                  <rect
                    x={k.x - 1}
                    y={k.y - 1}
                    width={k.w + 2}
                    height={k.h + 2}
                    rx="6"
                    fill="none"
                    stroke={glow.stroke}
                    strokeWidth="3"
                    filter="url(#rgbGlowFilter)"
                  />
                </g>
              </g>
              {/* Keycap */}
              <rect
                x={k.x}
                y={k.y}
                width={k.w}
                height={k.h}
                rx="5"
                className={isSelected ? "fill-key-on stroke-label" : "fill-key stroke-key-border"}
                strokeWidth={isSelected ? "1.5" : "1"}
              />
              <text
                x={k.x + k.w / 2}
                y={k.y + k.h / 2 + 3.5}
                textAnchor="middle"
                className="fill-label"
                fontSize={k.label.length > 3 ? "9" : "11"}
                fontWeight="500"
                style={{ pointerEvents: "none" }}
              >
                {k.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
