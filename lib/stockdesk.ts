// Desk notes: why each holding moved, and a transparent, rules-based position lean.
// Educational signal read only, not investment advice.
import type { Bar, Quote, Headline } from "./data";
import { PORTFOLIOS, BENCHMARK } from "./portfolios";
import { MARKET, retOver } from "./calc";

// Each holding's closest S&P 500 sector ETF
const SECTOR: Record<string, string> = {
  LLY: "XLV", INCY: "XLV", DXCM: "XLV", VEEV: "XLV", LIVN: "XLV", GILD: "XLV", NBIX: "XLV", JNJ: "XLV", PFE: "XLV",
  JLL: "XLRE", VICI: "XLRE",
  TILE: "XLI", CTAS: "XLI", ODFL: "XLI",
  TNK: "XLE", INSW: "XLE", CVX: "XLE", KMI: "XLE",
  SN: "XLY", AMZN: "XLY", GRMN: "XLY", CROX: "XLY", LVS: "XLY", NCLH: "XLY",
  ROKU: "XLC", TTWO: "XLC",
  RELY: "XLF", SOFI: "XLF",
  APH: "XLK", NVDA: "XLK", MU: "XLK", P: "XLK", ANET: "XLK", AAPL: "XLK", AVGO: "XLK", PLTR: "XLK", ORCL: "XLK",
  WMT: "XLP", ELF: "XLP", PEP: "XLP", MO: "XLP", TSN: "XLP",
  CEG: "XLU", ATO: "XLU",
  LIN: "XLB",
};

export type Signal = { label: string; dir: 1 | -1 | 0; text: string };
export type DeskNote = {
  s: string; name: string; price: number; dayPct: number; w1?: number; m1?: number;
  owners: string[]; sector: { etf: string; name: string; dayPct?: number };
  why: string[]; lean: "Leans long" | "Leans short" | "Neutral"; leanWhy: string; signals: Signal[];
  earnings?: string; headlines: Headline[];
};

const p = (v?: number, d = 1) => (v == null || !isFinite(v) ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);
const daysBetween = (a: string, b: string) => Math.round((+new Date(a + "T12:00:00Z") - +new Date(b + "T12:00:00Z")) / 864e5);
const nice = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// Keep only headlines that name the company or its ticker (Yahoo's search also returns loosely related stories)
const STOP = new Set(["inc", "corp", "corporation", "co", "company", "the", "holdings", "group", "ltd", "plc", "global", "technologies", "international", "and"]);
function relevant(items: Headline[], sym: string, name: string): Headline[] {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  const nameKeys = words.slice(0, 2).map((w) => w.toLowerCase());
  const tick = sym.toLowerCase();
  return items.filter((h) => {
    const t = " " + h.title.toLowerCase().replace(/[^a-z0-9 ]/g, " ") + " ";
    return t.includes(" " + tick + " ") || nameKeys.some((k) => t.includes(k));
  });
}

