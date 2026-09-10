import { useState } from 'react';
import {
  Laptop,
  Gamepad2,
  Cpu,
  Server,
  CircuitBoard,
  Container,
  Warehouse,
  Factory,
  Satellite,
  Gauge,
  Snowflake,
  Clover,
  MousePointerClick,
  Lock,
  Store,
  Plus,
} from 'lucide-react';
import type { GameState } from '../game/engine';
import { HARDWARE, BOOSTS, rigCost, boostCost } from '../game/engine';
import { fmtMoney, fmtHashrate, fmtWatts } from '../game/format';

const RIG_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  laptop: Laptop,
  gamer: Gamepad2,
  rig6: Cpu,
  rack: Server,
  asic: CircuitBoard,
  container: Container,
  warehouse: Warehouse,
  geo: Factory,
  orbital: Satellite,
};

const BOOST_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  overclock: Gauge,
  cooling: Snowflake,
  luck: Clover,
  click: MousePointerClick,
};

interface Props {
  g: GameState;
  onBuyRig: (id: string) => void;
  onBuyBoost: (id: string) => void;
}

export default function HardwareShop({ g, onBuyRig, onBuyBoost }: Props) {
  const [tab, setTab] = useState<'rigs' | 'boosts'>('rigs');

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <Store className="h-3.5 w-3.5 text-dim" />
        <span className="panel-title">Acquisitions</span>
        <span className="dotted-leader" />
        <div className="flex gap-1">
          {(['rigs', 'boosts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-sm px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.16em] transition-all ${
                tab === t
                  ? 'bg-neon/15 text-neon shadow-[0_0_14px_rgba(124,250,155,0.15)]'
                  : 'text-dim hover:text-slate-300'
              }`}
            >
              {t === 'rigs' ? 'HARDWARE' : 'OVERCLOCK'}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3" style={{ minHeight: 0 }}>
        {tab === 'rigs'
          ? HARDWARE.map((h, idx) => {
              const owned = g.rigs[h.id] ?? 0;
              const cost = rigCost(h, owned);
              const afford = g.usd >= cost;
              const revealed = owned > 0 || idx <= highestAffordableIndex(g) + 1;
              const Icon = RIG_ICONS[h.id];
              return (
                <div
                  key={h.id}
                  className={`shop-row group flex items-center gap-3 rounded-sm px-2.5 py-2 ${afford ? '' : 'locked'}`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border ${
                      afford ? 'border-neon/30 bg-neon/5 text-neon' : 'border-line2 bg-panel2 text-dim'
                    }`}
                  >
                    {revealed ? <Icon className="h-4.5 w-4.5" strokeWidth={1.5} /> : <Lock className="h-4 w-4" strokeWidth={1.5} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-[12.5px] font-semibold ${revealed ? 'text-slate-100' : 'text-faint'}`}>
                        {revealed ? h.name : '██████ ████'}
                      </span>
                      {owned > 0 && (
                        <span className="rounded-sm bg-neon/15 px-1.5 font-mono text-[9px] font-bold text-neon">
                          ×{owned}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-[9px] tracking-wide text-faint">
                      {revealed ? h.tag : 'DECRYPT BY PROGRESSING'}
                    </div>
                    <div className="mt-0.5 flex gap-2.5 font-mono text-[10px] text-dim">
                      <span className="text-cyan2">{fmtHashrate(h.hash)}</span>
                      <span className={h.watts === 0 ? 'text-neon2' : 'text-amber2/80'}>
                        {h.watts === 0 ? 'SOLAR · 0 W' : fmtWatts(h.watts)}
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={!afford}
                    onClick={() => onBuyRig(h.id)}
                    className={`btn-buy flex flex-shrink-0 items-center gap-1 rounded-sm px-2.5 py-1.5 font-mono text-[10.5px] font-bold ${
                      afford
                        ? 'bg-neon/15 text-neon shadow-[0_0_14px_rgba(124,250,155,0.12)]'
                        : 'bg-panel2 text-faint'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    {fmtMoney(cost)}
                  </button>
                </div>
              );
            })
          : BOOSTS.map((b) => {
              const lvl = g.boosts[b.id] ?? 0;
              const maxed = lvl >= b.max;
              const cost = boostCost(b, lvl);
              const afford = !maxed && g.usd >= cost;
              const Icon = BOOST_ICONS[b.id];
              return (
                <div
                  key={b.id}
                  className={`shop-row group flex items-center gap-3 rounded-sm px-2.5 py-2 ${afford ? '' : 'locked'}`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border ${
                      afford ? 'border-cyan2/30 bg-cyan2/5 text-cyan2' : 'border-line2 bg-panel2 text-dim'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-slate-100">{b.name}</span>
                      <span className="rounded-sm bg-cyan2/15 px-1.5 font-mono text-[9px] font-bold text-cyan2">
                        LV.{lvl}{maxed ? ' MAX' : ''}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[9.5px] tracking-wide text-dim">{b.desc}</div>
                    <MiniPips lvl={lvl} max={Math.min(b.max, 12)} realMax={b.max} />
                  </div>
                  <button
                    disabled={!afford}
                    onClick={() => onBuyBoost(b.id)}
                    className={`btn-buy flex flex-shrink-0 items-center gap-1 rounded-sm px-2.5 py-1.5 font-mono text-[10.5px] font-bold ${
                      maxed
                        ? 'bg-panel2 text-faint'
                        : afford
                          ? 'bg-cyan2/15 text-cyan2 shadow-[0_0_14px_rgba(84,224,240,0.12)]'
                          : 'bg-panel2 text-faint'
                    }`}
                  >
                    {maxed ? (
                      'MAX'
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        {fmtMoney(cost)}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function highestAffordableIndex(g: GameState): number {
  let hi = 0;
  HARDWARE.forEach((h, i) => {
    if ((g.rigs[h.id] ?? 0) > 0) hi = Math.max(hi, i);
  });
  return hi;
}

function MiniPips({ lvl, max, realMax }: { lvl: number; max: number; realMax: number }) {
  const shown = Math.min(lvl, max);
  return (
    <div className="mt-1 flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-1 w-2.5 rounded-[1px] ${i < shown ? 'bg-cyan2 shadow-[0_0_6px_rgba(84,224,240,0.5)]' : 'bg-line2'}`}
        />
      ))}
      {realMax > max && <span className="ml-1 font-mono text-[8px] text-faint">+{realMax - max}</span>}
    </div>
  );
}
