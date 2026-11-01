// Quant Lab: the math behind the portfolios, computed from ~6 months of daily closes.
// All statistics use each portfolio's CURRENT weights applied to history. Educational, not forecasts.
import type { Bar } from "./data";
import type { PortfolioResult } from "./calc";

const T = 126; // trading days of history
const TD = 252; // trading days per year

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const variance = (a: number[]) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1); };
const covar = (a: number[], b: number[]) => { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / Math.max(1, a.length - 1); };
const pctile = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };

function returnsOn(dates: string[], bars?: Bar[]) {
  const m = new Map((bars ?? []).map((b) => [b.date, b.close]));
  const out: number[] = [];
  let prev: number | undefined;
  for (let i = 0; i < dates.length; i++) {
    const c = m.get(dates[i]) ?? prev;
    out.push(i > 0 && c != null && prev != null ? c / prev - 1 : 0);
    if (c != null) prev = c;
  }
  return out.slice(1);
}

export type QuantPortfolio = {
  id: string; name: string; value: number;
  // Show the math
  meanD: number; sdD: number; volA: number; retA: number; cov: number; varM: number; beta: number; corr: number; rf: number; sharpe: number;
  // Regression
  alphaD: number; alphaA: number; jensen: number; capm: number; r2: number; points: [number, number][];
  // VaR
  varHist: number; varParam: number; cvar: number; varHistPct: number; varParamPct: number; worstDay: number;
  // Monte Carlo
  mc: { days: number; bands: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] }; probUp: number; probBeat: number; medianEnd: number; p5End: number; p95End: number };
};

export type Quant = {
  days: number; start: string; end: string; rfPct: number;
  spy: { meanD: number; sdD: number; volA: number; retA: number };
  portfolios: QuantPortfolio[];
  frontier: { cloud: [number, number][]; marks: { label: string; vol: number; ret: number; kind: "port" | "spy" | "best" | "minvol" }[]; nAssets: number; best: { vol: number; ret: number; sharpe: number; top: [string, number][] } };
};