export function buildDeskNotes(quotes: Record<string, Quote>, hist: Record<string, Bar[]>, news: Record<string, Headline[]>): Record<string, DeskNote> {
  const today = new Date().toISOString().slice(0, 10);
  const spy = quotes[BENCHMARK];
  const spy1m = retOver(hist[BENCHMARK], spy?.price, 30);
  const owners: Record<string, string[]> = {};
  for (const pf of PORTFOLIOS) for (const h of pf.holdings) (owners[h.symbol] ??= []).push(pf.name.replace(" Portfolio", "").replace("'s", ""));

  const out: Record<string, DeskNote> = {};
  for (const s of Object.keys(owners)) {
    const q = quotes[s];
    if (!q) continue;
    const etf = SECTOR[s] ?? BENCHMARK;
    const sname = MARKET.sectors.find(([k]) => k === etf)?.[1] ?? "the S&P 500";
    const sq = quotes[etf];
    const d = q.changePct, sd = sq?.changePct ?? spy?.changePct ?? 0;
    const w1 = retOver(hist[s], q.price, 7), m1 = retOver(hist[s], q.price, 30);

    // ── Why it moved ──
    const why: string[] = [];
    const gap = d - sd;
    if (Math.abs(d) < 0.4) why.push(Math.abs(gap) < 0.75
      ? `Barely moved (${p(d, 2)}), roughly in line with ${sname} (${p(sd, 2)}).`
      : `Barely moved (${p(d, 2)}) while ${sname} moved ${p(sd, 2)}, so it ${gap > 0 ? "held up better than" : "lagged"} its sector.`);
    else if (Math.abs(gap) < 1 && Math.sign(d) === Math.sign(sd)) why.push(`${d > 0 ? "Rose" : "Fell"} ${p(d, 2)} alongside ${sname} (${p(sd, 2)}), so this looks like a sector-wide move rather than company news.`);
    else why.push(`${d > 0 ? "Rose" : "Fell"} ${p(d, 2)} while ${sname} moved ${p(sd, 2)}. A ${Math.abs(gap).toFixed(1)}-point gap like that usually points to company-specific news.`);
    const volX = q.volume && q.avgVolume ? q.volume / q.avgVolume : undefined;
    if (volX && volX >= 1.5) why.push(`Volume ran ${volX.toFixed(1)}× its normal pace, a sign big investors were acting on news.`);
    if (q.earnings) {
      const dd = daysBetween(q.earnings, today);
      if (dd >= 0 && dd <= 10) why.push(`Earnings are due ${dd === 0 ? "today" : dd === 1 ? `tomorrow, ${nice(q.earnings)}` : `${nice(q.earnings)} (in ${dd} days)`}, which often makes traders position early.`);
      else if (dd < 0 && dd >= -5) why.push(`It reported earnings on ${nice(q.earnings)}, the most likely driver of recent moves.`);
    }

    // ── Position lean: transparent signals ──
    const signals: Signal[] = [];
    if (q.avg50) {
      const vs = (q.price / q.avg50 - 1) * 100;
      signals.push({ label: "Trend", dir: vs > 1 ? 1 : vs < -1 ? -1 : 0, text: `${vs >= 0 ? "Above" : "Below"} its 50-day average by ${Math.abs(vs).toFixed(1)}%` });
    }
    if (m1 != null) signals.push({ label: "Momentum", dir: m1 > 5 ? 1 : m1 < -5 ? -1 : 0, text: `${p(m1)} over the past month` });
    if (m1 != null && spy1m != null) {
      const rs = m1 - spy1m;
      signals.push({ label: "Relative strength", dir: rs > 3 ? 1 : rs < -3 ? -1 : 0, text: `${rs >= 0 ? "Beating" : "Trailing"} the S&P 500 by ${Math.abs(rs).toFixed(1)} points this month` });
    }
    if (q.high52 && q.low52 && q.high52 > q.low52) {
      const pos = ((q.price - q.low52) / (q.high52 - q.low52)) * 100;
      signals.push({ label: "52-week range", dir: pos >= 85 ? 1 : pos <= 15 ? -1 : 0, text: `At the ${pos.toFixed(0)}th percentile of its 52-week range` });
    }
    const score = signals.reduce((a, x) => a + x.dir, 0);
    const lean: DeskNote["lean"] = score >= 2 ? "Leans long" : score <= -2 ? "Leans short" : "Neutral";
    const pos = signals.filter((x) => x.dir > 0).map((x) => x.label.toLowerCase());
    const neg = signals.filter((x) => x.dir < 0).map((x) => x.label.toLowerCase());
    let leanWhy =
      lean === "Leans long" ? `The signals favor holding long: ${pos.join(", ")} ${pos.length > 1 ? "are" : "is"} positive.`
      : lean === "Leans short" ? `The signals favor caution or a short: ${neg.join(", ")} ${neg.length > 1 ? "are" : "is"} negative.`
      : `The signals are mixed${pos.length ? ` (${pos.join(", ")} positive` : ""}${neg.length ? `${pos.length ? "; " : " ("}${neg.join(", ")} negative` : ""}${pos.length || neg.length ? ")" : ""}, so there's no strong case either way.`;
    if (q.earnings && daysBetween(q.earnings, today) >= 0 && daysBetween(q.earnings, today) <= 10) leanWhy += " Earnings are close, which adds event risk to any position.";

    out[s] = {
      s, name: q.name, price: q.price, dayPct: d, w1, m1, owners: owners[s],
      sector: { etf, name: sname, dayPct: sq?.changePct },
      why, lean, leanWhy, signals, earnings: q.earnings, headlines: relevant(news[s] ?? [], s, q.name).slice(0, 3),
    };
  }
  return out;
}
