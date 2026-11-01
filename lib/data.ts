import YahooFinance from "yahoo-finance2";
import { unstable_cache } from "next/cache";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"], queue: { concurrency: 6 } } as any);

export const DEMO = process.env.DEMO === "1";

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  earnings?: string; // ISO date of next earnings
  marketTime?: string;
  high52?: number;
  low52?: number;
  volume?: number;
  avgVolume?: number;
  avg50?: number;
};

export type Bar = { date: string; close: number };

// ── Demo data (used only when DEMO=1, for previews without network) ──
function seed(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}
const DEMO_LEVEL: Record<string, number> = {
  "^GSPC": 6720, "^DJI": 46900, "^IXIC": 22850, "^NDX": 25100, "^RUT": 2440, "^VIX": 19.4,
  "^FTSE": 9420, "^GDAXI": 24100, "^N225": 47800, "^HSI": 25600, "^STOXX50E": 5520,
  "BTC-USD": 108000, "ETH-USD": 3900, "SOL-USD": 186,
  "^TNX": 4.4, "^IRX": 3.9, "DX-Y.NYB": 99, "CL=F": 66, "HG=F": 4.9, "GC=F": 3900, SPY: 670,
};
function demoHistory(symbol: string, from: string): Bar[] {
  const r = seed(symbol + "h");
  let p = DEMO_LEVEL[symbol] ?? 20 + r() * 400;
  const out: Bar[] = [];
  const d = new Date("2026-07-01T12:00:00Z"); // fixed start so every caller sees the same series
  const end = new Date();
  while (d <= end) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) {
      p *= 1 + (r() - 0.48) * 0.035;
      out.push({ date: d.toISOString().slice(0, 10), close: +p.toFixed(2) });
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const cut = new Date(from + "T12:00:00Z");
  cut.setUTCDate(cut.getUTCDate() - 7);
  return out.filter((b) => b.date >= cut.toISOString().slice(0, 10));
}
function demoQuote(symbol: string): Quote {
  const h = demoHistory(symbol, "2026-07-08");
  const price = h[h.length - 1].close;
  const prevClose = h[h.length - 2].close;
  const r = seed(symbol + "e");
  const e = new Date();
  e.setUTCDate(e.getUTCDate() + Math.floor(r() * 80) - 10);
  return {
    symbol, name: symbol, price, prevClose,
    change: price - prevClose, changePct: ((price - prevClose) / prevClose) * 100,
    earnings: e.toISOString().slice(0, 10),
    high52: Math.max(...h.map((b) => b.close)) * (1 + r() * 0.04),
    low52: Math.min(...h.map((b) => b.close)) * (1 - r() * 0.1),
    volume: 1e6 * (1 + r() * 3),
    avgVolume: 1e6 * 1.4,
    avg50: h.slice(-50).reduce((a, b) => a + b.close, 0) / Math.min(50, h.length),
  };
}

// ── Live data ──
export async function getQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const uniq = [...new Set(symbols)];
  if (DEMO) return Object.fromEntries(uniq.map((s) => [s, demoQuote(s)]));
  const out: Record<string, Quote> = {};
  try {
    const res: any[] = await (yf as any).quote(uniq, {}, { validateResult: false });
    for (const q of [res].flat()) {
      if (!q || q.regularMarketPrice == null) continue;
      const prev = q.regularMarketPreviousClose ?? q.regularMarketPrice - (q.regularMarketChange ?? 0);
      out[q.symbol] = {
        symbol: q.symbol,
        name: q.shortName ?? q.longName ?? q.symbol,
        price: q.regularMarketPrice,
        prevClose: prev,
        change: q.regularMarketChange ?? q.regularMarketPrice - prev,
        changePct: q.regularMarketChangePercent ?? ((q.regularMarketPrice - prev) / prev) * 100,
        earnings: toISO(q.earningsTimestampStart ?? q.earningsTimestamp),
        marketTime: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : undefined,
        high52: q.fiftyTwoWeekHigh,
        low52: q.fiftyTwoWeekLow,
        volume: q.regularMarketVolume,
        avgVolume: q.averageDailyVolume3Month,
        avg50: q.fiftyDayAverage,
      };
    }
  } catch (err) {
    console.error("Yahoo quote failed", err);
  }
  return out;
}

function toISO(d: any): string | undefined {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(typeof d === "number" ? d * 1000 : d);
  return isNaN(+dt) ? undefined : dt.toISOString().slice(0, 10);
}

// Daily history changes once a day, so cache it for 30 minutes instead of refetching every minute.
const cachedChart = unstable_cache(
  async (symbol: string, from: string): Promise<Bar[]> => {
    const start = new Date(from + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() - 7); // make sure the inception close is included
    const res: any = await (yf as any).chart(symbol, { period1: start, interval: "1d" }, { validateResult: false });
    const bars = (res.quotes ?? [])
      .filter((q: any) => q.close != null)
      .map((q: any) => ({ date: new Date(q.date).toISOString().slice(0, 10), close: q.close }));
    if (!bars.length) throw new Error("empty history"); // never cache a failure
    return bars;
  },
  ["yahoo-chart-v1"],
  { revalidate: 1800 }
);

