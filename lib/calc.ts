import { BENCHMARK, PORTFOLIOS, Portfolio } from "./portfolios";
import { Bar, Quote, closeOnOrBefore, getCurve, getHistories, getQuotes } from "./data";
import { getEconCalendar } from "./econ";
import { computeRisk } from "./risk";

export type Position = {
  symbol: string;
  name: string;
  shares: number;
  basePrice: number;
  price: number;
  value: number;
  weight: number;
  dayPct: number;
  dayPnl: number;
  sincePct: number;
  earnings?: string;
  filing: string;
  estimatedShares: boolean;
};

export type PortfolioResult = {
  p: Portfolio;
  positions: Position[];
  value: number;
  dayPnl: number;
  dayPct: number;
  sincePct: number;
  benchDayPct: number;
  benchSincePct: number;
  series: { date: string; port: number; bench: number }[]; // indexed to 100
  missing: string[];
};

export function computePortfolios(quotes: Record<string, Quote>, hist: Record<string, Bar[]>) {
  return PORTFOLIOS.map((p) => compute(p, quotes, hist));
}

function compute(p: Portfolio, quotes: Record<string, Quote>, hist: Record<string, Bar[]>): PortfolioResult {
  const missing: string[] = [];
  const invested = p.startValue - p.cash;
  const live = p.holdings.filter((h) => {
    const ok = quotes[h.symbol] && closeOnOrBefore(hist[h.symbol] ?? [], p.startDate) != null;
    if (!ok) missing.push(h.symbol);
    return ok;
  });
  const perName = live.length ? invested / live.length : 0;

  const raw = live.map((h) => {
    const q = quotes[h.symbol];
    const base = closeOnOrBefore(hist[h.symbol], p.startDate)!;
    const shares = h.shares ?? perName / base;
    return {
      symbol: h.symbol, name: q.name, shares, basePrice: base, price: q.price,
      value: shares * q.price, dayPnl: shares * q.change, dayPct: q.changePct,
      sincePct: (q.price / base - 1) * 100, earnings: q.earnings,
      filing: h.filing ?? "10-K", estimatedShares: h.shares == null,
    };
  });
  const startValue = p.cash + raw.reduce((s, r) => s + r.shares * r.basePrice, 0);
  const value = p.cash + raw.reduce((s, r) => s + r.value, 0);
  const dayPnl = raw.reduce((s, r) => s + r.dayPnl, 0);
  const positions: Position[] = raw
    .map((r) => ({ ...r, weight: value ? (r.value / value) * 100 : 0 }))
    .sort((a, b) => b.dayPct - a.dayPct);

  const bq = quotes[BENCHMARK];
  const bBars = hist[BENCHMARK] ?? [];
  const bBase = closeOnOrBefore(bBars, p.startDate);

  // Daily index series since inception (portfolio vs benchmark, both = 100 at start)
  const dates = bBars.map((b) => b.date).filter((d) => d >= p.startDate);
  const series = dates.map((d) => {
    const v = p.cash + raw.reduce((s, r) => s + r.shares * (closeOnOrBefore(hist[r.symbol], d) ?? r.basePrice), 0);
    const b = closeOnOrBefore(bBars, d) ?? bBase ?? 1;
    return { date: d, port: (v / startValue) * 100, bench: bBase ? (b / bBase) * 100 : 100 };
  });
  const today = new Date().toISOString().slice(0, 10);
  if (series.length && series[series.length - 1].date < today && bq && bBase) {
    series.push({ date: today, port: (value / startValue) * 100, bench: (bq.price / bBase) * 100 });
  }

  return {
    p, positions, value, dayPnl,
    dayPct: value - dayPnl ? (dayPnl / (value - dayPnl)) * 100 : 0,
    sincePct: startValue ? (value / startValue - 1) * 100 : 0,
    benchDayPct: bq?.changePct ?? 0,
    benchSincePct: bq && bBase ? (bq.price / bBase - 1) * 100 : 0,
    series, missing,
  };
}

