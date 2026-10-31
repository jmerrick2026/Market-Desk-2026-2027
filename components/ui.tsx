import Link from "next/link";
import Slideshow from "./Slideshow";
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
        <span>Late Edition · {time} ET</span>
      </div>
      <Link href="/" className="nameplate">The {SITE.title}</Link>
      <div className="dateline">
        <span>Vol. I · No. {issue}</span>
        <span>{date}</span>
        <span>Edited by {SITE.byline}</span>
      </div>
      <nav>
        <a href="#front">The Session</a>
        <a href="#macro">Macro</a>
        <a href="#markets">Markets</a>
        <a href="#micro">Micro</a>
        <a href="#portfolios">Portfolios</a>
        <a href="#closing">Closing Questions</a>
        <Slideshow title={SITE.title} date={date} />
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
