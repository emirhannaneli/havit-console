import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, cx, Notice, Sheet, TextField } from "../ui";

const MAX_STEPS = 64;
const FIXED_DELAY_MS = 20;

type DelayMode = "recorded" | "fixed" | "none";
type PlayMode = "once" | "hold" | "toggle";

interface Step {
  down: boolean;
  key: string;
  /** Milliseconds since the previous step (0 for the first). */
  gap: number;
}

const DELAYS: { id: DelayMode; label: string; hint: string }[] = [
  { id: "recorded", label: "Kaydedilen gecikmeler", hint: "Tuşlar arasındaki gerçek süreler" },
  { id: "fixed", label: "Sabit gecikme", hint: `Her adım arasında ${FIXED_DELAY_MS} ms` },
  { id: "none", label: "Gecikme yok", hint: "Olabildiğince hızlı" },
];

const PLAY: { id: PlayMode; label: string }[] = [
  { id: "once", label: "Bir kez oynat" },
  { id: "hold", label: "Basılı tutulurken yinele" },
  { id: "toggle", label: "Tekrar basılana dek yinele" },
];

const keyLabel = (e: KeyboardEvent) => (e.key === " " ? "Boşluk" : e.key.length === 1 ? e.key.toUpperCase() : e.key);

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Records a key sequence for the selected key. Writing macros to the keyboard
 * (protocol subsystem 0x19) is not implemented yet, so the sequence stays in this sheet.
 */
