import { invoke, isTauri } from "@tauri-apps/api/core";
import { version as appVersion } from "../package.json";
import type { DetectedDeviceStatus, PacketLogEntry } from "./types";
import { readPref, writePref } from "./components/ui";

/**
 * Compatibility reports for the open beta.
 *
 * With the user's consent (`reports.autoSend`, off by default, asked during onboarding and
 * changeable in Updates → Settings) the app sends structured reports to the relay in
 * `infra/compat-relay`, which validates them and files GitHub issues:
 *   - `inventory`: a Havit device without a verified driver was detected (once per device
 *     set, app version and install);
 *   - `failure`: a command to a device failed (once per device, action and error per
 *     install and version). Automatic reports carry the error text with file paths removed
 *     and the recent packet log *summaries* (no payload bytes).
 *   - `manual`: the user's own report from the sheet, reviewed on screen first; this one may
 *     include notes and the full packet log.
 * Every report has USB identifiers, firmware versions, app and Windows versions and a random
 * install id; never names, serial numbers or paths. Without consent nothing is sent.
 */

export const AUTO_SEND_PREF = "reports.autoSend";
export const REPORT_ENDPOINT = "https://hc-reports.emirman.dev/v1/report";
const INSTALL_ID_KEY = "havit-console:reports.installId";
const SENT_KEY = "havit-console:reports.sent";
const AUTO_LOG_LINES = 20;
const MANUAL_LOG_LINES = 40;

export type ReportEvent = "inventory" | "failure" | "manual";

export interface ReportDevice {
  name: string;
  vid: string;
  pid: string;
  family: string;
  support: DetectedDeviceStatus["support"];
  connected: boolean;
  firmware: string | null;
  interfaces: string[];
}

export interface ReportError {
  device: string;
  action: string;
  message: string;
}

/** What the relay accepts (schema 2). Rendering to markdown happens server-side. */
export interface ReportPayload {
  schema: 2;
  event: ReportEvent;
  app_version: string;
  os: string;
  install_id: string;
  fingerprint: string;
  devices: ReportDevice[];
  error?: ReportError;
  notes?: string;
  log?: string[];
}

export interface ReportParts {
  devices: DetectedDeviceStatus[];
  error?: ReportError;
  notes?: string;
  /** Full entries (with payload bytes) for manual reports, summaries for automatic ones. */
  logs?: PacketLogEntry[] | null;
  logDetail?: "full" | "summary";
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
  return win ? `Windows NT ${win} ${arch}`.trim() : "unknown";
};

/** Removes anything that looks like a file path or user name from an error message. */
export const scrubMessage = (message: string) =>
  message
    .replace(/[A-Za-z]:\\[^\s'"`]+/g, "<path>")
    .replace(/\/(?:Users|home)\/[^\s'"`]+/g, "<path>")
    .replace(/\\\\\?\\[^\s'"`]+/g, "<path>")
    .slice(0, 500);

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const toReportDevice = (d: DetectedDeviceStatus): ReportDevice => ({
  name: d.name.slice(0, 80),
  vid: d.vid_hex,
  pid: d.pid_hex,
  family: d.family,
  support: d.support,
  connected: d.connected,
  firmware: d.firmware_version,
  interfaces: d.matched_interfaces.slice(0, 16),
});

const logLines = (logs: PacketLogEntry[], detail: "full" | "summary", max: number) =>
  logs
    .slice(-max)
    .map((l) =>
      detail === "full"
        ? `${l.timestamp} ${l.device_id} ${l.direction} ${l.channel} ${l.summary} ${l.hex_preview}`
        : `${l.timestamp} ${l.device_id} ${l.direction} ${l.channel} ${l.summary}`
    )
    .map((line) => line.slice(0, 240));

/** Markdown preview shown to the user; mirrors what the relay renders. */
export function buildReportBody(parts: ReportParts): string {
  const out = [
    "### Environment",
    `- Havit Console ${appVersion} (beta)`,
    `- ${osLabel()}`,
    "",
    "### Devices",
    "| Device | VID:PID | Family / support | Connected | Firmware | Interfaces |",
    "|---|---|---|---|---|---|",
    ...parts.devices.map(
      (d) =>
        `| ${d.name} | ${d.vid_hex}:${d.pid_hex} | ${d.family} / ${d.support} | ${d.connected ? "yes" : "no"} | ${d.firmware_version ?? "–"} | ${d.matched_interfaces.join(", ") || "–"} |`
    ),
  ];
  if (parts.error) {
    out.push("", "### Failed command", `- Device: ${parts.error.device}`, `- Action: ${parts.error.action}`, `- Error: ${parts.error.message}`);
  }
  if (parts.notes !== undefined) out.push("", "### Tester notes", parts.notes.trim() || "_(not provided)_");
  if (parts.logs?.length) {
    const lines = logLines(parts.logs, parts.logDetail ?? "full", MANUAL_LOG_LINES);
    out.push("", `### Diagnostics log (last ${lines.length} entries)`, "```", ...lines, "```");
  }
  return out.join("\n");
}

export async function makePayload(event: ReportEvent, parts: ReportParts, fingerprintSource: string): Promise<ReportPayload> {
  const payload: ReportPayload = {
    schema: 2,
    event,
    app_version: appVersion,
    os: osLabel(),
    install_id: installId(),
    fingerprint: await sha256Hex(fingerprintSource),
    devices: parts.devices.slice(0, 12).map(toReportDevice),
  };
  if (parts.error) payload.error = { ...parts.error, message: scrubMessage(parts.error.message) };
  if (parts.notes?.trim()) payload.notes = parts.notes.trim().slice(0, 2000);
  if (parts.logs?.length) {
    const detail = parts.logDetail ?? "full";
    payload.log = logLines(parts.logs, detail, detail === "full" ? MANUAL_LOG_LINES : AUTO_LOG_LINES);
  }
  return payload;
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
 * each (device set, app version) pair is reported once per install.
 */
export async function reportInventory(devices: DetectedDeviceStatus[]): Promise<void> {
  if (!autoSendEnabled() || !isTauri()) return;
  const unverified = devices.filter((d) => d.support !== "verified" && d.connected);
  if (unverified.length === 0) return;
  const key = `inventory:${appVersion}:${unverified.map((d) => `${d.vid_hex}:${d.pid_hex}`).sort().join(",")}`;
  if (alreadySent(key)) return;
  markSent(key); // before the request so a slow reply can't double-send
  const payload = await makePayload("inventory", { devices }, key);
  const res = await sendReport(payload);
  if (!res.ok) console.warn("compatibility report failed:", res.error);
}

/**
 * Reports a failed device command. Called from the API layer; errors are rethrown there,
 * this only records them. One report per (device, action, error) per install and version.
 */
export async function reportFailure(deviceId: string, action: string, err: unknown): Promise<void> {
  if (!autoSendEnabled() || !isTauri()) return;
  const message = scrubMessage(String(err instanceof Error ? err.message : err));
  const key = `failure:${appVersion}:${deviceId}:${action}:${message}`;
  if (alreadySent(key)) return;
  markSent(key);
  const [devices, logs] = await Promise.all([connectedDevices(), recentLogs()]);
  const device = devices.find((d) => d.id === deviceId);
  const payload = await makePayload(
    "failure",
    {
      devices,
      error: { device: device?.name ?? deviceId, action, message },
      logs: logs.filter((l) => l.device_id === deviceId),
      logDetail: "summary",
    },
    key
  );
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