export const MARKET = {
  us: [["^GSPC", "S&P 500"], ["^DJI", "Dow Jones Industrials"], ["^IXIC", "Nasdaq Composite"], ["^NDX", "Nasdaq 100"], ["^RUT", "Russell 2000"], ["^VIX", "VIX"]],
  intl: [["^FTSE", "FTSE 100 (UK)"], ["^GDAXI", "DAX (Germany)"], ["^STOXX50E", "Euro Stoxx 50"], ["^N225", "Nikkei 225 (Japan)"], ["^HSI", "Hang Seng (Hong Kong)"]],
  sectors: [["XLK", "Technology"], ["XLC", "Communication"], ["XLY", "Consumer Discretionary"], ["XLP", "Consumer Staples"], ["XLV", "Health Care"], ["XLF", "Financials"], ["XLI", "Industrials"], ["XLE", "Energy"], ["XLB", "Materials"], ["XLU", "Utilities"], ["XLRE", "Real Estate"]],
  macro: [["TLT", "Long Treasuries (TLT)"], ["UUP", "US Dollar (UUP)"], ["GLD", "Gold (GLD)"], ["USO", "Crude Oil (USO)"]],
  crypto: [["BTC-USD", "Bitcoin"], ["ETH-USD", "Ethereum"], ["SOL-USD", "Solana"]],
} as const;

// ── Macro trends: the big forces that move everything ──
export const MACRO_TRENDS: { s: string; n: string; kind: "yield" | "pct" | "pts"; why: string }[] = [
  { s: "^TNX", n: "10-Year Treasury yield", kind: "yield", why: "Sets the discount rate for every stock and the cost of mortgages and corporate debt." },
  { s: "^IRX", n: "3-Month T-bill yield", kind: "yield", why: "Tracks where the market thinks the Fed's policy rate is heading." },
  { s: "DX-Y.NYB", n: "U.S. Dollar Index", kind: "pct", why: "A stronger dollar squeezes multinationals' overseas profits and commodity prices." },
  { s: "CL=F", n: "WTI crude oil", kind: "pct", why: "Feeds into inflation, consumer spending, and energy-sector earnings." },
  { s: "HG=F", n: "Copper", kind: "pct", why: "\"Dr. Copper\": demand for wiring and construction is a read on global growth." },
  { s: "GC=F", n: "Gold", kind: "pct", why: "A hedge against inflation, currency weakness, and geopolitical stress." },
  { s: "^VIX", n: "VIX (expected volatility)", kind: "pts", why: "The price of insurance on the S&P 500: high means fear, low means calm." },
  { s: "BTC-USD", n: "Bitcoin", kind: "pct", why: "A barometer of speculative risk appetite." },
];

export const STYLE_PAIRS: { a: string; b: string; n: string; aName: string; bName: string; why: string }[] = [
  { a: "IWF", b: "IWD", n: "Growth vs. value", aName: "Growth", bName: "Value", why: "Growth wins when rates fall and investors pay up for future earnings." },
  { a: "IWM", b: "SPY", n: "Small vs. large caps", aName: "Small caps", bName: "Large caps", why: "Small companies borrow more and sell domestically, so they lead in easy-money, strong-economy stretches." },
  { a: "XLY", b: "XLP", n: "Cyclicals vs. defensives", aName: "Discretionary", bName: "Staples", why: "Investors buy wants over needs when they feel good about the economy." },
  { a: "RSP", b: "SPY", n: "Breadth: equal-weight vs. cap-weight", aName: "Typical stock", bName: "Mega-caps", why: "If the equal-weight index lags, a handful of giants are carrying the market." },
];

export const TREND_SYMBOLS = [
  ...MACRO_TRENDS.map((m) => m.s),
  ...STYLE_PAIRS.flatMap((p) => [p.a, p.b]),
  ...MARKET.sectors.map(([s]) => s as string),
];

export type Trend = { s: string; n: string; kind: string; why: string; level?: number; d1?: number; w1?: number; m1?: number };

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
function chg(kind: string, now: number, then?: number) {
  if (then == null || !isFinite(then) || !then) return undefined;
  if (kind === "yield") return (now - then) * 100; // basis points
  if (kind === "pts") return now - then;
  return (now / then - 1) * 100;
}
export function retOver(bars: Bar[] | undefined, price: number | undefined, days: number) {
  if (!bars?.length || price == null) return undefined;
  return chg("pct", price, closeOnOrBefore(bars, daysAgo(days)));
}

