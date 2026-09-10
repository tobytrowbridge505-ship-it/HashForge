import { useState } from 'react';
import { Cpu, Wallet, Coins, Activity, PlugZap, Volume2, VolumeX, RotateCcw, TriangleAlert } from 'lucide-react';
import type { GameState } from '../game/engine';
import { hashrate, powerWatts, powerCostPerSec } from '../game/engine';
import { fmtMoney, fmtCoins, fmtHashrate, fmtWatts } from '../game/format';

interface Props {
  g: GameState;
  muted: boolean;
  onToggleMute: () => void;
  onReset: () => void;
}

export default function Header({ g, muted, onToggleMute, onReset }: Props) {
  const [armReset, setArmReset] = useState(false);

  const handleReset = () => {
    if (armReset) {
      setArmReset(false);
      onReset();
    } else {
      setArmReset(true);
      setTimeout(() => setArmReset(false), 2200);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-abyss/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-neon/40 bg-neon/10 shadow-[0_0_18px_rgba(124,250,155,0.2)]">
            <Cpu className="h-4.5 w-4.5 text-neon" strokeWidth={1.8} />
          </div>
          <div className="leading-none">
            <div className="font-mono text-[13px] font-extrabold tracking-[0.24em] text-slate-100">
              HASH<span className="text-neon glow-neon">FORGE</span>
            </div>
            <div className="mt-1 font-mono text-[8.5px] tracking-[0.3em] text-faint">MINER OS · v2.1.7</div>
          </div>
        </div>

        <div className="hidden h-8 w-px bg-line sm:block" />

        {/* balances */}
        <HudItem icon={<Wallet className="h-3.5 w-3.5" />} label="USD WALLET" value={fmtMoney(g.usd)} valueCls="text-emerald-300" />
        <HudItem icon={<Coins className="h-3.5 w-3.5" />} label="HSH BAG" value={`${fmtCoins(g.coins)}`} valueCls="text-neon glow-neon" />
        <div className="hidden md:contents">
          <HudItem icon={<Activity className="h-3.5 w-3.5" />} label="HASHRATE" value={fmtHashrate(hashrate(g))} valueCls="text-cyan2" />
          <HudItem
            icon={<PlugZap className="h-3.5 w-3.5" />}
            label="GRID LOAD"
            value={`${fmtWatts(powerWatts(g))} · ${fmtMoney(powerCostPerSec(g) * 3600)}/h`}
            valueCls={g.brownout ? 'text-amber2' : 'text-slate-200'}
          />
        </div>

        {g.brownout && (
          <span className="flex items-center gap-1.5 rounded-sm border border-amber2/40 bg-amber2/10 px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.14em] text-amber2">
            <TriangleAlert className="h-3 w-3" />
            BROWNOUT · THROTTLED 35%
          </span>
        )}

        {/* controls */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            className="icon-btn flex h-8 w-8 items-center justify-center rounded-sm text-dim"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={handleReset}
            className={`icon-btn flex h-8 items-center justify-center rounded-sm px-2 font-mono text-[9.5px] font-bold tracking-wider ${
              armReset ? 'border-red2/60 text-red2' : 'text-dim'
            }`}
            title="Wipe save & reboot"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {armReset && <span className="ml-1.5">SURE?</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

function HudItem({ icon, label, value, valueCls }: { icon: React.ReactNode; label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-faint">{icon}</span>
      <div className="leading-none">
        <div className="font-mono text-[8px] tracking-[0.24em] text-faint">{label}</div>
        <div className={`mt-1 font-mono text-[13px] font-bold ${valueCls ?? 'text-slate-200'}`}>{value}</div>
      </div>
    </div>
  );
}
