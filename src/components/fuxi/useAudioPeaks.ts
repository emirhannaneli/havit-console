import { useState, useEffect, useRef } from "react";
import type { FuxiAudioPeaks } from "../../types";
import { fetchFuxiAudioPeaks } from "../../api";

const DEFAULT_PEAKS: FuxiAudioPeaks = {
  speaker_peak: 0,
  speaker_left: 0,
  speaker_right: 0,
  mic_peak: 0,
};

/**
 * Polls audio peak meters (~25 fps) from Windows CoreAudio when the audio view is active.
 * Used to drive real-time VU meters, pulse glows, and spectrum visualizers.
 */
export function useAudioPeaks(enabled: boolean = true): FuxiAudioPeaks {
  const [peaks, setPeaks] = useState<FuxiAudioPeaks>(DEFAULT_PEAKS);
  const activeRef = useRef(enabled);
  activeRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    let timer: number;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || !activeRef.current) return;
      try {
        const p = await fetchFuxiAudioPeaks();
        if (!cancelled && activeRef.current) {
          setPeaks(p);
        }
      } catch {
        // Ignore background polling errors
      }
      if (!cancelled && activeRef.current) {
        timer = window.setTimeout(poll, 40);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  return peaks;
}
