// ─────────────────────────────────────────────────────────────
//  HASHFORGE · game engine — pure state math, no React in here
// ─────────────────────────────────────────────────────────────

export type LogKind = 'sys' | 'mine' | 'cash' | 'warn' | 'pump' | 'dump' | 'shop' | 'crit';

export interface LogEntry {
  id: number;
  t: number; // playTime seconds
  kind: LogKind;
  msg: string;
}

export interface Hardware {
  id: string;
  name: string;
  tag: string;
  hash: number; // H/s
  watts: number;
  cost: number; // USD base
}

export interface Boost {
  id: string;
  name: string;
  desc: string;
  base: number;
  max: number;
}

export interface GameState {
  usd: number;
  coins: number;
  price: number;
  priceHistory: number[];
  marketT: number;
  eventT: number;

  blocksFound: number;
  totalHashes: number;
  totalCoinsMined: number;
  totalUsdEarned: number;
  totalPowerSpent: number;
  clicks: number;
  playTime: number;

  blockProgress: number;
  difficulty: number;

  rigs: Record<string, number>;
  boosts: Record<string, number>;

  brownout: boolean;
  brownoutLogged: boolean;
  lastMineLogAt: number;

  log: LogEntry[];
  logSeq: number;
}

// ── balancing constants ────────────────────────────────────────
export const DIFF_START = 500;
export const DIFF_GROWTH = 1.022;
export const BASE_REWARD = 8;
export const CLICK_BASE = 25;
export const PRICE_START = 2.6;
export const MARKET_DT = 1.15; // seconds per market tick
export const COST_MULT = 1.35;
export const BOOST_MULT = 2.2;
export const KWH_PRICE = 0.12; // $ per kWh
export const FACILITY_WATTS = 120; // always-on base load
export const BROWNOUT_FACTOR = 0.35;

export const HARDWARE: Hardware[] = [
  { id: 'laptop',    name: 'Dusty Laptop',        tag: 'CORE2DUO · INTEGRATED GFX', hash: 60,        watts: 65,       cost: 60 },
  { id: 'gamer',     name: 'Retro Gaming PC',      tag: 'GTX 970 · RGB CURSED',      hash: 420,       watts: 450,      cost: 520 },
  { id: 'rig6',      name: 'GPU Rig ×6',           tag: '6× RTX 4090 · OPEN FRAME',  hash: 3_200,     watts: 1350,     cost: 3_400 },
  { id: 'rack',      name: 'Rack Row 42U',         tag: '16× SERVER NODES',          hash: 18_000,    watts: 4_200,    cost: 16_000 },
  { id: 'asic',      name: 'ASIC S19 Pro',         tag: 'SHA-256 · 120dB HOWL',      hash: 110_000,   watts: 3_250,    cost: 68_000 },
  { id: 'container', name: 'Hash Container',       tag: '40FT · 480 ASICS',          hash: 850_000,   watts: 29_000,   cost: 420_000 },
  { id: 'warehouse', name: 'Warehouse Farm',       tag: 'INDUSTRIAL EST. · ICELAND', hash: 6_500_000, watts: 240_000,  cost: 2_800_000 },
  { id: 'geo',       name: 'Geothermal Plant',     tag: 'VOLCANIC PPA · SUBSEA LINK',hash: 48_000_000,watts: 1_600_000,cost: 19_000_000 },
  { id: 'orbital',   name: 'Orbital Solar Array',  tag: 'LEO CONSTELLATION · LASER DOWNLINK', hash: 420_000_000, watts: 0, cost: 160_000_000 },
];

export const BOOSTS: Boost[] = [
  { id: 'overclock', name: 'Overclock Firmware', desc: '+25% total hashrate / lvl',   base: 400,  max: 25 },
  { id: 'cooling',   name: 'Liquid Cooling Loop', desc: '−8% facility power / lvl',   base: 350,  max: 10 },
  { id: 'luck',      name: 'Lucky Nonce Chip',    desc: '+1.5% crit hash chance / lvl', base: 500, max: 10 },
  { id: 'click',     name: 'Titan Cursor',        desc: 'manual click power ×2 / lvl', base: 250,  max: 12 },
];

