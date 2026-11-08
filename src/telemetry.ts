import { invoke, isTauri } from "@tauri-apps/api/core";
import { version as appVersion } from "../package.json";
import type { DetectedDeviceStatus, PacketLogEntry } from "./types";
import { readPref, writePref } from "./components/ui";

/**
 * Compatibility reports for the open beta.
 *
 * With the user's consent (`reports.autoSend`, asked during onboarding, changeable in
 * Updates → Settings) the app sends two kinds of reports to the relay in
 * `infra/compat-relay`, which files them as GitHub issues:
 *   - `inventory`: a Havit device without a verified driver was detected (once per device,
 *     app version and install);
 *   - `failure`: a command to a device failed (with the error and the last log entries).
 * Reports contain USB identifiers, firmware versions, the app and Windows versions, an
 * anonymous random install id and the packet log; never names, serial numbers or paths.
 * Without consent nothing is sent; the manual report sheet still works as a GitHub draft.
 */

export const AUTO_SEND_PREF = "reports.autoSend";
export const REPORT_ENDPOINT = "https://havit-console-reports.emirhannaneli.workers.dev/v1/report";
const INSTALL_ID_KEY = "havit-console:reports.installId";
const SENT_KEY = "havit-console:reports.sent";
const LOG_LINES = 40;

export type ReportEvent = "inventory" | "failure" | "manual";

export interface ReportPayload {
  schema: 1;
  event: ReportEvent;
  app_version: string;
  os: string;
  install_id: string;
  fingerprint: string;
  title: string;
  body: string;
}

export const autoSendEnabled = () => readPref(AUTO_SEND_PREF, false);
export const setAutoSend = (on: boolean) => writePref(AUTO_SEND_PREF, on);

export function installId(): string {
  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(INSTALL_ID_KEY, id);
    return id;
  } catch {
    return "00000000-0000-0000-0000-000000000000";
  }
}

export const osLabel = () => {
  const ua = navigator.userAgent;
  const win = /Windows NT (\d+\.\d+)/.exec(ua)?.[1];
  const arch = /x64|Win64|WOW64/.test(ua) ? "x64" : "";
  return win ? `Windows NT ${win} ${arch}`.trim() : ua.slice(0, 80);
};

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const deviceRows = (devices: DetectedDeviceStatus[]) =>
  devices.map(
    (d) =>
      `| ${d.name} | ${d.vid_hex}:${d.pid_hex} | ${d.family} / ${d.support} | ${d.connected ? "yes" : "no"} | ${d.firmware_version ?? "–"} | ${d.matched_interfaces.join(", ") || "–"} |`
  );

const logLines = (logs: PacketLogEntry[]) =>
  logs
    .slice(-LOG_LINES)
    .map((l) => `${l.timestamp} ${l.device_id} ${l.direction} ${l.channel} ${l.summary} ${l.hex_preview}`);

/** Builds the markdown body shown to the user and sent to the relay. */
export function buildReportBody(opts: {
  devices: DetectedDeviceStatus[];
  notes?: string;
  error?: { device: string; action: string; message: string };
  logs?: PacketLogEntry[] | null;
}): string {
  const parts = [
    "### Environment",
    `- Havit Console ${appVersion} (beta)`,
    `- ${osLabel()}`,
    "",
    "### Devices",
    "| Device | VID:PID | Family / support | Connected | Firmware | Interfaces |",
    "|---|---|---|---|---|---|",
    ...deviceRows(opts.devices),
  ];
  if (opts.error) {
    parts.push("", "### Failed command", `- Device: ${opts.error.device}`, `- Action: ${opts.error.action}`, `- Error: \`${opts.error.message}\``);
  }
  if (opts.notes !== undefined) {
    parts.push("", "### What I tried and what happened", opts.notes.trim() || "_(not provided)_");
  }
  if (opts.logs && opts.logs.length) {
    const lines = logLines(opts.logs);
    parts.push("", `### Diagnostics log (last ${lines.length} entries)`, "```", ...lines, "```");
  }
  return parts.join("\n");
}

async function recentLogs(): Promise<PacketLogEntry[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<PacketLogEntry[]>("packet_log_list");
  } catch {
    return [];
  }
}

async function connectedDevices(): Promise<DetectedDeviceStatus[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<DetectedDeviceStatus[]>("get_connected_devices");
  } catch {
    return [];
  }
}

export async function makePayload(
  event: ReportEvent,
  title: string,
  body: string,
  fingerprintSource: string
): Promise<ReportPayload> {
  return {
    schema: 1,
    event,
    app_version: appVersion,
    os: osLabel(),
    install_id: installId(),
    fingerprint: await sha256Hex(fingerprintSource),
    title: title.slice(0, 200),
    body: body.slice(0, 24_000),
  };
}

export interface SendResult {
  ok: boolean;
  url?: string;
  deduplicated?: boolean;
  error?: string;
}

export async function sendReport(payload: ReportPayload): Promise<SendResult> {
  try {
    const res = await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<SendResult & { error: string }>;
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, url: data.url, deduplicated: data.deduplicated };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function alreadySent(key: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]") as string[]).includes(key);
  } catch {
    return false;
  }
}

function markSent(key: string) {
  try {
    const list = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]") as string[];
    localStorage.setItem(SENT_KEY, JSON.stringify([...list.slice(-200), key]));
  } catch {
    /* storage unavailable: may send again next launch */
  }
}

/**
 * Sends an inventory report for devices without a verified driver. Runs after every scan;
 * each (device, app version) pair is reported once per install.
 */
export async function reportInventory(devices: DetectedDeviceStatus[]): Promise<void> {
  if (!autoSendEnabled() || !isTauri()) return;
  const unverified = devices.filter((d) => d.support !== "verified" && d.connected);
  if (unverified.length === 0) return;
  const key = `inventory:${appVersion}:${unverified.map((d) => `${d.vid_hex}:${d.pid_hex}`).sort().join(",")}`;
  if (alreadySent(key)) return;
  markSent(key); // before the request so a slow reply can't double-send
  const title = `[auto] Detected: ${unverified.map((d) => d.name).join(", ")}`;
  const body = buildReportBody({ devices });
  const payload = await makePayload("inventory", title, body, key);
  const res = await sendReport(payload);
  if (!res.ok) console.warn("compatibility report failed:", res.error);
}

/**
 * Reports a failed device command. Called from the API layer; errors are rethrown there,
 * this only records them. One report per (device, action, error) per install and version.
 */
export async function reportFailure(deviceId: string, action: string, err: unknown): Promise<void> {
  if (!autoSendEnabled() || !isTauri()) return;
  const message = String(err instanceof Error ? err.message : err).slice(0, 500);
  const key = `failure:${appVersion}:${deviceId}:${action}:${message}`;
  if (alreadySent(key)) return;
  markSent(key);
  const [devices, logs] = await Promise.all([connectedDevices(), recentLogs()]);
  const device = devices.find((d) => d.id === deviceId);
  const title = `[auto] ${device?.name ?? deviceId}: ${action} failed`;
  const body = buildReportBody({
    devices,
    error: { device: device?.name ?? deviceId, action, message },
    logs,
  });
  const payload = await makePayload("failure", title, body, key);
  const res = await sendReport(payload);
  if (!res.ok) console.warn("compatibility report failed:", res.error);
}

/** Wraps a device command so failures are reported (when allowed) and then rethrown. */
export async function withFailureReport<T>(deviceId: string, action: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    void reportFailure(deviceId, action, err);
    throw err;
  }
}
