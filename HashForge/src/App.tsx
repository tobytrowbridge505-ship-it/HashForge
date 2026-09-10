import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from './game/engine';
import {
  defaultState,
  loadGame,
  saveGame,
  wipeSave,
  tick,
  clickMine,
  buyRig,
  buyBoost,
  sellCoins,
  pushLog,
} from './game/engine';
import { initAudio, setMuted, sfx, startAmbient } from './audio';
import Header from './components/Header';
import MiningCore from './components/MiningCore';
import MarketChart from './components/MarketChart';
import HardwareShop from './components/HardwareShop';
import EventLog from './components/EventLog';
import BootScreen from './components/BootScreen';

export default function App() {
  const gameRef = useRef<GameState>(null as unknown as GameState);
  if (!gameRef.current) {
    gameRef.current = loadGame() ?? defaultState();
  }
  const g = gameRef.current;

  const [booted, setBooted] = useState(false);
  const [showBoot, setShowBoot] = useState(true);
  const [sync, setSync] = useState(0);
  const [blockNonce, setBlockNonce] = useState(0);
  const [critNonce, setCritNonce] = useState(0);
  const [muted, setMutedState] = useState(false);

  const hadSave = useRef(false);
  useEffect(() => {
    hadSave.current = g.playTime > 0 || g.blocksFound > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastBlockSoundAt = useRef(0);

  // ── boot ──────────────────────────────────────────────────────
  const handleInit = useCallback(() => {
    initAudio();
    sfx.boot();
    startAmbient();
    setBooted(true);
    setTimeout(() => setShowBoot(false), 720);
    pushLog(g, 'sys', hadSave.current ? 'Save state restored · welcome back, miner' : 'Miner OS online · session initialized');
    pushLog(g, 'sys', 'Dusty Laptop detected · hashrate nominal');
  }, [g]);

  // ── game loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (!booted) return;
    let raf = 0;
    let last = performance.now();
    let syncAcc = 0;
    let saveAcc = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;

      const res = tick(g, dt);

      if (res.blocks > 0) {
        setBlockNonce((n) => n + res.blocks);
        if (now - lastBlockSoundAt.current > 850) {
          lastBlockSoundAt.current = now;
          sfx.block();
        }
      }
      for (const l of res.logs) {
        if (l.kind === 'pump') sfx.buy();
        else if (l.kind === 'dump' || l.kind === 'warn') sfx.warn();
      }

      syncAcc += dt;
      if (syncAcc >= 0.1) {
        syncAcc = 0;
        setSync((n) => n + 1);
      }
      saveAcc += dt;
      if (saveAcc >= 5) {
        saveAcc = 0;
        saveGame(g);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onUnload = () => saveGame(g);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('beforeunload', onUnload);
      saveGame(g);
    };
  }, [booted, g]);

  // ── actions ───────────────────────────────────────────────────
  const handleMine = useCallback(() => {
    const res = clickMine(g);
    if (res.crit) {
      sfx.crit();
      setCritNonce((n) => n + 1);
    } else {
      sfx.click();
    }
    return { crit: res.crit, reward: res.reward };
  }, [g]);

  const handleSell = useCallback(
    (frac: number) => {
      const res = sellCoins(g, frac);
      if (res.ok) sfx.sell();
      else sfx.deny();
    },
    [g],
  );

  const handleBuyRig = useCallback(
    (id: string) => {
      const res = buyRig(g, id);
      if (res.ok) sfx.buy();
      else sfx.deny();
    },
    [g],
  );

  const handleBuyBoost = useCallback(
    (id: string) => {
      const res = buyBoost(g, id);
      if (res.ok) sfx.buy();
      else sfx.deny();
    },
    [g],
  );

  const handleToggleMute = useCallback(() => {
    setMutedState((m) => {
      setMuted(!m);
      return !m;
    });
  }, []);

  const handleReset = useCallback(() => {
    wipeSave();
    const fresh = defaultState();
    Object.assign(g, fresh);
    pushLog(g, 'warn', 'Ledger wiped · fresh genesis initialized');
    sfx.warn();
    setSync((n) => n + 1);
  }, [g]);

  return (
    <div className="bg-scene relative min-h-screen font-sans">
      {/* backdrop layers */}
      <div className="bg-grid pointer-events-none fixed inset-0 z-0" />
      <div className="scanlines pointer-events-none fixed inset-0 z-30 opacity-60" />
      <div className="vignette pointer-events-none fixed inset-0 z-0" />

      {showBoot && <BootScreen onInit={handleInit} />}

      <Header g={g} muted={muted} onToggleMute={handleToggleMute} onReset={handleReset} />

      <main className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-1 gap-3 px-4 pb-5 pt-3.5 sm:px-6 lg:grid-cols-12 lg:grid-rows-[560px_210px]">
        {/* mining core */}
        <section className="panel min-h-[540px] rounded-sm lg:col-span-4 lg:min-h-0">
          <MiningCore g={g} sync={sync} blockNonce={blockNonce} critNonce={critNonce} onMine={handleMine} />
        </section>

        {/* market */}
        <section className="panel min-h-[500px] rounded-sm lg:col-span-4 lg:min-h-0">
          <MarketChart g={g} sync={sync} onSell={handleSell} />
        </section>

        {/* shop */}
        <section className="panel h-[560px] rounded-sm lg:col-span-4 lg:row-span-2 lg:h-auto">
          <HardwareShop g={g} onBuyRig={handleBuyRig} onBuyBoost={handleBuyBoost} />
        </section>

        {/* log */}
        <section className="panel h-[220px] rounded-sm lg:col-span-8 lg:h-auto">
          <EventLog g={g} />
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-[1600px] items-center justify-between px-6 pb-5 font-mono text-[9px] tracking-[0.26em] text-faint">
        <span>HASHFORGE SIM · RUNNING ON SIMULATED SILICON</span>
        <span className="hidden sm:block">NOT FINANCIAL ADVICE · OBVIOUSLY</span>
      </footer>
    </div>
  );
}
