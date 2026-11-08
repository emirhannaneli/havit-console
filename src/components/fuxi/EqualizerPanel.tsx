import React from "react";
import { RotateCcw } from "lucide-react";
import { Button, Row, Section, Select } from "../ui";

export interface EqBand {
  freq: string;
  gain: number; // -20..+20 dB
}

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
      title="Equalizer"
      action={
        <Button variant="plain" onClick={handleReset} className="h-6 px-2 text-xs text-accent-text">
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Reset
        </Button>
      }
      footer="10 bands · ±20 dB. Editing a band switches the preset to “Custom”."
    >
      <Row label="Preset" htmlFor="eq-preset">
        <Select
          id="eq-preset"
          value={isCustom ? "__custom" : activePreset}
          options={[
            ...presetNames.map((name) => ({ value: name, label: name })),
            ...(isCustom ? [{ value: "__custom", label: "Custom", disabled: true }] : []),
          ]}
          onChange={(name) => {
            if (name in EQ_PRESETS) handleApplyPreset(name, EQ_PRESETS[name]);
          }}
          className="min-w-[220px]"
        />
      </Row>

      <div className="overflow-x-auto px-3.5 pt-4 pb-3">
        <div className="flex min-w-[560px] items-stretch gap-1.5">
          <div
            aria-hidden="true"
            className="mt-5 flex h-40 w-8 flex-none flex-col justify-between text-right text-[11px] text-secondary tabular-nums"
          >
            <span>+20</span>
            <span>0</span>
            <span>−20</span>
          </div>
          {EQ_FREQUENCIES.map((freq, idx) => {
            const val = bands[idx] ?? 0;
            return (
              <label key={freq} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="h-3.5 text-[11px] tabular-nums">{val > 0 ? `+${val}` : val}</span>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={1}
                  value={val}
                  aria-label={`${freq} gain`}
                  aria-valuetext={`${val} dB`}
                  onChange={(e) => handleBandChange(idx, Number(e.target.value))}
                  className="h-40 w-6"
                  style={{ writingMode: "vertical-lr", direction: "rtl" }}
                />
                <span className="text-[11px] whitespace-nowrap text-secondary">{freq}</span>
              </label>
            );
          })}
        </div>
      </div>
    </Section>
  );
};
