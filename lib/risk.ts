import type { Bar } from "./data";
import type { PortfolioResult } from "./calc";

// Risk is measured over the last ~6 months of daily closes, applying each
// portfolio's CURRENT weights to that history (the standard "as if held" view).
const LOOKBACK = 126; // trading days, about 6 months

export type RiskStats = {
  name: string;
  vol?: number;      // annualized volatility, %
  beta?: number;     // vs. SPY
  maxDD?: number;    // maximum drawdown, %
  sharpe?: number;   // (annualized return - risk-free) / vol
  ret?: number;      // total return over the window, %
  avgCorr?: number;  // average pairwise correlation among holdings
  days: number;
};

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const std = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const cov = (a: number[], b: number[]) => { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / Math.max(1, a.length - 1); };
const corr = (a: number[], b: number[]) => { const d = std(a) * std(b); return d ? cov(a, b) / d : 0; };

function returnsOn(dates: string[], bars: Bar[] | undefined): (number | null)[] {
  const m = new Map((bars ?? []).map((b) => [b.date, b.close]));
  const out: (number | null)[] = [];
  let prev: number | undefined;
  for (const d of dates) {
    const c = m.get(d);
    out.push(c != null && prev != null ? c / prev - 1 : null);
    if (c != null) prev = c;
  }
  return out;
}

function stats(name: string, r: number[], bench: number[], rf: number): RiskStats {
  if (r.length < 20) return { name, days: r.length };
  let peak = 1, v = 1, dd = 0;
  for (const x of r) { v *= 1 + x; peak = Math.max(peak, v); dd = Math.min(dd, v / peak - 1); }
  const vol = std(r) * Math.sqrt(252);
  const annRet = mean(r) * 252;
  return {
    name, days: r.length,
    vol: vol * 100,
    beta: cov(r, bench) / (std(bench) ** 2 || 1),
    maxDD: dd * 100,
    sharpe: vol ? (annRet - rf) / vol : undefined,
    ret: (v - 1) * 100,
  };
}

export function computeRisk(results: PortfolioResult[], hist: Record<string, Bar[]>, benchmark: string, rfPct = 4) {
  const bBars = hist[benchmark] ?? [];
  const dates = bBars.map((b) => b.date).slice(-(LOOKBACK + 1));
  const rf = rfPct / 100;
  const benchR = returnsOn(dates, bBars).slice(1).map((x) => x ?? 0);

  const portfolios = results.map((res) => {
    const total = res.value || 1;
    const rets: Record<string, number[]> = {};
    for (const p of res.positions) rets[p.symbol] = returnsOn(dates, hist[p.symbol]).slice(1).map((x) => x ?? 0);
    const pr = benchR.map((_, i) => res.positions.reduce((s, p) => s + (p.value / total) * (rets[p.symbol]?.[i] ?? 0), 0));
    const s = stats(res.p.name, pr, benchR, rf);
    // correlation matrix, holdings ordered by weight
    const syms = [...res.positions].sort((a, b) => b.weight - a.weight).map((p) => p.symbol);
    const matrix = syms.map((a) => syms.map((b) => (a === b ? 1 : corr(rets[a], rets[b]))));
    let sum = 0, n = 0;
    for (let i = 0; i < syms.length; i++) for (let j = i + 1; j < syms.length; j++) { sum += matrix[i][j]; n++; }
    s.avgCorr = n ? sum / n : undefined;
    // single-name risk: highest beta and most volatile holdings
    const names = res.positions.map((p) => ({ s: p.symbol, beta: cov(rets[p.symbol], benchR) / (std(benchR) ** 2 || 1), vol: std(rets[p.symbol]) * Math.sqrt(252) * 100 }));
    const topBeta = [...names].sort((a, b) => b.beta - a.beta)[0];
    const topVol = [...names].sort((a, b) => b.vol - a.vol)[0];
    return { id: res.p.id, stats: s, syms, matrix, topBeta, topVol };
  });
  const bench = stats(`${benchmark} (S&P 500)`, benchR, benchR, rf);
  return { portfolios, bench, days: benchR.length, start: dates[0], end: dates[dates.length - 1] };
}
export type Risk = ReturnType<typeof computeRisk>;

// ── Squarified treemap layout (Bruls, Huizing & van Wijk) ──
export type Rect = { x: number; y: number; w: number; h: number };
export function squarify<T extends { value: number }>(items: T[], box: Rect): (T & Rect)[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return [];
  const scale = (box.w * box.h) / total;
  const queue = [...items].sort((a, b) => b.value - a.value).map((i) => ({ item: i, area: i.value * scale }));
  const out: (T & Rect)[] = [];
  let { x, y, w, h } = box;
  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0), mx = Math.max(...row), mn = Math.min(...row);
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (queue.length) {
    const side = Math.min(w, h);
    const row = [queue.shift()!];
    while (queue.length && worst([...row.map((r) => r.area), queue[0].area], side) <= worst(row.map((r) => r.area), side)) row.push(queue.shift()!);
    const sum = row.reduce((a, r) => a + r.area, 0);
    if (w >= h) { // lay the row out as a column on the left
      const cw = sum / h; let cy = y;
      for (const r of row) { const rh = r.area / cw; out.push({ ...r.item, x, y: cy, w: cw, h: rh }); cy += rh; }
      x += cw; w -= cw;
    } else { // lay the row out across the top
      const rh = sum / w; let cx = x;
      for (const r of row) { const rw = r.area / rh; out.push({ ...r.item, x: cx, y, w: rw, h: rh }); cx += rw; }
      y += rh; h -= rh;
    }
  }
  return out;
}