export async function getHistory(symbol: string, from: string): Promise<Bar[]> {
  if (DEMO) return demoHistory(symbol, from);
  try {
    return await cachedChart(symbol, from);
  } catch (err) {
    console.error("Yahoo chart failed", symbol, err);
    return [];
  }
}

export async function getHistories(symbols: string[], from: string) {
  const uniq = [...new Set(symbols)];
  const res = await Promise.all(uniq.map((s) => getHistory(s, from)));
  return Object.fromEntries(uniq.map((s, i) => [s, res[i]])) as Record<string, Bar[]>;
}

// ── Treasury par yield curve (US Treasury, with Yahoo fallback) ──
export type Curve = { date: string; points: { label: string; years: number; y: number }[]; source: string };

const TENORS: [string, string, number][] = [
  ["BC_1MONTH", "1M", 1 / 12], ["BC_3MONTH", "3M", 0.25], ["BC_6MONTH", "6M", 0.5],
  ["BC_1YEAR", "1Y", 1], ["BC_2YEAR", "2Y", 2], ["BC_3YEAR", "3Y", 3], ["BC_5YEAR", "5Y", 5],
  ["BC_7YEAR", "7Y", 7], ["BC_10YEAR", "10Y", 10], ["BC_20YEAR", "20Y", 20], ["BC_30YEAR", "30Y", 30],
];

export async function getCurve(): Promise<Curve | null> {
  if (DEMO) {
    const ys = [4.02, 3.98, 3.9, 3.78, 3.62, 3.6, 3.68, 3.82, 4.0, 4.52, 4.6];
    return { date: new Date().toISOString().slice(0, 10), source: "Demo", points: TENORS.map(([, l, yr], i) => ({ label: l, years: yr, y: ys[i] })) };
  }
  const now = new Date();
  for (let back = 0; back < 2; back++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    try {
      const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${ym}`;
      const xml = await (await fetch(url, { next: { revalidate: 3600 } })).text();
      const entries = xml.split("<m:properties>").slice(1);
      if (!entries.length) continue;
      const last = entries[entries.length - 1];
      const get = (tag: string) => {
        const m = last.match(new RegExp(`<d:${tag}[^>]*>([^<]+)</d:${tag}>`));
        return m ? parseFloat(m[1]) : NaN;
      };
      const date = (last.match(/<d:NEW_DATE[^>]*>([^<]+)</) ?? [])[1]?.slice(0, 10) ?? "";
      const points = TENORS.map(([k, l, yr]) => ({ label: l, years: yr, y: get(k) })).filter((p) => !isNaN(p.y));
      if (points.length > 4) return { date, points, source: "U.S. Treasury" };
    } catch (err) {
      console.error("Treasury fetch failed", err);
    }
  }
  // Fallback: Yahoo yield indices (13W, 5Y, 10Y, 30Y)
  const q = await getQuotes(["^IRX", "^FVX", "^TNX", "^TYX"]);
  const pts = [["^IRX", "3M", 0.25], ["^FVX", "5Y", 5], ["^TNX", "10Y", 10], ["^TYX", "30Y", 30]] as const;
  const points = pts.filter(([s]) => q[s]).map(([s, l, yr]) => ({ label: l, years: yr, y: q[s].price }));
  return points.length ? { date: new Date().toISOString().slice(0, 10), points, source: "Yahoo Finance (yield indices)" } : null;
}

// ── Helpers ──
export function closeOnOrBefore(bars: Bar[], date: string): number | undefined {
  let v: number | undefined;
  for (const b of bars) if (b.date <= date) v = b.close; else break;
  return v ?? bars[0]?.close;
}

// ── Headlines for a ticker (Yahoo Finance search), cached 30 minutes ──
export type Headline = { title: string; publisher: string; link: string; date?: string };
const cachedNews = unstable_cache(
  async (symbol: string): Promise<Headline[]> => {
    const res: any = await (yf as any).search(symbol, { newsCount: 4, quotesCount: 0 }, { validateResult: false });
    const items: Headline[] = (res?.news ?? []).map((n: any) => ({
      title: n.title, publisher: n.publisher, link: n.link,
      date: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString().slice(0, 10) : undefined,
    })).filter((n: Headline) => n.title && n.link);
    if (!items.length) throw new Error("no news"); // don't cache empty results
    return items;
  },
  ["yahoo-news-v1"],
  { revalidate: 1800 }
);
export async function getNews(symbol: string): Promise<Headline[]> {
  if (DEMO) return [
    { title: `${symbol} shares in focus as investors weigh guidance`, publisher: "Sample Wire", link: "https://finance.yahoo.com/quote/" + symbol, date: new Date().toISOString().slice(0, 10) },
    { title: `Analysts revisit ${symbol} price targets`, publisher: "Sample Daily", link: "https://finance.yahoo.com/quote/" + symbol },
  ];
  try { return await cachedNews(symbol); } catch { return []; }
}
