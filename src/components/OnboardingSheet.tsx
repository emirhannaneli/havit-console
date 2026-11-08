import React, { useState } from "react";
import { Check, Headphones, Info, Keyboard } from "lucide-react";
import type { DetectedDeviceStatus } from "../types";
import { AUTO_CHECK_PREF } from "./updates/UpdatesView";
import { AUTO_SEND_PREF } from "../telemetry";
import { Button, Card, ConnectionLabel, cx, readPref, Row, Sheet, Switch, writePref } from "./ui";

export const ONBOARDED_PREF = "onboarded";

const KNOWN: { id: string; title: string; hint: string; icon: React.ElementType }[] = [
  { id: "kb884l", title: "KB884L Keyboard", hint: "Mechanical keyboard · USB", icon: Keyboard },
  { id: "fuxi-h7", title: "Fuxi-H7 Headset", hint: "Wireless headset · USB receiver", icon: Headphones },
];

const STEPS = 3;

/** First-launch walkthrough: welcome, detected devices, preferences. */
export const OnboardingSheet: React.FC<{
  open: boolean;
  devices: DetectedDeviceStatus[];
  scanning: boolean;
  onDone: () => void;
}> = ({ open, devices, scanning, onDone }) => {
  const [step, setStep] = useState(1);
  const [autoCheck, setAutoCheck] = useState(() => readPref(AUTO_CHECK_PREF, true));
  const [shareReports, setShareReports] = useState(() => readPref(AUTO_SEND_PREF, true));
  const connected = KNOWN.filter((k) => devices.find((d) => d.id === k.id)?.connected).length;

  const finish = () => {
    writePref(AUTO_CHECK_PREF, autoCheck);
    writePref(AUTO_SEND_PREF, shareReports);
    writePref(ONBOARDED_PREF, true);
    onDone();
  };

  return (
    <Sheet open={open} onClose={finish} labelledBy="ob-title" className="w-[620px]">
      <div className="flex min-h-[420px] flex-col">
        <div className="flex flex-1 flex-col justify-center gap-5 px-8 py-8 sm:px-14">
          {step === 1 && (
            <div className="flex flex-col items-center gap-5 text-center">
              <span
                aria-hidden="true"
                className="flex h-[88px] w-[88px] items-center justify-center rounded-[20px] bg-accent text-[40px] font-bold text-on-accent shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              >
                H
              </span>
              <div className="flex flex-col gap-2">
                <h2 id="ob-title" className="m-0 text-[22px] leading-[26px] font-bold">
                  Welcome to Havit Console
                </h2>
                <p className="m-0 max-w-[440px] leading-[18px] text-secondary">
                  Manage your Havit keyboard and headset from one app. No separate vendor software needed.
                </p>
              </div>
              <Card className="w-full max-w-[420px] text-left">
                {[
                  "Open beta: the KB884L and Fuxi-H7 are verified; other Havit devices are detected so you can report how they behave.",
                  "Open source; all code is on GitHub.",
                  "No data collection, no account. Compatibility reports are drafts you review and submit yourself.",
                  "Not affiliated with Havit; an independent community project.",
                ].map((t) => (
                  <span key={t} className="flex items-start gap-2.5 px-3.5 py-2.5">
                    <Check aria-hidden="true" className="mt-px h-4 w-4 flex-none text-success" strokeWidth={2.6} />
                    {t}
                  </span>
                ))}
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 id="ob-title" className="m-0 text-[22px] leading-[26px] font-bold">
                  {connected > 0 ? "Devices found" : "Looking for devices"}
                </h2>
                <p role="status" aria-live="polite" className="m-0 leading-[18px] text-secondary">
                  {connected > 0
                    ? `${connected} Havit ${connected === 1 ? "device" : "devices"} detected. Nothing is written to a device until you change a setting.`
                    : scanning
                      ? "Scanning for Havit devices on USB…"
                      : "No device connected yet. Plug one in and it appears here within a few seconds."}
                </p>
              </div>
              <Card>
                {KNOWN.map(({ id, title, hint, icon: Icon }) => (
                  <div key={id} className="flex min-h-[52px] items-center gap-3 px-3.5 py-2">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-fill">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] text-label" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold">{title}</span>
                      <span className="text-xs leading-[15px] text-secondary">{hint}</span>
                    </span>
                    <ConnectionLabel connected={devices.find((d) => d.id === id)?.connected ?? false} />
                  </div>
                ))}
              </Card>
              <p className="m-0 flex items-start gap-2 text-xs leading-4 text-secondary">
                <Info aria-hidden="true" className="mt-px h-3.5 w-3.5 flex-none" />
                Device missing? For the headset, make sure the USB receiver is plugged in.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-5 text-center">
              <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-fill">
                <Check className="h-8 w-8 text-success" strokeWidth={2.6} />
              </span>
              <div className="flex flex-col gap-2">
                <h2 id="ob-title" className="m-0 text-[22px] leading-[26px] font-bold">
                  You’re all set
                </h2>
                <p className="m-0 max-w-[420px] leading-[18px] text-secondary">
                  Open your devices from the sidebar. You can change these settings later in Updates.
                </p>
              </div>
              <Card className="w-full max-w-[420px] text-left">
                <Row label="Check for updates automatically">
                  <Switch label="Check for updates automatically" checked={autoCheck} onChange={setAutoCheck} />
                </Row>
                <Row
                  label="Share compatibility reports"
                  description="Open beta: when a Havit device without a tested driver is detected, or a command fails, send device IDs, firmware and app versions and the packet log as a public GitHub issue. No names or serial numbers."
                >
                  <Switch label="Share compatibility reports" checked={shareReports} onChange={setShareReports} />
                </Row>
              </Card>
            </div>
          )}
        </div>

        <div className="flex h-16 flex-none items-center gap-2 border-t border-separator bg-sidebar px-5">
          {step < STEPS ? (
            <Button variant="plain" className="text-secondary" onClick={() => setStep(STEPS)}>
              Skip setup
            </Button>
          ) : (
            <span className="w-[100px]" />
          )}
          <div role="img" aria-label={`Step ${step} of ${STEPS}`} className="flex flex-1 justify-center gap-2">
            {Array.from({ length: STEPS }, (_, i) => (
              <span
                key={i}
                className={cx(
                  "h-1.5 rounded-full transition-[width] duration-150",
                  i + 1 === step ? "w-[18px] bg-accent" : "w-1.5 bg-switch-off"
                )}
              />
            ))}
          </div>
          {step > 1 && step < STEPS && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          <Button
            variant="primary"
            className="min-w-[84px]"
            autoFocus
            onClick={() => (step === STEPS ? finish() : setStep(step + 1))}
          >
            {step === 1 ? "Get started" : step === STEPS ? "Open Havit Console" : "Continue"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
