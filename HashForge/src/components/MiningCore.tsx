import { useEffect, useRef, useState, useCallback } from 'react';
import { Pickaxe, Zap, Crosshair, Timer, Fan } from 'lucide-react';
import type { GameState } from '../game/engine';
import {
  hashrate,
  blockReward,
  clickPower,
  critChance,
  estIncomePerSec,
} from '../game/engine';
import { fmtHashrate, fmtCoins, fmtMoney, fmtPerBlockTime } from '../game/format';

interface Floater {
  id: number;
  x: number;
  y: number;
  txt: string;
  gold?: boolean;
}

interface Burst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
}

interface Orbiter {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  wobble: number;
}

interface Shockwave {
  t0: number;
  gold: boolean;
}

interface Props {
  g: GameState;
  sync: number;
  blockNonce: number;       // increments whenever a block seals
  critNonce: number;        // increments on critical hits
  onMine: (x: number, y: number, rect: DOMRect) => { crit: boolean; reward: number } | void;
}

let floaterId = 1;

const fmtBurst = (n: number) => (n >= 1000 ? fmtCoins(n) : n.toFixed(n >= 10 ? 1 : 2));

export default function MiningCore({ g, sync, blockNonce, critNonce, onMine }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bursts = useRef<Burst[]>([]);
  const shockwaves = useRef<Shockwave[]>([]);
  const orbiters = useRef<Orbiter[]>(
    Array.from({ length: 30 }, (_, i) => ({
      angle: (i / 30) * Math.PI * 2 + Math.random(),
      radius: 0.72 + Math.random() * 0.22,
      speed: 0.25 + Math.random() * 0.6,
      size: 1 + Math.random() * 1.6,
      wobble: Math.random() * Math.PI * 2,
    })),
  );
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const hashRef = useRef(0);
  hashRef.current = hashrate(g);
  const brownRef = useRef(false);
  brownRef.current = g.brownout;

  // spawn floaters on sealed blocks
  const lastBlockNonce = useRef(blockNonce);
  useEffect(() => {
    if (blockNonce !== lastBlockNonce.current) {
      lastBlockNonce.current = blockNonce;
      const el = wrapRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        spawnFloater(r.width / 2 + (Math.random() * 60 - 30), r.height / 2 - 10, `+${fmtBurst(blockReward(g.difficulty))} HSH`);
      }
      const now = performance.now();
      const last = shockwaves.current[shockwaves.current.length - 1];
      if (!last || now - last.t0 > 280) shockwaves.current.push({ t0: now, gold: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNonce]);

  const lastCritNonce = useRef(critNonce);
  useEffect(() => {
    if (critNonce !== lastCritNonce.current) {
      lastCritNonce.current = critNonce;
      const el = wrapRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        spawnFloater(r.width / 2, r.height / 2 - 60, 'CRITICAL!', true);
      }
      shockwaves.current.push({ t0: performance.now(), gold: true });
    }
  }, [critNonce]);

  const spawnFloater = (x: number, y: number, txt: string, gold = false) => {
    const f: Floater = { id: floaterId++, x, y, txt, gold };
    setFloaters((prev) => [...prev.slice(-11), f]);
    setTimeout(() => setFloaters((prev) => prev.filter((p) => p.id !== f.id)), 1050);
  };

  // canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const S = Math.min(w, h);
      const hr = hashRef.current;
      const brown = brownRef.current;
      const neon = brown ? '255,180,84' : '124,250,155';

      // ── dashed rotating rings ──
      const rings = [
        { r: 0.46, segs: 44, speed: 0.14, alpha: 0.28 },
        { r: 0.375, segs: 30, speed: -0.2, alpha: 0.2 },
        { r: 0.295, segs: 22, speed: 0.32, alpha: 0.16 },
      ];
      for (const ring of rings) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * ring.speed * Math.PI * 2);
        ctx.strokeStyle = `rgba(${neon},${ring.alpha})`;
        ctx.lineWidth = 1;
        const radius = ring.r * S;
        const segLen = (Math.PI * 2 * radius) / ring.segs;
        for (let i = 0; i < ring.segs; i += 2) {
          const a0 = (i / ring.segs) * Math.PI * 2;
          const a1 = ((i + 1) / ring.segs) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius, a0, a0 + (a1 - a0) * 0.7);
          ctx.stroke();
        }
        ctx.restore();
        void segLen;
      }

      // tick marks on outer ring
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2 + t * 0.05;
        const r0 = 0.485 * S;
        const long = i % 5 === 0;
        const r1 = r0 + (long ? 7 : 3.5);
        ctx.strokeStyle = `rgba(${neon},${long ? 0.4 : 0.16})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();

      // ── orbit particles (scale with hashrate tier) ──
      const tier = Math.max(0, Math.log10(Math.max(1, hr)));
      const active = Math.min(orbiters.current.length, 3 + Math.floor(tier * 3.4));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < active; i++) {
        const o = orbiters.current[i];
        o.angle += o.speed * dt * (1 + tier * 0.16);
        const wob = Math.sin(t * 1.7 + o.wobble) * 0.02;
        const rr = (o.radius + wob) * S * 0.5 + S * 0.14;
        const px = cx + Math.cos(o.angle) * rr;
        const py = cy + Math.sin(o.angle) * rr * 0.96;
        const fade = Math.min(1, (active - i) / 3 + 0.4);
        ctx.fillStyle = `rgba(${neon},${0.5 * fade})`;
        ctx.shadowColor = `rgba(${neon},0.8)`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, o.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // ── ambient rising embers when hashing ──
      if (hr > 0 && Math.random() < dt * (2 + tier)) {
        bursts.current.push({
          x: cx + (Math.random() - 0.5) * S * 0.5,
          y: cy + S * 0.16,
          vx: (Math.random() - 0.5) * 12,
          vy: -(18 + Math.random() * 30),
          life: 0,
          max: 1.4 + Math.random(),
          size: 0.8 + Math.random() * 1.3,
          hue: brown ? 36 : 140,
        });
      }

      // ── bursts & embers ──
      const bs = bursts.current;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        b.life += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 14 * dt; // slight gravity
        const k = 1 - b.life / b.max;
        if (k <= 0) {
          bs.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `hsla(${b.hue}, 95%, 68%, ${k * 0.85})`;
        ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      }
      ctx.restore();
      if (bs.length > 240) bs.splice(0, bs.length - 240);

      // ── shockwaves ──
      const sw = shockwaves.current;
      for (let i = sw.length - 1; i >= 0; i--) {
        const age = (now - sw[i].t0) / 700;
        if (age >= 1) {
          sw.splice(i, 1);
          continue;
        }
        const eased = 1 - Math.pow(1 - age, 3);
        const rr = 0.1 * S + eased * 0.44 * S;
        ctx.strokeStyle = sw[i].gold
          ? `rgba(255,214,102,${(1 - age) * 0.85})`
          : `rgba(${neon},${(1 - age) * 0.7})`;
        ctx.lineWidth = 2.4 * (1 - age) + 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spawnBurst = useCallback((x: number, y: number, gold: boolean) => {
    const n = gold ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (gold ? 240 : 150);
      bursts.current.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0,
        max: 0.5 + Math.random() * 0.5,
        size: 1.2 + Math.random() * 2.2,
        hue: gold ? 46 : 140,
      });
    }
  }, []);

  const handlePointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const res = onMine(x, y, r);
    spawnBurst(x, y, !!res?.crit);
    if (res?.crit) spawnFloater(x, y - 10, `+${fmtBurst(res.reward)} HSH`, true);
    else spawnFloater(x, y, `+${clickPower(g).toLocaleString()} H`);
  };

  // spacebar mining
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.width / 2 + (Math.random() * 40 - 20);
        const y = r.height / 2 + (Math.random() * 40 - 20);
        const res = onMine(x, y, r);
        spawnBurst(x, y, !!res?.crit);
        if (res?.crit) spawnFloater(x, y - 10, `+${fmtBurst(res.reward)} HSH`, true);
        else spawnFloater(x, y, `+${clickPower(g).toLocaleString()} H`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  const hr = hashrate(g);
  const progress = Math.min(1, g.blockProgress / g.difficulty);
  const reward = blockReward(g.difficulty);
  const income = estIncomePerSec(g);
  const fanRpm = Math.min(9800, Math.round(900 + Math.sqrt(Math.max(0, hr)) * 5.5));

  return (
    <div className="relative flex h-full flex-col">
      {/* header row */}
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <span className={`h-1.5 w-1.5 rounded-full ${g.brownout ? 'bg-amber-400' : 'bg-neon animate-pulse-dot'}`} />
        <span className="panel-title">Hash Core · 01</span>
        <span className="dotted-leader" />
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-dim">
          <Fan className={`h-3 w-3 ${hr > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '0.9s' }} />
          {fanRpm.toLocaleString()} RPM
        </span>
      </div>

      {/* the core */}
      <div className="relative mx-auto w-full max-w-[380px] flex-1 px-4 py-3">
        <div
          ref={wrapRef}
          className={`core-btn relative mx-auto aspect-square w-full max-w-[360px] ${g.brownout ? 'core-brownout' : ''}`}
          onPointerDown={handlePointer}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {/* center plate */}
          <div className="core-plate absolute left-1/2 top-1/2 flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
            <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.55)' }} />
            <div className="animate-spin-slow absolute inset-[-9px] rounded-full border border-dashed border-neon/25" />
            <div className="animate-spin-slower absolute inset-[-17px] rounded-full border border-neon/10" />
            <div className="flex flex-col items-center gap-1">
              <Pickaxe className={`h-7 w-7 ${g.brownout ? 'text-amber-300' : 'text-neon glow-neon'}`} strokeWidth={1.6} />
              <span className={`font-mono text-[11px] font-bold tracking-[0.3em] ${g.brownout ? 'text-amber-200' : 'text-neon'}`}>
                MINE
              </span>
            </div>
          </div>
          {/* click floaters */}
          {floaters.map((f) => (
            <span
              key={f.id}
              className={`pointer-events-none absolute z-20 font-mono text-[13px] font-bold ${
                f.gold ? 'text-amber-300 glow-red' : 'text-neon glow-neon'
              }`}
              style={{ left: f.x, top: f.y, animation: 'floatUp 1s cubic-bezier(0.16,1,0.3,1) forwards' }}
            >
              {f.txt}
            </span>
          ))}
        </div>

        {/* hint */}
        <div className="mt-1 text-center font-mono text-[10px] tracking-[0.28em] text-faint">
          [ CLICK CORE ] · [ SPACE ] TO HASH
        </div>
      </div>

      {/* block progress */}
      <div className="px-4 pb-2">
        <div className="mb-1.5 flex items-baseline justify-between font-mono text-[10px]">
          <span className="tracking-[0.2em] text-dim">BLOCK PROGRESS</span>
          <span className="text-neon2">REWARD +{fmtCoins(reward)} HSH</span>
        </div>
        <div className="progress-track relative h-3.5 overflow-hidden rounded-sm">
          <div className="progress-fill relative h-full" style={{ width: `${progress * 100}%` }}>
            <div className="progress-sheen absolute inset-0" />
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-4 divide-x divide-line border-t border-line font-mono">
        <CoreStat icon={<Zap className="h-3 w-3" />} label="HASHRATE" value={fmtHashrate(hr)} accent />
        <CoreStat icon={<Timer className="h-3 w-3" />} label="TIME/BLOCK" value={fmtPerBlockTime(g.difficulty, hr)} />
        <CoreStat icon={<Crosshair className="h-3 w-3" />} label="CLICK POW" value={`${fmtCoins(clickPower(g))} H`} />
        <CoreStat
          icon={<Pickaxe className="h-3 w-3" />}
          label="EST $/S"
          value={fmtMoney(income)}
          sub={`CRIT ${(critChance(g) * 100).toFixed(1)}%`}
        />
      </div>
      <span className="hidden">{sync}</span>
    </div>
  );
}

function CoreStat({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-2.5 text-center">
      <span className="flex items-center gap-1 text-[9px] tracking-[0.16em] text-faint">
        {icon}
        {label}
      </span>
      <span className={`text-[12px] font-bold leading-none ${accent ? 'text-neon glow-neon' : 'text-slate-200'}`}>{value}</span>
      {sub && <span className="text-[9px] leading-none text-faint">{sub}</span>}
    </div>
  );
}
