/**
 * Compatibility report relay for Havit Console.
 *
 * The desktop app cannot hold a GitHub token (anything shipped in the app can be
 * extracted), so it POSTs structured reports here and this Worker renders and files them as
 * GitHub issues with a fine-grained token that only has "Issues: write" on one repository.
 *
 * Abuse limits: the client never supplies markdown — every field is validated against a
 * strict shape and free text is rendered inside code spans/blocks (no mentions, no links);
 * body size, per-IP, per-install and global quotas (KV counters); deduplication by report
 * fingerprint (a repeat becomes a short comment on the existing issue).
 */

export interface Env {
  /** Fine-grained PAT: repository `GITHUB_REPO`, permission Issues: read & write. */
  GITHUB_TOKEN: string;
  /** "owner/repo" */
  GITHUB_REPO: string;
  /** KV namespace for rate limits and fingerprint → issue mapping. */
  STATE: KVNamespace;
  /** Comma-separated labels added to every issue. */
  LABELS?: string;
}

const MAX_BODY_BYTES = 24_000;
const PER_IP_PER_HOUR = 20;
const PER_INSTALL_PER_DAY = 10;
const GLOBAL_PER_DAY = 300;
const FINGERPRINT_TTL_S = 30 * 24 * 3600;
const MAX_DEVICES = 12;
const MAX_LOG_LINES = 40;

type Event = "inventory" | "failure" | "manual";

interface Device {
  name: string;
  vid: string; // 0xABCD
  pid: string; // 0xABCD
  family: string;
  support: "verified" | "experimental" | "unknown";
  connected: boolean;
  firmware: string | null;
  interfaces: string[];
}

interface Report {
  schema: 2;
  event: Event;
  app_version: string;
  os: string;
  install_id: string;
  fingerprint: string;
  devices: Device[];
  error?: { device: string; action: string; message: string };
  notes?: string;
  log?: string[];
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, OPTIONS",
    },
  });

// --- validation -----------------------------------------------------------------------

const RE = {
  hex16: /^0x[0-9A-F]{4}$/,
  version: /^[0-9A-Za-z.+-]{1,32}$/,
  os: /^[\w .()/-]{1,80}$/,
  installId: /^[0-9a-f-]{8,64}$/,
  fingerprint: /^[0-9a-f]{16,64}$/,
  family: /^[a-z_]{1,24}$/,
  iface: /^[\w ()-]{1,40}$/,
};

/** Printable text, trimmed and bounded; used for anything rendered inside code spans. */
function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return s.length > 0 && s.length <= max ? s : null;
}

function device(v: unknown): Device | string {
  if (!v || typeof v !== "object") return "device must be an object";
  const d = v as Record<string, unknown>;
  const name = text(d.name, 80);
  if (!name) return "device name";
  if (typeof d.vid !== "string" || !RE.hex16.test(d.vid)) return "device vid";
  if (typeof d.pid !== "string" || !RE.hex16.test(d.pid)) return "device pid";
  if (typeof d.family !== "string" || !RE.family.test(d.family)) return "device family";
  if (!["verified", "experimental", "unknown"].includes(String(d.support))) return "device support";
  if (typeof d.connected !== "boolean") return "device connected";
  const firmware = d.firmware === null || d.firmware === undefined ? null : text(d.firmware, 16);
  if (d.firmware && !firmware) return "device firmware";
  if (!Array.isArray(d.interfaces) || d.interfaces.length > 16) return "device interfaces";
  const interfaces = d.interfaces.map((i) => (typeof i === "string" && RE.iface.test(i) ? i : null));
  if (interfaces.some((i) => i === null)) return "device interface label";
  return {
    name,
    vid: d.vid,
    pid: d.pid,
    family: d.family,
    support: d.support as Device["support"],
    connected: d.connected,
    firmware,
    interfaces: interfaces as string[],
  };
}

function validate(x: unknown): Report | string {
  if (!x || typeof x !== "object") return "body must be an object";
  const r = x as Record<string, unknown>;
  if (r.schema !== 2) return "unsupported schema";
  if (!["inventory", "failure", "manual"].includes(String(r.event))) return "bad event";
  if (typeof r.app_version !== "string" || !RE.version.test(r.app_version)) return "bad app_version";
  if (typeof r.os !== "string" || !RE.os.test(r.os)) return "bad os";
  if (typeof r.install_id !== "string" || !RE.installId.test(r.install_id)) return "bad install_id";
  if (typeof r.fingerprint !== "string" || !RE.fingerprint.test(r.fingerprint)) return "bad fingerprint";
  if (!Array.isArray(r.devices) || r.devices.length === 0 || r.devices.length > MAX_DEVICES) return "bad devices";
  const devices: Device[] = [];
  for (const d of r.devices) {
    const parsed = device(d);
    if (typeof parsed === "string") return `bad ${parsed}`;
    devices.push(parsed);
  }
  const out: Report = {
    schema: 2,
    event: r.event as Event,
    app_version: r.app_version,
    os: r.os,
    install_id: r.install_id,
    fingerprint: r.fingerprint,
    devices,
  };
  if (r.error !== undefined) {
    const e = r.error as Record<string, unknown>;
    const dev = text(e?.device, 80);
    const action = text(e?.action, 40);
    const message = text(e?.message, 500);
    if (!dev || !action || !message) return "bad error";
    out.error = { device: dev, action, message };
  }
  if (r.notes !== undefined) {
    const notes = typeof r.notes === "string" ? r.notes.trim() : "";
    if (notes.length > 2000) return "notes too long";
    if (notes) out.notes = notes;
  }
  if (r.log !== undefined) {
    if (!Array.isArray(r.log) || r.log.length > MAX_LOG_LINES) return "bad log";
    const lines = r.log.map((l) => text(l, 240));
    if (lines.some((l) => l === null)) return "bad log line";
    out.log = lines as string[];
  }
  return out;
}

