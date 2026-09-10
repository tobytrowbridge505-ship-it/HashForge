// compact number formatters for the HUD

export function fmtMoney(n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 100_000) return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
  if (a >= 1_000) return `${sign}$${a.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (a >= 100) return `${sign}$${a.toFixed(1)}`;
  return `${sign}$${a.toFixed(2)}`;
}

export function fmtPrice(n: number): string {
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

export function fmtCoins(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 100_000) return Math.round(n).toLocaleString('en-US');
  if (n >= 1_000) return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (n >= 100) return n.toFixed(2);
  return n.toFixed(4);
}

const H_UNITS = ['H', 'KH', 'MH', 'GH', 'TH', 'PH', 'EH', 'ZH'];

export function fmtHashrate(h: number): string {
  let v = h;
  let u = 0;
  while (v >= 1000 && u < H_UNITS.length - 1) {
    v /= 1000;
    u++;
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${H_UNITS[u]}/s`;
}

export function fmtHashes(h: number): string {
  return fmtHashrate(h).replace('/s', '');
}

const W_UNITS = ['W', 'kW', 'MW', 'GW'];

export function fmtWatts(w: number): string {
  let v = w;
  let u = 0;
  while (v >= 1000 && u < W_UNITS.length - 1) {
    v /= 1000;
    u++;
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${W_UNITS[u]}`;
}

export function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function fmtPerBlockTime(difficulty: number, hashrate: number): string {
  if (hashrate <= 0) return '∞';
  const t = difficulty / hashrate;
  if (t < 0.01) return '<0.01s';
  if (t < 1) return `${t.toFixed(2)}s`;
  if (t < 60) return `${t.toFixed(1)}s`;
  return `${(t / 60).toFixed(1)}m`;
}