let logId = 1;

export function defaultState(): GameState {
  return {
    usd: 100,
    coins: 0,
    price: PRICE_START,
    priceHistory: [PRICE_START],
    marketT: 0,
    eventT: 24 + Math.random() * 20,

    blocksFound: 0,
    totalHashes: 0,
    totalCoinsMined: 0,
    totalUsdEarned: 0,
    totalPowerSpent: 0,
    clicks: 0,
    playTime: 0,

    blockProgress: 0,
    difficulty: DIFF_START,

    rigs: { laptop: 1 },
    boosts: {},

    brownout: false,
    brownoutLogged: false,
    lastMineLogAt: -10,

    log: [],
    logSeq: 1,
  };
}

// ── derived stats ──────────────────────────────────────────────
export const baseHashrate = (s: GameState) =>
  HARDWARE.reduce((acc, h) => acc + h.hash * (s.rigs[h.id] ?? 0), 0);

export const overclockMult = (s: GameState) => 1 + 0.25 * (s.boosts.overclock ?? 0);

export const hashrate = (s: GameState) =>
  baseHashrate(s) * overclockMult(s) * (s.brownout ? BROWNOUT_FACTOR : 1);

export const powerWatts = (s: GameState) => {
  const rigW = HARDWARE.reduce((acc, h) => acc + h.watts * (s.rigs[h.id] ?? 0), 0);
  const coolFactor = Math.max(0.4, 1 - 0.08 * (s.boosts.cooling ?? 0));
  return (rigW + FACILITY_WATTS) * coolFactor;
};

export const powerCostPerSec = (s: GameState) => (powerWatts(s) / 1000) * (KWH_PRICE / 3600);

export const clickPower = (s: GameState) => CLICK_BASE * Math.pow(2, s.boosts.click ?? 0);

export const critChance = (s: GameState) => Math.min(0.25, 0.02 + 0.015 * (s.boosts.luck ?? 0));

export const blockReward = (difficulty: number) =>
  BASE_REWARD * Math.pow(difficulty / DIFF_START, 0.55);

export const rigCost = (h: Hardware, owned: number) => h.cost * Math.pow(COST_MULT, owned);

export const boostCost = (b: Boost, lvl: number) => b.base * Math.pow(BOOST_MULT, lvl);

export const estIncomePerSec = (s: GameState) =>
  (hashrate(s) / s.difficulty) * blockReward(s.difficulty) * s.price;

// ── logging ────────────────────────────────────────────────────
export function pushLog(s: GameState, kind: LogKind, msg: string) {
  s.log.push({ id: logId++, t: s.playTime, kind, msg });
  if (s.log.length > 60) s.log.splice(0, s.log.length - 60);
}

// ── market ─────────────────────────────────────────────────────
const PUMPS = [
  'Whale accumulation detected on-chain',
  'Elon posts laser-eye selfie',
  'Nation-state adds HSH to treasury reserves',
  'Major exchange lists HSH perpetuals',
  'Satoshi-era wallet stirs after 14 years',
  'ETF inflows smash daily record',
  'Influencer streams 24h HSH marathon',
];
const DUMPS = [
  'Exchange hack rumors spread on CryptoTwitter',
  'Regulators open probe into hash markets',
  'Top-3 mining pool capitulates',
  'Quantum-computing FUD hits front page',
  'Whale wallet dumps into thin books',
  'Stablecoin depeg spooks risk assets',
  'Governance vote goes horribly wrong',
];