// --- rendering --------------------------------------------------------------------------

/** Inline code span; backticks and pipes removed so the table and span can't be broken out of. */
const code = (s: string) => "`" + s.replace(/[`|\r\n]/g, " ") + "`";

/** Fenced block; a fence inside the text is defused by indenting it. */
const fence = (lines: string[]) => "```\n" + lines.map((l) => l.replace(/^```/gm, " ```")).join("\n") + "\n```";

function render(r: Report): { title: string; body: string } {
  const names = r.devices.map((d) => d.name).join(", ");
  const title =
    r.event === "failure" && r.error
      ? `[auto] ${r.error.device}: ${r.error.action} failed`
      : r.event === "inventory"
        ? `[auto] Detected: ${names}`
        : `Compatibility: ${names}`;
  const rows = r.devices.map(
    (d) =>
      `| ${code(d.name)} | ${code(`${d.vid}:${d.pid}`)} | ${code(`${d.family} / ${d.support}`)} | ${d.connected ? "yes" : "no"} | ${d.firmware ? code(d.firmware) : "–"} | ${d.interfaces.length ? code(d.interfaces.join(", ")) : "–"} |`
  );
  const parts = [
    "### Environment",
    `- Havit Console ${code(r.app_version)} (beta)`,
    `- ${code(r.os)}`,
    "",
    "### Devices",
    "| Device | VID:PID | Family / support | Connected | Firmware | Interfaces |",
    "|---|---|---|---|---|---|",
    ...rows,
  ];
  if (r.error) {
    parts.push("", "### Failed command", `- Device: ${code(r.error.device)}`, `- Action: ${code(r.error.action)}`, "- Error:", fence([r.error.message]));
  }
  if (r.notes) parts.push("", "### Tester notes", fence(r.notes.split(/\r?\n/)));
  if (r.log?.length) parts.push("", `### Diagnostics log (last ${r.log.length} entries)`, fence(r.log));
  parts.push("", "---", `_Automatic report · install ${code(r.install_id.slice(0, 8))} · fingerprint ${code(r.fingerprint.slice(0, 12))}_`);
  return { title: title.replace(/[\r\n@]/g, " ").slice(0, 200), body: parts.join("\n") };
}

// --- storage / GitHub ---------------------------------------------------------------------

async function bump(env: Env, key: string, ttl: number, limit: number): Promise<boolean> {
  const n = Number((await env.STATE.get(key)) ?? "0") + 1;
  await env.STATE.put(key, String(n), { expirationTtl: ttl });
  return n <= limit;
}

async function github(env: Env, path: string, body: unknown): Promise<Response> {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "havit-console-compat-relay",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return json(204, null);
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/v1/report") return json(404, { error: "not found" });

    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > MAX_BODY_BYTES) return json(413, { error: "report too large" });
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "report too large" });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json(400, { error: "invalid json" });
    }
    const report = validate(parsed);
    if (typeof report === "string") return json(400, { error: report });

    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    const hour = Math.floor(Date.now() / 3_600_000);
    const day = Math.floor(Date.now() / 86_400_000);
    if (!(await bump(env, `ip:${ip}:${hour}`, 3600, PER_IP_PER_HOUR))) return json(429, { error: "too many reports" });
    if (!(await bump(env, `inst:${report.install_id}:${day}`, 86_400, PER_INSTALL_PER_DAY))) return json(429, { error: "too many reports" });
    if (!(await bump(env, `global:${day}`, 86_400, GLOBAL_PER_DAY))) return json(429, { error: "daily quota reached" });

    const labels = (env.LABELS ?? "compatibility,beta,auto-report").split(",").map((s) => s.trim()).filter(Boolean);
    const { title, body } = render(report);

    // Same fingerprint already filed → a short comment instead of a new issue.
    const fpKey = `fp:${report.fingerprint}`;
    const existing = await env.STATE.get(fpKey);
    if (existing) {
      const seenKey = `seen:${report.fingerprint}:${report.install_id}`;
      if (await env.STATE.get(seenKey)) return json(200, { ok: true, deduplicated: true, issue: existing });
      await env.STATE.put(seenKey, "1", { expirationTtl: FINGERPRINT_TTL_S });
      const res = await github(env, `/issues/${existing}/comments`, {
        body: `Seen again from another install (Havit Console ${code(report.app_version)}, ${code(report.os)}).`,
      });
      return json(res.ok ? 200 : 502, { ok: res.ok, deduplicated: true, issue: existing });
    }

    const res = await github(env, "/issues", { title, body, labels });
    if (!res.ok) return json(502, { error: `github ${res.status}` });
    const issue = (await res.json()) as { number: number; html_url: string };
    await env.STATE.put(fpKey, String(issue.number), { expirationTtl: FINGERPRINT_TTL_S });
    await env.STATE.put(`seen:${report.fingerprint}:${report.install_id}`, "1", { expirationTtl: FINGERPRINT_TTL_S });
    return json(201, { ok: true, issue: issue.number, url: issue.html_url });
  },
};
