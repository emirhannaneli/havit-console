import { useCallback, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type AppUpdatePhase =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface AppUpdateState {
  phase: AppUpdatePhase;
  /** Version offered by the release feed, when `phase` is available/downloading/ready. */
  version: string | null;
  notes: string | null;
  released: string | null;
  /** 0..100 while downloading; null when the size is unknown. */
  progress: number | null;
  error: string | null;
}

const INITIAL: AppUpdateState = {
  phase: "idle",
  version: null,
  notes: null,
  released: null,
  progress: null,
  error: null,
};

/**
 * Self-update through GitHub Releases (`tauri-plugin-updater`). In the browser preview the
 * check reports up to date, since there is no updater runtime.
 */
export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>(INITIAL);
  const pending = useRef<Update | null>(null);

  const runCheck = useCallback(async () => {
    setState((s) => ({ ...s, phase: "checking", error: null }));
    if (!isTauri()) {
      setState({ ...INITIAL, phase: "up-to-date" });
      return;
    }
    try {
      const update = await check();
      pending.current = update;
      if (!update) {
        setState({ ...INITIAL, phase: "up-to-date" });
        return;
      }
      setState({
        phase: "available",
        version: update.version,
        notes: update.body ?? null,
        released: update.date ?? null,
        progress: null,
        error: null,
      });
    } catch (err) {
      setState({ ...INITIAL, phase: "error", error: String(err) });
    }
  }, []);

  const install = useCallback(async () => {
    const update = pending.current;
    if (!update) return;
    setState((s) => ({ ...s, phase: "downloading", progress: 0, error: null }));
    let total: number | null = null;
    let received = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          setState((s) => ({
            ...s,
            progress: total ? Math.min(100, Math.round((received / total) * 100)) : null,
          }));
        } else if (event.event === "Finished") {
          setState((s) => ({ ...s, progress: 100 }));
        }
      });
      setState((s) => ({ ...s, phase: "ready", progress: 100 }));
    } catch (err) {
      setState((s) => ({ ...s, phase: "error", error: String(err) }));
    }
  }, []);

  const restart = useCallback(async () => {
    try {
      await relaunch();
    } catch (err) {
      setState((s) => ({ ...s, phase: "error", error: String(err) }));
    }
  }, []);

  return { state, check: runCheck, install, restart };
}

export type AppUpdate = ReturnType<typeof useAppUpdate>;