function marketTick(s: GameState) {
  const vol = 0.011;
  const drift = 0.0004;
  const shock = (Math.random() + Math.random() + Math.random()) / 3 - 0.5; // centered, smoother
  s.price = clampPrice(s.price * (1 + drift + shock * 2 * vol));
  s.priceHistory.push(s.price);
  if (s.priceHistory.length > 180) s.priceHistory.shift();
}

function fireMarketEvent(s: GameState, logs: LogEntry[]) {
  const isPump = Math.random() < 0.58;
  const mag = 0.06 + Math.random() * 0.15;
  const pool = isPump ? PUMPS : DUMPS;
  const msg = pool[Math.floor(Math.random() * pool.length)];
  s.price = clampPrice(s.price * (isPump ? 1 + mag : 1 - mag));
  s.priceHistory.push(s.price);
  if (s.priceHistory.length > 180) s.priceHistory.shift();
  const entry: LogEntry = {
    id: logId++,
    t: s.playTime,
    kind: isPump ? 'pump' : 'dump',
    msg: `${msg} — ${isPump ? '+' : '−'}${(mag * 100).toFixed(1)}%`,
  };
  logs.push(entry);
}

const clampPrice = (p: number) => Math.min(300, Math.max(0.08, p));

// ── main tick ──────────────────────────────────────────────────
export interface TickResult {
  blocks: number;
  coins: number;
  logs: LogEntry[];
}

export function tick(s: GameState, dt: number): TickResult {
  const logs: LogEntry[] = [];
  s.playTime += dt;

  // hashing
  const hr = hashrate(s);
  s.totalHashes += hr * dt;
  s.blockProgress += hr * dt;

  let blocks = 0;
  let coins = 0;
  while (s.blockProgress >= s.difficulty && blocks < 60) {
    s.blockProgress -= s.difficulty;
    const reward = blockReward(s.difficulty);
    blocks++;
    coins += reward;
    s.blocksFound++;
    s.coins += reward;
    s.totalCoinsMined += reward;
    s.difficulty *= DIFF_GROWTH;
  }
  if (blocks > 0 && s.playTime - s.lastMineLogAt > 3) {
    s.lastMineLogAt = s.playTime;
    logs.push({
      id: logId++,
      t: s.playTime,
      kind: 'mine',
      msg: `Block #${(842_031 + s.blocksFound).toLocaleString()} sealed · +${coins.toFixed(2)} HSH`,
    });
  }

  // electricity bill
  const bill = powerCostPerSec(s) * dt;
  if (s.usd > 0) {
    const paid = Math.min(s.usd, bill);
    s.usd -= paid;
    s.totalPowerSpent += paid;
  }
  const wasBrownout = s.brownout;
  s.brownout = s.usd <= 0.001 && powerWatts(s) > 0;
  if (s.brownout && (!wasBrownout || !s.brownoutLogged)) {
    s.brownoutLogged = true;
    logs.push({ id: logId++, t: s.playTime, kind: 'warn', msg: 'GRID BROWNOUT — unpaid power, rigs throttled to 35%' });
  }
  if (!s.brownout) s.brownoutLogged = false;

  // market
  s.marketT += dt;
  while (s.marketT >= MARKET_DT) {
    s.marketT -= MARKET_DT;
    marketTick(s);
  }
  s.eventT -= dt;
  if (s.eventT <= 0) {
    fireMarketEvent(s, logs);
    s.eventT = 34 + Math.random() * 48;
  }

  for (const l of logs) s.log.push(l);
  if (s.log.length > 60) s.log.splice(0, s.log.length - 60);

  return { blocks, coins, logs };
}

// ── actions ────────────────────────────────────────────────────
export interface ClickResult {
  power: number;
  crit: boolean;
  reward: number;
}

export function clickMine(s: GameState): ClickResult {
  s.clicks++;
  const power = clickPower(s);
  let crit = false;
  let reward = 0;

  if (Math.random() < critChance(s)) {
    crit = true;
    reward = blockReward(s.difficulty) * 2;
    s.coins += reward;
    s.totalCoinsMined += reward;
    s.blocksFound++;
    s.difficulty *= DIFF_GROWTH;
    pushLog(s, 'crit', `CRITICAL HASH · lucky nonce · +${reward.toFixed(2)} HSH`);
  } else {
    s.blockProgress += power;
  }
  return { power, crit, reward };
}

