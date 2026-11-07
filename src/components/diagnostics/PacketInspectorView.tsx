import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  AlertCircle,
} from "lucide-react";
import type { PacketLogEntry } from "../../types";
import { fetchPacketLogs, clearPacketLogs } from "../../api";

export const PacketInspectorView: React.FC = () => {
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
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Controls Bar */}
      <div className="bg-zinc-900/90 rounded-2xl p-5 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              CANLI HID PAKET İZLEYİCİ (DIAGNOSTICS)
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Tüm tersine mühendislik HID Feature ve Output raporlarının canlı hex dökümü
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrele (0xFF13, Mode, vb)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Device Filter */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">Tüm Aygıtlar</option>
            <option value="kb884l">KB884L Klavye</option>
            <option value="fuxi-h7">Fuxi-H7 Kulaklık</option>
          </select>

          {/* Auto Scroll Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>Otomatik Kaydır</span>
          </label>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Window */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 font-mono text-xs overflow-y-auto max-h-[560px] space-y-1.5 shadow-2xl">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 select-none">
            Henüz paket trafiği kaydedilmedi. Donanım işlemi yapıldığında ham HID raporları burada listelenecektir.
          </div>
        ) : (
          filtered.map((log) => {
            const isTx = log.direction === "TX";
            const isRx = log.direction === "RX";
            const isErr = log.direction === "ERR";

            return (
              <div
                key={log.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/80 transition-colors gap-2"
              >
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-zinc-500">{log.timestamp}</span>

                  <span
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isTx
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : isRx
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : isErr
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isTx && <ArrowUpRight className="w-3 h-3" />}
                    {isRx && <ArrowDownLeft className="w-3 h-3" />}
                    {isErr ? <AlertCircle className="w-3 h-3" /> : null}
                    {!isTx && !isRx && !isErr ? <Info className="w-3 h-3" /> : null}
                    <span>{log.direction}</span>
                  </span>

                  <span className="text-[11px] font-semibold text-zinc-300">
                    [{log.device_id.toUpperCase()}]
                  </span>

                  <span className="text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    {log.channel}
                  </span>
                </div>

                <div className="flex-1 px-2 text-zinc-300 truncate">
                  <span className="font-sans font-medium text-xs text-zinc-200 mr-2">
                    {log.summary}
                  </span>
                  {log.hex_preview && (
                    <span className="text-[11px] text-emerald-400/90 font-mono tracking-wider">
                      {log.hex_preview}
                    </span>
                  )}
                </div>

                {log.hex_preview && (
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">{log.byte_len} bayt</span>
                    <button
                      onClick={() => handleCopyHex(log.id, log.hex_preview)}
                      title="Hex Baytlarını Kopyala"
                      className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                      {copiedId === log.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
