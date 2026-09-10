import { Terminal } from 'lucide-react';
import type { GameState, LogKind } from '../game/engine';
import { fmtUptime } from '../game/format';

const KIND_STYLE: Record<LogKind, { tag: string; cls: string }> = {
  sys: { tag: 'SYS ', cls: 'text-dim' },
  mine: { tag: 'MINE', cls: 'text-neon2' },
  cash: { tag: 'CASH', cls: 'text-emerald-300' },
  warn: { tag: 'WARN', cls: 'text-amber2' },
  pump: { tag: 'MRKT', cls: 'text-neon' },
  dump: { tag: 'MRKT', cls: 'text-red2' },
  shop: { tag: 'SHOP', cls: 'text-cyan2' },
  crit: { tag: 'CRIT', cls: 'text-amber-300' },
};

export default function EventLog({ g }: { g: GameState }) {
  const entries = [...g.log].reverse().slice(0, 40);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-3">
        <Terminal className="h-3.5 w-3.5 text-dim" />
        <span className="panel-title">System Log</span>
        <span className="dotted-leader" />
        <span className="font-mono text-[10px] text-faint">
          UPTIME {fmtUptime(g.playTime)} · SEQ {String(1_000_000 + g.blocksFound).slice(1)}
        </span>
      </div>
      <div className="mt-2 flex-1 overflow-y-auto px-4 pb-3 font-mono text-[10.5px] leading-relaxed" style={{ minHeight: 0 }}>
        {entries.length === 0 && (
          <div className="text-faint">
            &gt; awaiting events<span className="animate-blink">_</span>
          </div>
        )}
        {entries.map((e) => {
          const s = KIND_STYLE[e.kind];
          return (
            <div key={e.id} className="log-line flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-faint">[{fmtUptime(e.t)}]</span>
              <span className={`font-bold ${s.cls}`}>{s.tag}</span>
              <span className="truncate text-slate-300">{e.msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
