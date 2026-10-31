import { BENCHMARK, PORTFOLIOS, Portfolio } from "./portfolios";
import { Bar, Quote, closeOnOrBefore, getHistories, getQuotes } from "./data";

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

export async function loadPortfolios() {
  const symbols = [...new Set(PORTFOLIOS.flatMap((p) => p.holdings.map((h) => h.symbol)).concat(BENCHMARK))];
  const from = PORTFOLIOS.map((p) => p.startDate).sort()[0];
  const [quotes, hist] = await Promise.all([getQuotes(symbols), getHistories(symbols, from)]);
  const results = PORTFOLIOS.map((p) => compute(p, quotes, hist));
  return { results, quotes, hist };
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

export async function loadMarket() {
  const all = Object.values(MARKET).flat().map(([s]) => s as string);
  return getQuotes(all);
}
