import Link from "next/link";
import { SECTIONS } from "../lib/sections";
import Slideshow from "./Slideshow";
import { squarify } from "../lib/risk";
import { GLOSSARY } from "../lib/glossary";
import { SITE } from "../lib/portfolios";
import { DEMO } from "../lib/data";

export function Term({ t, children }: { t: string; children?: React.ReactNode }) {
  const def = GLOSSARY[t];
  if (!def) return <>{children ?? t}</>;
  return (
    <span className="term" tabIndex={0}>
      {children ?? t}
      <span className="tip" role="tooltip"><b>{t}</b> {def}</span>
    </span>
  );
}

export function Chg({ v, digits = 2, suffix = "%" }: { v?: number; digits?: number; suffix?: string }) {
  if (v == null || !isFinite(v)) return <span className="muted">n/a</span>;
  v = Number(v.toFixed(digits)) || 0; // avoid "-0"
  const cls = v > 0.0001 ? "up" : v < -0.0001 ? "down" : "flat";
  return <span className={cls}>{v > 0 ? "+" : ""}{v.toFixed(digits)}{suffix}</span>;
}

export const fmt = (v?: number, d = 2) =>
  v == null || !isFinite(v) ? "n/a" : v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const usd = (v?: number, d = 0) => (v == null ? "n/a" : (v < 0 ? "-$" : "$") + fmt(Math.abs(v), d));