export const MacroRecorder: React.FC<{ open: boolean; keyName: string; onClose: () => void }> = ({
  open,
  keyName,
  onClose,
}) => {
  const [name, setName] = useState("Yeni makro");
  const [steps, setSteps] = useState<Step[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [delay, setDelay] = useState<DelayMode>("recorded");
  const [play, setPlay] = useState<PlayMode>("once");
  const last = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const startedAt = performance.now();
    last.current = 0;
    const tick = setInterval(() => setElapsed(performance.now() - startedAt), 250);

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        if (e.type === "keydown") setRecording(false);
        return;
      }
      const now = performance.now();
      const gap = last.current ? Math.round(now - last.current) : 0;
      last.current = now;
      setSteps((prev) =>
        prev.length >= MAX_STEPS ? prev : [...prev, { down: e.type === "keydown", key: keyLabel(e), gap }]
      );
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    return () => {
      clearInterval(tick);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, [recording]);

  useEffect(() => {
    if (steps.length >= MAX_STEPS) setRecording(false);
  }, [steps.length]);

  const close = () => {
    setRecording(false);
    onClose();
  };

  const toggleRecording = () => {
    if (!recording) {
      setSteps([]);
      setElapsed(0);
    }
    setRecording(!recording);
  };

  const shownDelay = (s: Step, i: number) =>
    i === 0 ? "—" : delay === "none" ? "0 ms" : delay === "fixed" ? `${FIXED_DELAY_MS} ms` : `${s.gap} ms`;

  return (
    <Sheet open={open} onClose={close} dismissable={!recording} labelledBy="macro-title" className="w-[760px]">
      <div className="flex max-h-[calc(100vh-32px)] flex-col">
        <h2 id="macro-title" className="m-0 flex h-11 flex-none items-center justify-center border-b border-separator bg-sidebar px-4 text-[13px] font-semibold">
          Yeni makro · {keyName} tuşu
        </h2>

        <div className="flex min-h-0 flex-1 flex-wrap">
          <div className="flex min-w-[300px] flex-1 flex-col gap-3.5 px-5 py-[18px]">
            <div className="flex items-center gap-3">
              <label htmlFor="macro-name" className="text-secondary">
                Ad
              </label>
              <TextField id="macro-name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-separator bg-card px-3 py-2.5">
              <Button
                variant={recording ? "destructive" : "primary"}
                aria-pressed={recording}
                onClick={toggleRecording}
                className={recording ? "border-0 bg-danger font-semibold text-white hover:bg-danger" : undefined}
              >
                <span
                  aria-hidden="true"
                  className={cx("h-2.5 w-2.5", recording ? "rounded-[2px] bg-white" : "rounded-full bg-on-accent")}
                />
                {recording ? "Kaydı durdur" : "Kaydı başlat"}
              </Button>
              <span role="status" aria-live="polite" className="min-w-[160px] flex-1 text-xs text-secondary">
                {recording
                  ? "Kaydediliyor. Tuşlara bas; Esc kaydı durdurur."
                  : "Kayıt sırasında basılan tuşlar yalnızca listeye eklenir."}
              </span>
              <span className="font-semibold tabular-nums">{fmtClock(elapsed)}</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <span className="px-1 text-[11px] font-semibold text-secondary">
                Adımlar ({steps.length}/{MAX_STEPS})
              </span>
              <ol
                aria-label="Makro adımları"
                className="m-0 flex h-[220px] list-none flex-col divide-y divide-separator overflow-y-auto rounded-[10px] border border-separator bg-card p-0"
              >
                {steps.length === 0 && (
                  <li className="flex flex-1 items-center justify-center px-6 text-center text-xs leading-4 text-secondary">
                    Henüz adım yok. Kaydı başlat ve tuşlara bas; her basış ve bırakış buraya eklenir.
                  </li>
                )}
                {steps.map((s, i) => (
                  <li key={i} className="flex min-h-9 items-center gap-2.5 px-2.5 py-1">
                    <span className="w-5 text-right text-[11px] text-secondary tabular-nums">{i + 1}</span>
                    <span
                      className={cx(
                        "flex h-[22px] w-[22px] items-center justify-center rounded-[5px] text-xs font-bold",
                        s.down ? "bg-accent text-on-accent" : "bg-fill text-label"
                      )}
                    >
                      <span aria-hidden="true">{s.down ? "↓" : "↑"}</span>
                      <span className="sr-only">{s.down ? "Bas" : "Bırak"}</span>
                    </span>
                    <span className="flex-1 font-medium">{s.key}</span>
                    <span className="text-xs text-secondary tabular-nums">{shownDelay(s, i)}</span>
                    <Button
                      variant="plain"
                      aria-label={`${i + 1}. adımı sil`}
                      disabled={recording}
                      onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                      className="h-7 w-7 px-0 text-secondary"
                    >
                      <X aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="flex w-[240px] flex-none flex-col gap-4 border-l border-separator bg-sidebar px-4 py-[18px] max-sm:w-full max-sm:border-l-0 max-sm:border-t">
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 p-0 text-[11px] font-semibold text-secondary">Gecikmeler</legend>
              {DELAYS.map((d) => (
                <label key={d.id} className="flex min-h-8 cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="macro-delay"
                    checked={delay === d.id}
                    onChange={() => setDelay(d.id)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <span className="flex flex-col gap-px">
                    <span>{d.label}</span>
                    <span className="text-[11px] leading-[14px] text-secondary">{d.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 p-0 text-[11px] font-semibold text-secondary">Oynatma</legend>
              {PLAY.map((p) => (
                <label key={p.id} className="flex min-h-7 cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="macro-play"
                    checked={play === p.id}
                    onChange={() => setPlay(p.id)}
                    className="h-3.5 w-3.5"
                  />
                  {p.label}
                </label>
              ))}
            </fieldset>
          </aside>
        </div>

        <div className="flex flex-none flex-col gap-2 border-t border-separator bg-sidebar px-5 py-3">
          <Notice tone="info" title="Makroyu klavyeye yazma henüz desteklenmiyor">
            Kaydı burada deneyebilirsin; klavyeye kaydetme henüz desteklenmiyor.
          </Notice>
          <div className="flex justify-end gap-2">
            <Button onClick={close} disabled={recording}>
              Kapat
            </Button>
            <Button variant="primary" disabled className="min-w-[110px]">
              Cihaza kaydet
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