export function computeQuant(results: PortfolioResult[], hist: Record<string, Bar[]>, benchmark: string, rfPct = 4): Quant | null {
  const bBars = hist[benchmark] ?? [];
  if (bBars.length < 60) return null;
  const dates = bBars.map((b) => b.date).slice(-(T + 1));
  const m = returnsOn(dates, bBars);
  const rf = rfPct / 100;
  const seed = dates[dates.length - 1];
  const r = rng(seed);

  const spy = { meanD: mean(m), sdD: Math.sqrt(variance(m)), volA: Math.sqrt(variance(m) * TD), retA: mean(m) * TD };
  const assetRet: Record<string, number[]> = {};
  const getR = (s: string) => (assetRet[s] ??= returnsOn(dates, hist[s]));

  const portfolios: QuantPortfolio[] = results.map((res) => {
    const total = res.value || 1;
    const w = res.positions.map((p) => ({ s: p.symbol, w: p.value / total }));
    const rp = m.map((_, i) => w.reduce((a, x) => a + x.w * (getR(x.s)[i] ?? 0), 0));
    const meanD = mean(rp), varP = variance(rp), sdD = Math.sqrt(varP);
    const cov = covar(rp, m), varM = variance(m);
    const beta = cov / (varM || 1);
    const corr = cov / ((sdD * Math.sqrt(varM)) || 1);
    const volA = sdD * Math.sqrt(TD), retA = meanD * TD;
    const sharpe = volA ? (retA - rf) / volA : 0;
    const alphaD = meanD - beta * mean(m);
    // VaR (95%, one day)
    const q5 = pctile(rp, 0.05);
    const tail = rp.filter((x) => x <= q5);
    const varHistPct = -q5, varParamPct = 1.645 * sdD - meanD;
    // Monte Carlo: 63 trading days, 1,000 paths, portfolio shocks correlated with the S&P 500
    const days = 63, N = 1000;
    const paths: number[][] = Array.from({ length: days + 1 }, () => []);
    let up = 0, beat = 0;
    const muP = meanD - 0.5 * varP, muM = mean(m) - 0.5 * varM, sM = Math.sqrt(varM), rho = Math.max(-0.99, Math.min(0.99, corr));
    for (let k = 0; k < N; k++) {
      let v = 1, vm = 1;
      paths[0].push(1);
      for (let d = 1; d <= days; d++) {
        const zm = gauss(r), ze = gauss(r);
        const zp = rho * zm + Math.sqrt(1 - rho * rho) * ze;
        v *= Math.exp(muP + sdD * zp);
        vm *= Math.exp(muM + sM * zm);
        paths[d].push(v);
      }
      if (v > 1) up++;
      if (v > vm) beat++;
    }
    const band = (p: number) => paths.map((col) => +(pctile(col, p) * total).toFixed(0));
    return {
      id: res.p.id, name: res.p.name, value: total,
      meanD, sdD, volA, retA, cov, varM, beta, corr, rf, sharpe,
      alphaD, alphaA: alphaD * TD, capm: rf + beta * (spy.retA - rf), jensen: retA - (rf + beta * (spy.retA - rf)), r2: corr * corr,
      points: m.map((x, i) => [+(x * 100).toFixed(3), +(rp[i] * 100).toFixed(3)] as [number, number]),
      varHist: varHistPct * total, varParam: varParamPct * total, cvar: -mean(tail) * total, varHistPct, varParamPct, worstDay: Math.min(...rp),
      mc: {
        days, bands: { p5: band(0.05), p25: band(0.25), p50: band(0.5), p75: band(0.75), p95: band(0.95) },
        probUp: up / N, probBeat: beat / N,
        medianEnd: pctile(paths[days], 0.5) * total, p5End: pctile(paths[days], 0.05) * total, p95End: pctile(paths[days], 0.95) * total,
      },
    };
  });

  // Efficient frontier: random long-only mixes of every holding we own
  const assets = [...new Set(results.flatMap((x) => x.positions.map((p) => p.symbol)))].filter((s) => (hist[s]?.length ?? 0) > 60);
  const n = assets.length;
  const R = assets.map(getR);
  const mu = R.map(mean);
  const C: number[][] = R.map((a) => R.map((b) => covar(a, b)));
  const stat = (wv: number[]) => {
    let ret = 0, v = 0;
    for (let i = 0; i < n; i++) { if (!wv[i]) continue; ret += wv[i] * mu[i]; for (let j = 0; j < n; j++) if (wv[j]) v += wv[i] * wv[j] * C[i][j]; }
    return { ret: ret * TD, vol: Math.sqrt(Math.max(v, 0) * TD) };
  };
  const cloud: [number, number][] = [];
  let best = { vol: 0, ret: 0, sharpe: -Infinity, w: [] as number[] }, minv = { vol: Infinity, ret: 0 };
  for (let k = 0; k < 2500; k++) {
    const size = 3 + Math.floor(r() * Math.min(15, n - 2));
    const wv = new Array(n).fill(0);
    const conc = 0.5 + r() * 3;
    for (let j = 0; j < size; j++) wv[Math.floor(r() * n)] += Math.pow(-Math.log(r() || 1e-9), conc);
    const sum = wv.reduce((a, b) => a + b, 0) || 1;
    for (let j = 0; j < n; j++) wv[j] /= sum;
    const s = stat(wv);
    cloud.push([+(s.vol * 100).toFixed(2), +(s.ret * 100).toFixed(2)]);
    const sh = s.vol ? (s.ret - rf) / s.vol : -Infinity;
    if (sh > best.sharpe) best = { ...s, sharpe: sh, w: wv };
    if (s.vol < minv.vol) minv = s;
  }
  const marks: Quant["frontier"]["marks"] = portfolios.map((p) => ({ label: p.name.replace(" Portfolio", ""), vol: +(p.volA * 100).toFixed(2), ret: +(p.retA * 100).toFixed(2), kind: "port" as const }));
  marks.push({ label: "S&P 500", vol: +(spy.volA * 100).toFixed(2), ret: +(spy.retA * 100).toFixed(2), kind: "spy" });
  marks.push({ label: "Best Sharpe mix", vol: +(best.vol * 100).toFixed(2), ret: +(best.ret * 100).toFixed(2), kind: "best" });
  marks.push({ label: "Lowest risk mix", vol: +(minv.vol * 100).toFixed(2), ret: +(minv.ret * 100).toFixed(2), kind: "minvol" });
  const top = assets.map((s, i) => [s, best.w[i] ?? 0] as [string, number]).filter(([, w]) => w > 0.04).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    days: m.length, start: dates[0], end: dates[dates.length - 1], rfPct,
    spy, portfolios,
    frontier: { cloud, marks, nAssets: n, best: { vol: best.vol, ret: best.ret, sharpe: best.sharpe, top } },
  };
}