export function computeTrends(quotes: Record<string, Quote>, hist: Record<string, Bar[]>) {
  const macro: Trend[] = MACRO_TRENDS.map((m) => {
    const q = quotes[m.s];
    const bars = hist[m.s];
    if (!q) return { ...m };
    return {
      ...m, level: q.price,
      d1: chg(m.kind, q.price, q.prevClose),
      w1: bars?.length ? chg(m.kind, q.price, closeOnOrBefore(bars, daysAgo(7))) : undefined,
      m1: bars?.length ? chg(m.kind, q.price, closeOnOrBefore(bars, daysAgo(30))) : undefined,
    };
  });
  const rel = (a?: number, b?: number) => (a == null || b == null ? undefined : ((1 + a / 100) / (1 + b / 100) - 1) * 100);
  const styles = STYLE_PAIRS.map((p) => {
    const qa = quotes[p.a], qb = quotes[p.b];
    return {
      ...p,
      d1: rel(qa?.changePct, qb?.changePct),
      w1: rel(retOver(hist[p.a], qa?.price, 7), retOver(hist[p.b], qb?.price, 7)),
      m1: rel(retOver(hist[p.a], qa?.price, 30), retOver(hist[p.b], qb?.price, 30)),
    };
  });
  const sectors1m = MARKET.sectors
    .map(([s, n]) => ({ s, n, m1: retOver(hist[s], quotes[s]?.price, 30) }))
    .filter((x) => x.m1 != null)
    .sort((a, b) => b.m1! - a.m1!) as { s: string; n: string; m1: number }[];
  return { macro, styles, sectors1m };
}

// ── Micro trends: what individual companies in our portfolios are doing ──
export function computeMicro(quotes: Record<string, Quote>, hist: Record<string, Bar[]>) {
  const syms = [...new Set(PORTFOLIOS.flatMap((p) => p.holdings.map((h) => h.symbol)))].filter((s) => quotes[s]);
  const rows = syms.map((s) => {
    const q = quotes[s];
    return {
      s, name: q.name, price: q.price, d1: q.changePct,
      w1: retOver(hist[s], q.price, 7),
      offHigh: q.high52 ? (q.price / q.high52 - 1) * 100 : undefined,
      offLow: q.low52 ? (q.price / q.low52 - 1) * 100 : undefined,
      volX: q.volume && q.avgVolume ? q.volume / q.avgVolume : undefined,
      above50: q.avg50 ? q.price > q.avg50 : undefined,
    };
  });
  const byWeek = rows.filter((r) => r.w1 != null).sort((a, b) => b.w1! - a.w1!);
  const spy = quotes[BENCHMARK]?.changePct ?? 0;
  const sameDir = rows.filter((r) => Math.sign(r.d1) === Math.sign(spy)).length;
  return {
    count: rows.length,
    advancers: rows.filter((r) => r.d1 > 0).length,
    above50: rows.filter((r) => r.above50).length,
    sameDirPct: rows.length ? (sameDir / rows.length) * 100 : 0,
    leaders: byWeek.slice(0, 5),
    laggards: byWeek.slice(-5).reverse(),
    nearHigh: rows.filter((r) => r.offHigh != null && r.offHigh > -3).sort((a, b) => b.offHigh! - a.offHigh!).slice(0, 6),
    nearLow: rows.filter((r) => r.offLow != null && r.offLow < 8).sort((a, b) => a.offLow! - b.offLow!).slice(0, 6),
    volume: rows.filter((r) => r.volX != null && r.volX >= 1.5).sort((a, b) => b.volX! - a.volX!).slice(0, 6),
  };
}
export type Micro = ReturnType<typeof computeMicro>;
export type Trends = ReturnType<typeof computeTrends>;

// ── One call that loads everything the front page needs ──
export async function loadAll() {
  const holdings = PORTFOLIOS.flatMap((p) => p.holdings.map((h) => h.symbol));
  const marketSyms = Object.values(MARKET).flat().map(([s]) => s as string);
  const quoteSyms = [...new Set([...marketSyms, ...holdings, BENCHMARK, ...TREND_SYMBOLS])];
  const histSyms = [...new Set([...holdings, BENCHMARK, ...TREND_SYMBOLS])];
  const from = [...PORTFOLIOS.map((p) => p.startDate), daysAgo(190)].sort()[0]; // ~6 months for risk stats
  const [quotes, hist, curve, econ] = await Promise.all([getQuotes(quoteSyms), getHistories(histSyms, from), getCurve(), getEconCalendar()]);
  const results = computePortfolios(quotes, hist);
  return {
    quotes, curve, econ, results,
    risk: computeRisk(results, hist, BENCHMARK, quotes["^IRX"]?.price ?? 4),
    trends: computeTrends(quotes, hist),
    micro: computeMicro(quotes, hist),
  };
}