export interface BuyResult {
  ok: boolean;
  msg?: string;
}

export function buyRig(s: GameState, id: string): BuyResult {
  const h = HARDWARE.find((x) => x.id === id);
  if (!h) return { ok: false };
  const owned = s.rigs[id] ?? 0;
  const cost = rigCost(h, owned);
  if (s.usd < cost) return { ok: false, msg: 'Insufficient USD' };
  s.usd -= cost;
  s.rigs[id] = owned + 1;
  pushLog(s, 'shop', `${h.name} installed · unit #${owned + 1} online`);
  return { ok: true };
}

export function buyBoost(s: GameState, id: string): BuyResult {
  const b = BOOSTS.find((x) => x.id === id);
  if (!b) return { ok: false };
  const lvl = s.boosts[id] ?? 0;
  if (lvl >= b.max) return { ok: false, msg: 'Max level' };
  const cost = boostCost(b, lvl);
  if (s.usd < cost) return { ok: false, msg: 'Insufficient USD' };
  s.usd -= cost;
  s.boosts[id] = lvl + 1;
  pushLog(s, 'shop', `${b.name} upgraded → LV.${lvl + 1}`);
  return { ok: true };
}

export interface SellResult {
  ok: boolean;
  amount: number;
  gained: number;
  price: number;
}

export function sellCoins(s: GameState, frac: number): SellResult {
  const amount = s.coins * frac;
  if (amount < 0.0001) return { ok: false, amount: 0, gained: 0, price: s.price };
  const gained = amount * s.price;
  s.coins -= amount;
  s.usd += gained;
  s.totalUsdEarned += gained;
  pushLog(s, 'cash', `Sold ${amount.toFixed(4)} HSH @ $${s.price.toFixed(3)} · +$${fmtUsdShort(gained)}`);
  return { ok: true, amount, gained, price: s.price };
}

const fmtUsdShort = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 10_000 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2);

// ── persistence ────────────────────────────────────────────────
const SAVE_KEY = 'hashforge-save-v1';

export function saveGame(s: GameState) {
  try {
    const payload = {
      v: 1,
      usd: s.usd,
      coins: s.coins,
      price: s.price,
      priceHistory: s.priceHistory.slice(-60),
      blocksFound: s.blocksFound,
      totalHashes: s.totalHashes,
      totalCoinsMined: s.totalCoinsMined,
      totalUsdEarned: s.totalUsdEarned,
      totalPowerSpent: s.totalPowerSpent,
      clicks: s.clicks,
      playTime: s.playTime,
      difficulty: s.difficulty,
      rigs: s.rigs,
      boosts: s.boosts,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.v !== 1 || typeof p.usd !== 'number') return null;
    const s = defaultState();
    Object.assign(s, {
      usd: p.usd,
      coins: p.coins ?? 0,
      price: p.price ?? PRICE_START,
      priceHistory: Array.isArray(p.priceHistory) && p.priceHistory.length ? p.priceHistory : [PRICE_START],
      blocksFound: p.blocksFound ?? 0,
      totalHashes: p.totalHashes ?? 0,
      totalCoinsMined: p.totalCoinsMined ?? 0,
      totalUsdEarned: p.totalUsdEarned ?? 0,
      totalPowerSpent: p.totalPowerSpent ?? 0,
      clicks: p.clicks ?? 0,
      playTime: p.playTime ?? 0,
      difficulty: p.difficulty ?? DIFF_START,
      rigs: p.rigs ?? { laptop: 1 },
      boosts: p.boosts ?? {},
    });
    return s;
  } catch {
    return null;
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* noop */
  }
}
