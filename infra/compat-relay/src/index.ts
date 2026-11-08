/**
 * Compatibility report relay for Havit Console.
 *
 * The desktop app cannot hold a GitHub token (anything shipped in the app can be
 * extracted), so it POSTs reports here and this Worker files them as GitHub issues with a
 * fine-grained token that only has "Issues: write" on the one repository.
 *
 * Abuse limits: body size, per-IP hourly quota and a global daily quota (KV counters), and
 * deduplication by report fingerprint (same report → a comment on the existing issue instead
 * of a new one).
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

const MAX_BODY_BYTES = 32_000;
const PER_IP_PER_HOUR = 20;
const GLOBAL_PER_DAY = 300;
const FINGERPRINT_TTL_S = 30 * 24 * 3600;

interface Report {
  schema: 1;
  event: "inventory" | "failure" | "manual";
  app_version: string;
  os: string;
  install_id: string;
  fingerprint: string;
  title: string;
  /** Markdown; produced by the app, shown to the user when auto-send is off. */
  body: string;
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

function validate(x: unknown): Report | string {
  if (!x || typeof x !== "object") return "body must be an object";
  const r = x as Record<string, unknown>;
  if (r.schema !== 1) return "unsupported schema";
  if (!["inventory", "failure", "manual"].includes(String(r.event))) return "bad event";
  for (const k of ["app_version", "os", "install_id", "fingerprint", "title", "body"]) {
    if (typeof r[k] !== "string" || !(r[k] as string).trim()) return `missing ${k}`;
  }
  if (!/^[0-9a-f]{16,64}$/.test(r.fingerprint as string)) return "bad fingerprint";
  if (!/^[0-9a-f-]{8,64}$/.test(r.install_id as string)) return "bad install_id";
  if ((r.title as string).length > 200) return "title too long";
  if ((r.body as string).length > 24_000) return "report too long";
  return r as unknown as Report;
}

async function bump(env: Env, key: string, ttl: number, limit: number): Promise<boolean> {
  const n = Number((await env.STATE.get(key)) ?? "0") + 1;
  await env.STATE.put(key, String(n), { expirationTtl: ttl });
  return n <= limit;
}

async function github(env: Env, path: string, init: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "havit-console-compat-relay",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return json(204, null);
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/v1/report") return json(404, { error: "not found" });

    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > MAX_BODY_BYTES) return json(413, { error: "report too large" });

    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return json(400, { error: "invalid json" });
    }
    const report = validate(parsed);
    if (typeof report === "string") return json(400, { error: report });

    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    const hour = Math.floor(Date.now() / 3_600_000);
    const day = Math.floor(Date.now() / 86_400_000);
    if (!(await bump(env, `ip:${ip}:${hour}`, 3600, PER_IP_PER_HOUR))) return json(429, { error: "too many reports" });
    if (!(await bump(env, `global:${day}`, 86_400, GLOBAL_PER_DAY))) return json(429, { error: "daily quota reached" });

    const labels = (env.LABELS ?? "compatibility,beta,auto-report").split(",").map((s) => s.trim()).filter(Boolean);
    const footer = `\n\n---\n_Automatic report · install \`${report.install_id.slice(0, 8)}\` · fingerprint \`${report.fingerprint.slice(0, 12)}\`_`;

    // Same fingerprint already filed → add a short comment instead of a new issue.
    const fpKey = `fp:${report.fingerprint}`;
    const existing = await env.STATE.get(fpKey);
    if (existing) {
      const seenKey = `seen:${report.fingerprint}:${report.install_id}`;
      if (await env.STATE.get(seenKey)) return json(200, { ok: true, deduplicated: true, issue: existing });
      await env.STATE.put(seenKey, "1", { expirationTtl: FINGERPRINT_TTL_S });
      const res = await github(env, `/issues/${existing}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: `Seen again from another install (Havit Console ${report.app_version}, ${report.os}).${footer}`,
        }),
      });
      return json(res.ok ? 200 : 502, { ok: res.ok, deduplicated: true, issue: existing });
    }

    const res = await github(env, "/issues", {
      method: "POST",
      body: JSON.stringify({ title: report.title.slice(0, 200), body: report.body + footer, labels }),
    });
    if (!res.ok) return json(502, { error: `github ${res.status}` });
    const issue = (await res.json()) as { number: number; html_url: string };
    await env.STATE.put(fpKey, String(issue.number), { expirationTtl: FINGERPRINT_TTL_S });
    await env.STATE.put(`seen:${report.fingerprint}:${report.install_id}`, "1", { expirationTtl: FINGERPRINT_TTL_S });
    return json(201, { ok: true, issue: issue.number, url: issue.html_url });
  },
};
