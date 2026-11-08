import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Check, Copy, Info, Search, Trash2 } from "lucide-react";
import type { PacketLogEntry } from "../../types";
import { fetchPacketLogs, clearPacketLogs } from "../../api";
import { Button, Select, cx } from "../ui";
import { useT } from "../../i18n";

export const PacketInspectorView: React.FC = () => {
  const { t } = useT();
  const [logs, setLogs] = useState<PacketLogEntry[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const entries = await fetchPacketLogs();
        setLogs(entries);
      } catch (err) {
        console.error(err);
      }
    };
    poll();
    const interval = setInterval(poll, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleClear = async () => {
    try {
      await clearPacketLogs();
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyHex = (id: number, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = logs.filter((l) => {
    if (deviceFilter !== "all" && l.device_id !== deviceFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        l.summary.toLowerCase().includes(term) ||
        l.channel.toLowerCase().includes(term) ||
        l.hex_preview.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-7 min-w-[220px] flex-1 items-center gap-1.5 rounded-md border border-control-border bg-control px-2 text-secondary">
          <Search aria-hidden="true" className="h-3.5 w-3.5 flex-none" />
          <input
            type="search"
            aria-label={t("diagnostics.search.aria")}
            placeholder={t("diagnostics.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-label outline-none placeholder:text-tertiary"
          />
        </label>

        <Select
          label={t("diagnostics.filter")}
          value={deviceFilter}
          options={[
            { value: "all", label: t("diagnostics.all") },
            { value: "kb884l", label: t("device.kb884l") },
            { value: "fuxi-h7", label: t("device.fuxi") },
          ]}
          onChange={setDeviceFilter}
        />

        <label className="flex h-7 cursor-pointer items-center gap-1.5 text-[13px] select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="m-0 h-3.5 w-3.5"
          />
          {t("diagnostics.autoScroll")}
        </label>

        <Button variant="destructive" onClick={handleClear} disabled={logs.length === 0}>
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          {t("diagnostics.clear")}
        </Button>
      </div>

      <section aria-label={t("diagnostics.log.aria")} className="flex flex-col gap-2">
        <div className="max-h-[calc(100vh-220px)] min-h-[320px] overflow-y-auto rounded-[10px] border border-separator bg-card font-mono text-xs">
          {filtered.length === 0 ? (
            <p className="m-0 px-4 py-20 text-center font-sans text-[13px] text-secondary">
              {logs.length === 0 ? t("diagnostics.empty") : t("diagnostics.noMatch")}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-separator p-0">
              {filtered.map((log) => {
                const isTx = log.direction === "TX";
                const isRx = log.direction === "RX";
                const isErr = log.direction === "ERR";
                const DirIcon = isTx ? ArrowUpRight : isRx ? ArrowDownLeft : isErr ? AlertCircle : Info;
                return (
                  <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2 hover:bg-fill-hover">
                    <span className="flex-none text-[11px] text-secondary tabular-nums">{log.timestamp}</span>
                    <span
                      className={cx(
                        "flex w-12 flex-none items-center gap-1 text-[11px] font-bold",
                        isTx && "text-accent-text",
                        isRx && "text-focus",
                        isErr && "text-danger",
                        !isTx && !isRx && !isErr && "text-secondary"
                      )}
                    >
                      <DirIcon aria-hidden="true" className="h-3 w-3" />
                      {log.direction}
                    </span>
                    <span className="flex-none text-[11px] font-semibold">{log.device_id.toUpperCase()}</span>
                    <span className="flex-none rounded bg-fill px-1.5 py-0.5 text-[11px] text-secondary">
                      {log.channel}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="mr-2 font-sans text-[13px]">{log.summary}</span>
                      {log.hex_preview && <span className="tracking-wider text-secondary">{log.hex_preview}</span>}
                    </span>
                    {log.hex_preview && (
                      <span className="flex flex-none items-center gap-2">
                        <span className="text-[11px] text-secondary">{t("diagnostics.bytes", { count: log.byte_len })}</span>
                        <Button
                          variant="plain"
                          aria-label={copiedId === log.id ? t("diagnostics.copied") : t("diagnostics.copyHex")}
                          title={t("diagnostics.copyHex")}
                          onClick={() => handleCopyHex(log.id, log.hex_preview)}
                          className="h-7 w-7 px-0"
                        >
                          {copiedId === log.id ? (
                            <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>
        <p className="m-0 px-1 text-[11px] leading-[14px] text-secondary">
          {t("diagnostics.footer")}
        </p>
      </section>
    </>
  );
};
