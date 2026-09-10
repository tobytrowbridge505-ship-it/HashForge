import { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Radio, Layers, Hammer, Coins, PlugZap } from 'lucide-react';
import type { GameState } from '../game/engine';
import { powerWatts, KWH_PRICE } from '../game/engine';
import { fmtPrice, fmtMoney, fmtCoins, fmtHashes } from '../game/format';

interface Props {
  g: GameState;
  sync: number;
  onSell: (frac: number) => void;
}

export default function MarketChart({ g, sync, onSell }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = Math.max(1, w * dpr);
    canvas.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const data = g.priceHistory;
    if (data.length < 2) return;

    const padL = 6;
    const padR = 8;
    const padT = 12;
    const padB = 8;

    let min = Math.min(...data);
    let max = Math.max(...data);
    const span = Math.max(max - min, max * 0.02, 0.001);
    min -= span * 0.12;
    max += span * 0.12;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const x = (i: number) => padL + (i / (data.length - 1)) * plotW;
    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;

    const first = data[0];
    const last = data[data.length - 1];
    const up = last >= first;
    const col = up ? '52,224,124' : '255,95,107';
    const colBright = up ? '#7cfa9b' : '#ff8089';

    // horizontal grid
    ctx.strokeStyle = 'rgba(148,184,210,0.07)';
    ctx.lineWidth = 1;
    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(91,113,134,0.85)';
    for (let i = 1; i <= 3; i++) {
      const gy = padT + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(w - padR, gy);
      ctx.stroke();
      const val = max - (i / 4) * (max - min);
      ctx.fillText(`$${fmtPrice(val)}`, padL + 3, gy - 2.5);
    }

    // area gradient
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, `rgba(${col},0.22)`);
    grad.addColorStop(1, `rgba(${col},0)`);

    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(x(i), y(data[i]));
    const linePath = new Path2D();
    linePath.moveTo(x(0), y(data[0]));
    for (let i = 1; i < data.length; i++) linePath.lineTo(x(i), y(data[i]));

    const fillPath = new Path2D(linePath);
    fillPath.lineTo(x(data.length - 1), h - padB);
    fillPath.lineTo(x(0), h - padB);
    fillPath.closePath();
    ctx.fillStyle = grad;
    ctx.fill(fillPath);

    // line with glow
    ctx.save();
    ctx.strokeStyle = colBright;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(${col},0.7)`;
    ctx.shadowBlur = 10;
    ctx.stroke(linePath);
    ctx.restore();

    // last point pulse
    const lx = x(data.length - 1);
    const ly = y(last);
    const pulse = (Date.now() % 1600) / 1600;
    ctx.beginPath();
    ctx.arc(lx, ly, 3 + pulse * 7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${col},${0.5 * (1 - pulse)})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = colBright;
    ctx.shadowColor = colBright;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [sync, g]);

  const hist = g.priceHistory;
  const first = hist[0] ?? g.price;
  const changePct = ((g.price - first) / first) * 100;
  const up = changePct >= 0;
  const holdings = g.coins * g.price;
  const canSell = g.coins > 0.0001;
  const height = 842_031 + g.blocksFound;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <span className={`h-1.5 w-1.5 rounded-full ${up ? 'bg-neon' : 'bg-red2'} animate-pulse-dot`} />
        <span className="panel-title">HSH / USD · Sim Feed</span>
        <span className="dotted-leader" />
        <span className="flex items-center gap-1 font-mono text-[10px] text-dim">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
      </div>

      {/* price row */}
      <div className="flex items-end justify-between px-4 pt-2">
        <div>
          <div className={`font-mono text-[34px] font-extrabold leading-none tracking-tight ${up ? 'text-neon glow-neon' : 'text-red2 glow-red'}`}>
            ${fmtPrice(g.price)}
          </div>
          <div className={`mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${up ? 'text-neon2' : 'text-red2'}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {up ? '+' : ''}
            {changePct.toFixed(2)}% · window
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-[9px] tracking-[0.2em] text-faint">BAG VALUE</div>
          <div className="text-[15px] font-bold text-slate-100">{fmtMoney(holdings)}</div>
          <div className="text-[10px] text-dim">{fmtCoins(g.coins)} HSH</div>
        </div>
      </div>

      {/* chart */}
      <div className="relative mx-4 mt-2 h-[168px] flex-shrink-0">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      {/* sell controls */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-2.5">
        {[
          { f: 0.25, label: 'SELL 25%' },
          { f: 0.5, label: 'SELL 50%' },
          { f: 1, label: 'SELL ALL' },
        ].map((b) => (
          <button
            key={b.label}
            disabled={!canSell}
            onClick={() => onSell(b.f)}
            className="btn-sell rounded-sm py-2 font-mono text-[10px] font-bold tracking-[0.18em]"
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="px-4 pt-1.5 text-center font-mono text-[9px] tracking-[0.22em] text-faint">
        NO SLIPPAGE · INSTANT SETTLEMENT · SELL THE PUMPS
      </div>

      {/* stats strip */}
      <div className="mt-auto grid grid-cols-4 divide-x divide-line border-t border-line pt-0 font-mono">
        <Stat icon={<Layers className="h-3 w-3" />} label="HEIGHT" value={`#${height.toLocaleString()}`} />
        <Stat icon={<Hammer className="h-3 w-3" />} label="HASHED" value={fmtHashes(g.totalHashes)} />
        <Stat icon={<Coins className="h-3 w-3" />} label="HSH MINED" value={fmtCoins(g.totalCoinsMined)} />
        <Stat
          icon={<PlugZap className="h-3 w-3" />}
          label="PWR COST"
          value={`${fmtMoney((powerWatts(g) / 1000) * KWH_PRICE)}/h`}
        />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-2.5 text-center">
      <span className="flex items-center gap-1 text-[9px] tracking-[0.16em] text-faint">
        {icon}
        {label}
      </span>
      <span className="text-[12px] font-bold leading-none text-slate-200">{value}</span>
    </div>
  );
}
