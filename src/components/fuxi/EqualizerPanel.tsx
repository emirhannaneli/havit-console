import React from "react";
import { RotateCcw } from "lucide-react";
import { Button, Row, Section, Segmented } from "../ui";
import { currentLang, translate, useT, type Lang, type MessageKey } from "../../i18n";

export interface EqBand {
  freq: string;
  gain: number; // -20..+20 dB
}

/** Band gain limit in dB (each band spans -EQ_MAX..+EQ_MAX). */
const EQ_MAX = 20;

export const EQ_FREQUENCIES = [
  "30 Hz",
  "60 Hz",
  "120 Hz",
  "250 Hz",
  "500 Hz",
  "1 kHz",
  "2 kHz",
  "4 kHz",
  "8 kHz",
  "16 kHz",
];

export const EQ_PRESETS: Record<string, number[]> = {
  Default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  "Treble Boost": [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  "Rock": [5, 3, -1, -2, 1, 3, 5, 6, 7, 7],
  "Live": [-2, 0, 2, 3, 4, 4, 3, 2, 2, 1],
  "Dance": [6, 5, 2, 0, -1, 2, 4, 5, 4, 3],
  "FPS Footsteps": [2, 4, 6, 3, 0, 2, 5, 6, 4, 2],
  "Valorant Clarity": [1, 2, 3, 1, 0, 3, 6, 7, 5, 3],
};

/** Display label for a preset id ("Custom" for anything not in EQ_PRESETS). */
export const eqPresetLabel = (name: string, lang: Lang = currentLang()) =>
  name in EQ_PRESETS ? translate(lang, `eq.preset.${name}` as MessageKey) : translate(lang, "eq.custom");

interface EqualizerPanelProps {
  bands: number[];
  onChange: (newBands: number[]) => void;
  preamp: number;
  onPreampChange: (preamp: number) => void;
  /** Active preset name; "Custom" once a band is edited by hand. */
  preset: string;
  onPresetChange: (preset: string) => void;
}

export const EqualizerPanel: React.FC<EqualizerPanelProps> = ({
  bands,
  onChange,
  preamp,
  onPreampChange,
  preset: activePreset,
  onPresetChange,
}) => {
  const { t, lang } = useT();
  const handleBandChange = (index: number, val: number) => {
    const updated = [...bands];
    updated[index] = val;
    onChange(updated);
    onPresetChange("Custom");
  };

  const handleApplyPreset = (name: string, gains: number[]) => {
    onPresetChange(name);
    onChange([...gains]);
  };

  const handleReset = () => {
    handleApplyPreset("Default", EQ_PRESETS["Default"]);
    onPreampChange(0);
  };

  const presetNames = Object.keys(EQ_PRESETS);
  const isCustom = !presetNames.includes(activePreset);

  return (
    <Section
      title={t("eq.title")}
      action={
        <Button variant="plain" onClick={handleReset} className="h-6 px-2 text-xs text-accent-text">
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          {t("eq.reset")}
        </Button>
      }
      footer={t("eq.footer")}
    >
      <Row label={t("eq.preset")}>
        <Segmented
          label={t("eq.preset")}
          value={isCustom ? "Custom" : activePreset}
          options={[
            ...presetNames.map((name) => ({ id: name, label: eqPresetLabel(name, lang) })),
            { id: "Custom", label: t("eq.custom") },
          ]}
          onChange={(name) => {
            if (name in EQ_PRESETS) handleApplyPreset(name, EQ_PRESETS[name]);
            else onPresetChange("Custom");
          }}
        />
      </Row>

      <div className="overflow-x-auto px-3.5 pt-4 pb-3">
        <div className="flex min-w-[560px] items-stretch gap-1.5">
          <div
            aria-hidden="true"
            className="mt-5 flex h-40 w-8 flex-none flex-col justify-between text-right text-[11px] text-secondary tabular-nums"
          >
            <span>+{EQ_MAX}</span>
            <span>0</span>
            <span>−{EQ_MAX}</span>
          </div>
          {EQ_FREQUENCIES.map((freq, idx) => {
            const val = bands[idx] ?? 0;
            // Position from the top of the 160 px track, as a percentage (0 dB = 50%).
            const pos = 50 - (val / EQ_MAX) * 50;
            return (
              <label key={freq} className="flex flex-1 cursor-pointer flex-col items-center gap-1.5">
                <span className="h-3.5 text-[11px] tabular-nums">{val > 0 ? `+${val}` : val}</span>
                <span className="relative flex h-40 w-full justify-center">
                  <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-control-border" />
                  <span aria-hidden="true" className="h-full w-1 rounded-full bg-control" />
                  <span
                    aria-hidden="true"
                    className="absolute w-1 rounded-full bg-accent"
                    style={{ top: `${Math.min(pos, 50)}%`, height: `${Math.abs(50 - pos)}%` }}
                  />
                  <input
                    type="range"
                    min={-EQ_MAX}
                    max={EQ_MAX}
                    step={1}
                    value={val}
                    aria-label={t("eq.band", { freq })}
                    aria-valuetext={`${val} dB`}
                    onChange={(e) => handleBandChange(idx, Number(e.target.value))}
                    className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                    style={{ writingMode: "vertical-lr", direction: "rtl" }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] peer-focus-visible:ring-2 peer-focus-visible:ring-focus"
                    style={{ top: `${pos}%` }}
                  />
                </span>
                <span className="text-[11px] whitespace-nowrap text-secondary">{freq}</span>
              </label>
            );
          })}
        </div>
      </div>
    </Section>
  );
};