export function Header() {
  const now = new Date();
  const tz = { timeZone: "America/New_York" } as const;
  const date = now.toLocaleDateString("en-US", { ...tz, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const time = now.toLocaleTimeString("en-US", { ...tz, hour: "numeric", minute: "2-digit" });
  // Issue number: days since the first edition (Sept. 1)
  const issue = Math.max(1, Math.floor((+now - +new Date("2026-09-01T12:00:00Z")) / 864e5) + 1);
  return (
    <header className="masthead wrap">
      <div className="ears">
        <span>{SITE.tagline}</span>
        <span className="ears-r"><span className="ears-time">Late Edition · {time} ET</span><span className="ears-tools"><Slideshow title={SITE.title} date={date} /></span></span>
      </div>
      <Link href="/" className="nameplate">The {SITE.title}</Link>
      <div className="dateline">
        <span>Vol. I · No. {issue}</span>
        <span>{date}</span>
        <span>Edited by {SITE.byline}</span>
      </div>
      <nav className="sec-nav">
        {SECTIONS.map(([k, n, id]) => <a key={k} href={"#" + id} data-tab={k}><i>{k}</i> {n}</a>)}
      </nav>
      {DEMO && <p className="demo">Demo mode: prices below are simulated. Remove the DEMO setting to show live data.</p>}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="wrap foot">
      <p>Prices: Yahoo Finance, delayed. Yield curve: U.S. Treasury daily par yields. Filings: SEC EDGAR. Pages refresh about once a minute.</p>
      <p>For educational use. Not investment advice.</p>
    </footer>
  );
}

export function LineChart({ series, height = 220, labels }: {
  series: { date: string; port: number; bench: number }[]; height?: number; labels: [string, string];
}) {
  if (series.length < 2) return <p className="muted">Not enough history yet to draw the chart.</p>;
  const W = 720, H = height, P = { l: 44, r: 16, t: 14, b: 26 };
  const vals = series.flatMap((s) => [s.port, s.bench]);
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
  const x = (i: number) => P.l + (i / (series.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = (k: "port" | "bench") => series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join("");
  const ticks = [lo, (lo + hi) / 2, hi];
  const last = series[series.length - 1];
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${labels[0]} versus ${labels[1]}, indexed to 100`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{t.toFixed(0)}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(100)} y2={y(100)} className="base" />
        <text x={P.l} y={H - 6} className="axis">{series[0].date.slice(5)}</text>
        <text x={W - P.r} y={H - 6} textAnchor="end" className="axis">{last.date.slice(5)}</text>
        <path d={path("bench")} className="ln bench" />
        <path d={path("port")} className="ln port" />
        <circle cx={x(series.length - 1)} cy={y(last.port)} r="3.5" className="dot port" />
        <circle cx={x(series.length - 1)} cy={y(last.bench)} r="3.5" className="dot bench" />
      </svg>
      <figcaption>
        <span className="key port" /> {labels[0]} <b>{last.port.toFixed(1)}</b>
        <span className="key bench" /> {labels[1]} <b>{last.bench.toFixed(1)}</b>
        <span className="muted"> · both start at 100</span>
      </figcaption>
    </figure>
  );
}

export function CurveChart({ points }: { points: { label: string; years: number; y: number }[] }) {
  const W = 720, H = 220, P = { l: 44, r: 16, t: 16, b: 28 };
  const lo = Math.floor(Math.min(...points.map((p) => p.y)) * 4) / 4 - 0.25;
  const hi = Math.ceil(Math.max(...points.map((p) => p.y)) * 4) / 4 + 0.25;
  // sqrt scale on maturity so the short end is readable
  const sx = (yr: number) => P.l + (Math.sqrt(yr) / Math.sqrt(30)) * (W - P.l - P.r);
  const sy = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(p.years).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Treasury yield curve">
        {[lo, (lo + hi) / 2, hi].map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={P.l - 6} y={sy(t) + 4} textAnchor="end" className="axis">{t.toFixed(2)}%</text>
          </g>
        ))}
        <path d={d} className="ln curve" />
        {points.map((p) => (
          <g key={p.label}>
            <circle cx={sx(p.years)} cy={sy(p.y)} r="3.5" className="dot curve" />
            <text x={sx(p.years)} y={H - 8} textAnchor="middle" className="axis">{p.label}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function filingUrl(symbol: string, type: string) {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(symbol)}&type=${type}&dateb=&owner=include&count=10`;
}

/** Links to a company's financial reports: SEC filings plus Yahoo's financial statements. */
export function reportLinks(symbol: string, filing: string) {
  const foreign = filing === "20-F";
  const sym = encodeURIComponent(symbol);
  return {
    annual: { label: foreign ? "20-F" : "10-K", url: filingUrl(symbol, foreign ? "20-F" : "10-K") },
    quarterly: { label: foreign ? "6-K" : "10-Q", url: filingUrl(symbol, foreign ? "6-K" : "10-Q") },
    news: { label: foreign ? "6-K" : "8-K", url: filingUrl(symbol, foreign ? "6-K" : "8-K") },
    statements: { label: "Statements", url: `https://finance.yahoo.com/quote/${sym}/financials` },
    earnings: { label: "Earnings", url: `https://finance.yahoo.com/quote/${sym}/analysis` },
    quote: `https://finance.yahoo.com/quote/${sym}`,
  };
}

export function Reports({ symbol, filing }: { symbol: string; filing: string }) {
  const r = reportLinks(symbol, filing);
  const a = (l: { label: string; url: string }, title: string) => (
    <a href={l.url} target="_blank" rel="noreferrer" title={title}>{l.label}</a>
  );
  return (
    <span className="reports">
      {a(r.annual, "Annual report")} · {a(r.quarterly, "Quarterly report")} · {a(r.statements, "Income statement, balance sheet, cash flow")}
    </span>
  );
}

/** Holdings map: each block sized by portfolio weight, shaded by today's move. */
export function HoldingsMap({ items, width = 360, height = 300 }: {
  items: { symbol: string; weight: number; dayPct: number }[]; width?: number; height?: number;
}) {
  const cells = squarify(items.map((i) => ({ ...i, value: Math.max(0.01, i.weight) })), { x: 0, y: 0, w: width, h: height });
  const shade = (v: number) => {
    const a = Math.min(1, Math.abs(v) / 3) * 0.85 + 0.08; // full strength at ±3%
    return v >= 0 ? `rgba(31,107,58,${a.toFixed(2)})` : `rgba(163,39,29,${a.toFixed(2)})`;
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="tmap" role="img" aria-label="Holdings map sized by weight and shaded by today's change">
      {cells.map((c) => {
        const strong = Math.abs(c.dayPct) > 1.4;
        const big = c.w > 46 && c.h > 30;
        return (
          <g key={c.symbol} data-stock={c.symbol} style={{ cursor: "pointer" }}>
            <rect x={c.x + 0.75} y={c.y + 0.75} width={Math.max(0, c.w - 1.5)} height={Math.max(0, c.h - 1.5)} fill={shade(c.dayPct)} stroke="#161412" strokeWidth="0.75" />
            {c.w > 26 && c.h > 16 && (
              <text x={c.x + c.w / 2} y={c.y + c.h / 2 + (big ? -2 : 4)} textAnchor="middle" className={`tm-sym ${strong ? "light" : ""}`} style={{ fontSize: Math.min(15, Math.max(9, Math.sqrt(c.w * c.h) / 4.2)) }}>{c.symbol}</text>
            )}
            {big && (
              <text x={c.x + c.w / 2} y={c.y + c.h / 2 + 12} textAnchor="middle" className={`tm-pct ${strong ? "light" : ""}`}>{c.dayPct > 0 ? "+" : ""}{c.dayPct.toFixed(1)}%</text>
            )}
            <title>{`${c.symbol}: ${c.weight.toFixed(1)}% of portfolio, ${c.dayPct > 0 ? "+" : ""}${c.dayPct.toFixed(2)}% today`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/** Correlation heatmap: darker ink = holdings that move together. */
export function CorrHeatmap({ syms, matrix, slots }: { syms: string[]; matrix: number[][]; slots?: number }) {
  const cell = 15, pad = 40;
  const size = pad + Math.max(syms.length, slots ?? 0) * cell; // same scale for every portfolio
  const fill = (v: number) => (v >= 0 ? `rgba(22,20,18,${Math.min(1, v).toFixed(2)})` : `rgba(163,39,29,${Math.min(1, -v).toFixed(2)})`);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="heat" role="img" aria-label="Correlation heatmap of holdings">
      {syms.map((s, i) => (
        <g key={s}>
          <text x={pad - 4} y={pad + i * cell + cell * 0.72} textAnchor="end" className="hm-lbl">{s}</text>
          <text x={pad + i * cell + cell * 0.7} y={pad - 4} transform={`rotate(-90 ${pad + i * cell + cell * 0.7} ${pad - 4})`} className="hm-lbl">{s}</text>
        </g>
      ))}
      {matrix.map((row, i) => row.map((v, j) => (
        <rect key={`${i}-${j}`} x={pad + j * cell} y={pad + i * cell} width={cell - 1} height={cell - 1} fill={i === j ? "#cfc6b4" : fill(v)}>
          <title>{`${syms[i]} / ${syms[j]}: ${v.toFixed(2)}`}</title>
        </rect>
      )))}
    </svg>
  );
}
