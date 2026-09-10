import { useEffect, useState } from 'react';
import { Cpu, ChevronsRight, MousePointerClick, LineChart, Factory } from 'lucide-react';

const BOOT_LINES = [
  '> hashforge kernel v2.1.7 ............ OK',
  '> detecting silicon ...... 1× CORE2DUO FOUND',
  '> syncing mempool .................... OK',
  '> calibrating nonce lattice .......... OK',
  '> market feed connected ...... HSH @ $2.600',
  '> WARNING: fans may emit jazz',
];

interface Props {
  onInit: () => void;
}

export default function BootScreen({ onInit }: Props) {
  const [shown, setShown] = useState(0);
  const [exiting, setExiting] = useState(false);
  const ready = shown >= BOOT_LINES.length;

  useEffect(() => {
    const iv = setInterval(() => {
      setShown((n) => {
        if (n >= BOOT_LINES.length) {
          clearInterval(iv);
          return n;
        }
        return n + 1;
      });
    }, 190);
    return () => clearInterval(iv);
  }, []);

  const handleInit = () => {
    if (!ready || exiting) return;
    setExiting(true);
    onInit();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#020409] transition-opacity duration-700 ${
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="bg-grid absolute inset-0" />
      <div className="vignette absolute inset-0" />

      <div className="relative mx-4 w-full max-w-[560px]">
        {/* brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-neon/40 bg-neon/10 shadow-[0_0_50px_rgba(124,250,155,0.25)]">
            <Cpu className="h-7 w-7 text-neon" strokeWidth={1.5} />
          </div>
          <div className="font-mono text-[10px] tracking-[0.5em] text-dim">HASHFORGE SYSTEMS PRESENTS</div>
          <h1 className="mt-3 font-mono text-[44px] font-extrabold leading-none tracking-tight sm:text-[58px]">
            <span className="text-slate-100">HASH</span>
            <span className="text-outline">//</span>
            <span className="text-neon glow-neon">FORGE</span>
          </h1>
          <div className="mt-3 font-mono text-[10.5px] tracking-[0.34em] text-cyan2 glow-cyan">
            CRYPTO MINER SIMULATOR
          </div>
        </div>

        {/* terminal */}
        <div className="panel rounded-sm p-4">
          <div className="min-h-[132px] font-mono text-[11px] leading-[1.9] text-neon2/90">
            {BOOT_LINES.slice(0, shown).map((l, i) => (
              <div key={i} className="log-line">{l}</div>
            ))}
            {!ready && <span className="animate-blink text-neon">▌</span>}
          </div>

          <button
            onClick={handleInit}
            disabled={!ready}
            className={`group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-sm border py-3.5 font-mono text-[12px] font-extrabold tracking-[0.34em] transition-all duration-300 ${
              ready
                ? 'border-neon/50 bg-neon/10 text-neon shadow-[0_0_30px_rgba(124,250,155,0.15)] hover:bg-neon/20 hover:shadow-[0_0_46px_rgba(124,250,155,0.3)]'
                : 'cursor-wait border-line2 text-faint'
            }`}
          >
            {ready ? (
              <>
                INITIALIZE MINING
                <ChevronsRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            ) : (
              'BOOTING…'
            )}
          </button>
        </div>

        {/* how to play */}
        <div className="mt-5 grid grid-cols-3 gap-2 font-mono">
          <Hint icon={<MousePointerClick className="h-3.5 w-3.5" />} top="CLICK THE CORE" sub="manual hashing" />
          <Hint icon={<LineChart className="h-3.5 w-3.5" />} top="SELL THE PUMPS" sub="time the market" />
          <Hint icon={<Factory className="h-3.5 w-3.5" />} top="SCALE THE FARM" sub="laptop → orbit" />
        </div>

        <div className="mt-6 text-center font-mono text-[8.5px] tracking-[0.28em] text-faint">
          BUILD 4513 · UNLICENSED ALPHA SILICON · SIMULATED MARKETS ONLY
        </div>
      </div>
    </div>
  );
}

function Hint({ icon, top, sub }: { icon: React.ReactNode; top: string; sub: string }) {
  return (
    <div className="chip rounded-sm px-2 py-2.5 text-center">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-[0.12em] text-slate-200">
        <span className="text-neon">{icon}</span>
        {top}
      </div>
      <div className="text-[9px] tracking-wider text-faint">{sub}</div>
    </div>
  );
}
