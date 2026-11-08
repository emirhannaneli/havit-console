import React, { useState } from "react";
import { Check, Headphones, Info, Keyboard } from "lucide-react";
import type { DetectedDeviceStatus } from "../types";
import { LogoMark } from "./Logo";
import { AUTO_CHECK_PREF } from "./updates/UpdatesView";
import { AUTO_SEND_PREF } from "../telemetry";
import { LANGUAGES, useT, type MessageKey } from "../i18n";
import { Button, Card, ConnectionLabel, cx, readPref, Row, Select, Sheet, Switch, writePref } from "./ui";

export const ONBOARDED_PREF = "onboarded";

const KNOWN: { id: string; titleKey: MessageKey; hintKey: MessageKey; icon: React.ElementType }[] = [
  { id: "kb884l", titleKey: "device.kb884l", hintKey: "onboarding.hint.kb884l", icon: Keyboard },
  { id: "fuxi-h7", titleKey: "device.fuxi", hintKey: "onboarding.hint.fuxi", icon: Headphones },
];

const POINTS: MessageKey[] = [
  "onboarding.welcome.point1",
  "onboarding.welcome.point2",
  "onboarding.welcome.point3",
  "onboarding.welcome.point4",
];

const STEPS = 3;

/** First-launch walkthrough: welcome (and language), detected devices, preferences. */
export const OnboardingSheet: React.FC<{
  open: boolean;
  devices: DetectedDeviceStatus[];
  scanning: boolean;
  onDone: () => void;
}> = ({ open, devices, scanning, onDone }) => {
  const { t, tp, lang, setLang } = useT();
  const [step, setStep] = useState(1);
  const [autoCheck, setAutoCheck] = useState(() => readPref(AUTO_CHECK_PREF, true));
  // Sharing is on by default in open beta to help collect device compatibility:
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
              <LogoMark size={88} className="rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.3)]" />
              <div className="flex flex-col gap-2">
                <h2 id="ob-title" className="m-0 text-[22px] leading-[26px] font-bold">
                  {t("onboarding.welcome.title")}
                </h2>
                <p className="m-0 max-w-[440px] leading-[18px] text-secondary">{t("onboarding.welcome.body")}</p>
              </div>
              <Card className="w-full max-w-[420px] text-left">
                <Row label={t("common.language")} htmlFor="ob-language">
                  <Select id="ob-language" value={lang} options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))} onChange={setLang} />
                </Row>
                {POINTS.map((key) => (
                  <span key={key} className="flex items-start gap-2.5 px-3.5 py-2.5">
                    <Check aria-hidden="true" className="mt-px h-4 w-4 flex-none text-success" strokeWidth={2.6} />
                    {t(key)}
                  </span>
                ))}
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 id="ob-title" className="m-0 text-[22px] leading-[26px] font-bold">
                  {connected > 0 ? t("onboarding.found.title") : t("onboarding.looking.title")}
                </h2>
                <p role="status" aria-live="polite" className="m-0 leading-[18px] text-secondary">
                  {connected > 0
                    ? tp("onboarding.found.body", connected)
                    : scanning
                      ? t("onboarding.scanning")
                      : t("onboarding.none")}
                </p>
              </div>
              <Card>
                {KNOWN.map(({ id, titleKey, hintKey, icon: Icon }) => (
                  <div key={id} className="flex min-h-[52px] items-center gap-3 px-3.5 py-2">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-fill">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] text-label" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold">{t(titleKey)}</span>
                      <span className="text-xs leading-[15px] text-secondary">{t(hintKey)}</span>
                    </span>
                    <ConnectionLabel connected={devices.find((d) => d.id === id)?.connected ?? false} />
                  </div>
                ))}
              </Card>
              <p className="m-0 flex items-start gap-2 text-xs leading-4 text-secondary">
                <Info aria-hidden="true" className="mt-px h-3.5 w-3.5 flex-none" />
                {t("onboarding.missing")}
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
                  {t("onboarding.done.title")}
                </h2>
                <p className="m-0 max-w-[420px] leading-[18px] text-secondary">{t("onboarding.done.body")}</p>
              </div>
              <Card className="w-full max-w-[420px] text-left">
                <Row label={t("updates.autoCheck")}>
                  <Switch label={t("updates.autoCheck")} checked={autoCheck} onChange={setAutoCheck} />
                </Row>
                <Row label={t("updates.share")} description={t("onboarding.share.desc")}>
                  <Switch label={t("updates.share")} checked={shareReports} onChange={setShareReports} />
                </Row>
              </Card>
            </div>
          )}
        </div>

        <div className="flex h-16 flex-none items-center gap-2 border-t border-separator bg-sidebar px-5">
          {step < STEPS ? (
            <Button variant="plain" className="text-secondary" onClick={() => setStep(STEPS)}>
              {t("onboarding.skip")}
            </Button>
          ) : (
            <span className="w-[100px]" />
          )}
          <div
            role="img"
            aria-label={t("onboarding.step", { step, total: STEPS })}
            className="flex flex-1 justify-center gap-2"
          >
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
          {step > 1 && step < STEPS && <Button onClick={() => setStep(step - 1)}>{t("common.back")}</Button>}
          <Button
            variant="primary"
            className="min-w-[84px]"
            autoFocus
            onClick={() => (step === STEPS ? finish() : setStep(step + 1))}
          >
            {step === 1 ? t("onboarding.getStarted") : step === STEPS ? t("onboarding.open") : t("common.continue")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
