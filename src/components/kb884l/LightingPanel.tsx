import React from "react";
import type { Kb884lLightingConfig } from "../../types";
import { ActionRow, Button, Row, Section, Segmented, Select, Slider, Switch, cx, type StatusMessage } from "../ui";

// Mode ids as DeviceDriver.exe lists them (0x439a50). 20 (per-key custom) needs per-key data
// and is not offered here.
const LIGHTING_MODES = [
  { id: 1, name: "Sabit" },
  { id: 7, name: "Nefes" },
  { id: 6, name: "Renkli" },
  { id: 8, name: "Spektrum" },
  { id: 15, name: "Dalgacık" },
  { id: 2, name: "Basınca yanar" },
  { id: 3, name: "Basınca söner" },
  { id: 4, name: "Parıltı" },
  { id: 5, name: "Düşen" },
  { id: 9, name: "Dışa doğru" },
  { id: 10, name: "Kayan" },
  { id: 11, name: "Yuvarlanan" },
  { id: 12, name: "Dönen" },
  { id: 13, name: "Patlama" },
  { id: 14, name: "Fırlatma" },
  { id: 16, name: "Akış" },
  { id: 17, name: "Nabız" },
  { id: 18, name: "Eğim" },
  { id: 19, name: "Mekik" },
  { id: 0, name: "Işıklar kapalı" },
];

export const lightingModeName = (id: number) =>
  LIGHTING_MODES.find((m) => m.id === id)?.name ?? `Efekt ${id}`;

/** Modes that draw their own colors, so the preset color is ignored. */
const NO_COLOR_MODES = new Set([0, 6, 8]);

/** Direction values per mode (0x42e810): [normal, reversed]. */
const DIRECTION_VALUES: Record<number, [number, number]> = {
  10: [3, 2],
  11: [0, 1],
  16: [0, 1],
  18: [0, 1],
};

/** Vendor default direction when switching to a mode. */
const defaultDirection = (mode: number) => DIRECTION_VALUES[mode]?.[0] ?? 0;

const PRESET_COLORS = [
  { name: "Turuncu", r: 255, g: 146, b: 48, hex: "#ff9230" },
  { name: "Kırmızı", r: 255, g: 69, b: 58, hex: "#ff453a" },
  { name: "Sarı", r: 255, g: 214, b: 10, hex: "#ffd60a" },
  { name: "Yeşil", r: 48, g: 209, b: 88, hex: "#30d158" },
  { name: "Camgöbeği", r: 100, g: 210, b: 255, hex: "#64d2ff" },
  { name: "Mavi", r: 10, g: 132, b: 255, hex: "#0a84ff" },
  { name: "Mor", r: 191, g: 90, b: 242, hex: "#bf5af2" },
  { name: "Pembe", r: 255, g: 55, b: 95, hex: "#ff375f" },
  { name: "Beyaz", r: 242, g: 242, b: 247, hex: "#f2f2f7" },
];

interface LightingPanelProps {
  config: Kb884lLightingConfig;
  onChange: (newCfg: Kb884lLightingConfig) => void;
  onApply: () => void;
  applying: boolean;
  statusMessage: StatusMessage | null;
  /** Where the shown values came from. */
  note?: string;
}

export const LightingPanel: React.FC<LightingPanelProps> = ({
  config,
  onChange,
  onApply,
  applying,
  statusMessage,
  note,
}) => {
  const currentHex = `#${config.r.toString(16).padStart(2, "0")}${config.g
    .toString(16)
    .padStart(2, "0")}${config.b.toString(16).padStart(2, "0")}`;

  const direction = DIRECTION_VALUES[config.mode];

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    onChange({ ...config, r, g, b });
  };

  return (
    <Section
      title="Aydınlatma"
      footer={`Uygulanan ayarlar klavyenin belleğine kaydedilir; kablo çıkarılsa da korunur.${note ? ` ${note}` : ""}`}
    >
      {!NO_COLOR_MODES.has(config.mode) && (
        <Row label="Rastgele renkler" description="Seçili renk yerine klavye renkleri kendisi seçer">
          <Switch
            label="Rastgele renkler"
            checked={config.random_color}
            onChange={(random_color) => onChange({ ...config, random_color })}
          />
        </Row>
      )}

      {!NO_COLOR_MODES.has(config.mode) && !config.random_color && (
      <Row label="Renk" description={currentHex.toUpperCase()}>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_COLORS.map((col) => {
            const on = config.r === col.r && config.g === col.g && config.b === col.b;
            return (
              <button
                key={col.hex}
                type="button"
                aria-label={col.name}
                aria-pressed={on}
                onClick={() => onChange({ ...config, r: col.r, g: col.g, b: col.b })}
                className={cx(
                  "h-[22px] w-[22px] rounded-full border-2",
                  on ? "border-white" : "border-card"
                )}
                style={{
                  backgroundColor: col.hex,
                  boxShadow: `0 0 0 1px ${on ? col.hex : "var(--switch-off)"}`,
                }}
              />
            );
          })}
          <label className="ml-1.5 flex items-center">
            <span className="sr-only">Özel renk seç</span>
            <input
              type="color"
              value={currentHex}
              onChange={handleHexChange}
              className="h-[22px] w-9 cursor-pointer rounded-[5px] border border-control-border bg-transparent p-0"
            />
          </label>
        </div>
      </Row>
      )}

      <Row label="Efekt" htmlFor="kb-mode">
        <Select
          id="kb-mode"
          value={config.mode}
          options={LIGHTING_MODES.map((m) => ({ value: m.id, label: m.name }))}
          onChange={(mode) => onChange({ ...config, mode, direction: defaultDirection(mode) })}
          className="min-w-[200px]"
        />
      </Row>

      {config.mode !== 0 && (
      <Row label="Parlaklık" htmlFor="kb-bright">
        <Slider
          id="kb-bright"
          min={1}
          max={5}
          value={config.brightness}
          onChange={(e) => onChange({ ...config, brightness: Number(e.target.value) })}
          valueText={`${config.brightness} / 5`}
        />
      </Row>
      )}

      {config.mode !== 0 && config.mode !== 1 && (
      <Row label="Efekt hızı" htmlFor="kb-speed">
        <Slider
          id="kb-speed"
          min={1}
          max={5}
          value={config.speed}
          onChange={(e) => onChange({ ...config, speed: Number(e.target.value) })}
          valueText={`${config.speed} / 5`}
        />
      </Row>
      )}

      {direction && (
        <Row label="Yön">
          <Segmented
            label="Efekt yönü"
            options={[
              { id: String(direction[0]), label: "Normal" },
              { id: String(direction[1]), label: "Ters" },
            ]}
            value={String(config.direction)}
            onChange={(v) => onChange({ ...config, direction: Number(v) })}
          />
        </Row>
      )}

      <ActionRow status={statusMessage}>
        <Button variant="primary" onClick={onApply} disabled={applying}>
          {applying ? "Gönderiliyor…" : "Klavyeye uygula"}
        </Button>
      </ActionRow>
    </Section>
  );
};
