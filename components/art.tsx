// Newspaper art: halftone lead graphic, engraved-style section illustrations, weather box.
import type { Bar } from "../lib/data";

/** Lead graphic: a halftone-dot area chart of the S&P 500, drawn like a newspaper infographic. */
export function LeadArt({ bars, title }: { bars: Bar[]; title: string }) {
  if (bars.length < 5) return null;
  const W = 900, H = 330, P = { l: 56, r: 70, t: 46, b: 34 };
  const vals = bars.map((b) => b.close);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (i: number) => P.l + (i / (bars.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const line = bars.map((b, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(b.close).toFixed(1)}`).join("");
  const area = `${line}L${x(bars.length - 1).toFixed(1)},${H - P.b}L${P.l},${H - P.b}Z`;
  const iHi = vals.indexOf(hi), iLo = vals.indexOf(lo);
  const last = bars[bars.length - 1], first = bars[0];
  const chg = (last.close / first.close - 1) * 100;
  const months: { i: number; label: string }[] = [];
  bars.forEach((b, i) => { const m = b.date.slice(5, 7); if (i > 0 && m !== bars[i - 1].date.slice(5, 7)) months.push({ i, label: new Date(b.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short" }).toUpperCase() }); });
  const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <figure className="lead-art">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${chg >= 0 ? "up" : "down"} ${Math.abs(chg).toFixed(1)}% over the period`}>
        <defs>
          <pattern id="halftone" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="3.5" cy="3.5" r="1.9" fill="#161412" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
          </linearGradient>
          <mask id="fademask"><rect width={W} height={H} fill="url(#fade)" /></mask>
        </defs>
        <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#161412" />
        <text x="16" y="28" className="la-title">{title.toUpperCase()}</text>
        <text x={W - 16} y="28" textAnchor="end" className="la-chg">{chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%</text>
        {[0.25, 0.5, 0.75].map((f) => {
          const v = y0 + (y1 - y0) * f;
          return (
            <g key={f}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#161412" strokeOpacity=".18" strokeDasharray="2 4" />
              <text x={P.l - 8} y={y(v) + 4} textAnchor="end" className="la-axis">{fmt(v)}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#halftone)" mask="url(#fademask)" opacity=".55" />
        <path d={line} fill="none" stroke="#161412" strokeWidth="3.2" strokeLinejoin="round" />
        {months.map((m) => (
          <g key={m.i}>
            <line x1={x(m.i)} x2={x(m.i)} y1={H - P.b} y2={H - P.b + 6} stroke="#161412" />
            <text x={x(m.i) + 4} y={H - 12} className="la-axis">{m.label}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="#161412" strokeWidth="1.5" />
        <circle cx={x(iHi)} cy={y(hi)} r="4.5" fill="#f6f1e7" stroke="#161412" strokeWidth="2" />
        <text x={x(iHi)} y={y(hi) - 10} textAnchor="middle" className="la-note">High {fmt(hi)}</text>
        <circle cx={x(iLo)} cy={y(lo)} r="4.5" fill="#f6f1e7" stroke="#161412" strokeWidth="2" />
        <text x={x(iLo)} y={y(lo) + 20} textAnchor="middle" className="la-note">Low {fmt(lo)}</text>
        <circle cx={x(bars.length - 1)} cy={y(last.close)} r="6" fill="#161412" />
        <text x={x(bars.length - 1) + 10} y={y(last.close) + 5} className="la-last">{fmt(last.close)}</text>
      </svg>
      <figcaption>
        <span>The S&amp;P 500 closed at {fmt(last.close)}, {chg >= 0 ? "up" : "down"} {Math.abs(chg).toFixed(1)}% from {new Date(first.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric" })}.</span>
        <span className="credit">Graphic: The Merrick Market Monitor · Data: Yahoo Finance</span>
      </figcaption>
    </figure>
  );
}

/** Market Weather: the VIX as a forecast. */
export function MarketWeather({ vix, spx }: { vix?: number; spx?: number }) {
  const v = vix ?? 18;
  const kind = v < 14 ? "sunny" : v < 18 ? "fair" : v < 24 ? "cloudy" : v < 30 ? "rain" : "storm";
  const label = { sunny: "Sunny and calm", fair: "Mostly fair", cloudy: "Clouds building", rain: "Showers likely", storm: "Storm warning" }[kind];
  const text = {
    sunny: "Low volatility. Expect small daily moves.",
    fair: "Volatility near normal. A typical day's swing is under 1%.",
    cloudy: "Investors are paying up for protection. Daily swings of 1% or more are likely.",
    rain: "Elevated fear. Big up and down days ahead.",
    storm: "Extreme fear. Batten down the hatches.",
  }[kind];
  const daily = v / Math.sqrt(252);
  return (
    <div className="weather">
      <p className="kicker">Market Weather</p>
      <div className="wx-row">
        <WeatherIcon kind={kind} />
        <div>
          <p className="wx-label">{label}</p>
          <p className="wx-vix">VIX {v.toFixed(1)}{spx != null && <> · S&amp;P {spx >= 0 ? "+" : ""}{spx.toFixed(2)}%</>}</p>
        </div>
      </div>
      <p className="wx-text">{text} The VIX implies a typical daily move of about ±{daily.toFixed(1)}%.</p>
    </div>
  );
}

function WeatherIcon({ kind }: { kind: string }) {
  const sun = (cx: number, cy: number, r: number) => (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1={cx + Math.cos(a) * (r + 4)} y1={cy + Math.sin(a) * (r + 4)} x2={cx + Math.cos(a) * (r + 10)} y2={cy + Math.sin(a) * (r + 10)} stroke="#161412" strokeWidth="2.2" strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r={r} fill="url(#hatch)" stroke="#161412" strokeWidth="2.2" />
    </g>
  );
  const cloud = (dx: number, dy: number, s = 1) => (
    <path transform={`translate(${dx} ${dy}) scale(${s})`} d="M10 40 C2 40 2 28 11 27 C11 17 25 13 30 21 C34 12 50 14 50 26 C59 26 60 40 50 40 Z" fill="#f6f1e7" stroke="#161412" strokeWidth="2.2" strokeLinejoin="round" />
  );
  return (
    <svg viewBox="0 0 70 64" className="wx-icon" aria-hidden="true">
      <defs>
        <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#161412" strokeWidth="1.2" />
        </pattern>
      </defs>
      {kind === "sunny" && sun(35, 32, 13)}
      {kind === "fair" && <>{sun(26, 24, 10)}{cloud(14, 14, 0.9)}</>}
      {kind === "cloudy" && <>{cloud(2, 2, 0.8)}{cloud(12, 14, 1)}</>}
      {(kind === "rain" || kind === "storm") && <>{cloud(8, 0, 1)}{[18, 30, 42].map((x) => <line key={x} x1={x} y1="46" x2={x - 5} y2="58" stroke="#161412" strokeWidth="2.2" strokeLinecap="round" />)}</>}
      {kind === "storm" && <path d="M38 40 L30 52 L37 52 L32 63 L45 48 L38 48 L43 40 Z" fill="#161412" />}
    </svg>
  );
}

/** Engraved-style section illustrations (original line art). */
export function SectionArt({ kind }: { kind: string }) {
  const S = { fill: "none", stroke: "#161412", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const hatch = (
    <defs>
      <pattern id={`h-${kind}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#161412" strokeWidth="1.1" />
      </pattern>
    </defs>
  );
  const H = `url(#h-${kind})`;
  const art: Record<string, React.ReactNode> = {
    recap: (<g {...S}><circle cx="32" cy="34" r="20" /><path d="M32 20 V34 L42 40" /><path d="M26 10 H38 M32 10 V14" /><circle cx="32" cy="34" r="20" fill={H} opacity=".25" stroke="none" /></g>),
    globe: (<g {...S}><circle cx="32" cy="32" r="22" /><ellipse cx="32" cy="32" rx="9" ry="22" /><path d="M10 32 H54 M14 20 H50 M14 44 H50" /><path d="M32 10 V54" /><path d="M20 14 C26 22 26 42 20 50" fill={H} opacity=".35" stroke="none" /></g>),
    columns: (<g {...S}><path d="M8 22 L32 8 L56 22 Z" fill={H} /><path d="M10 22 H54 M10 26 H54" />{[16, 26, 38, 48].map((x) => <path key={x} d={`M${x} 26 V50 M${x - 3} 26 V50`} />)}<path d="M8 50 H56 M6 55 H58" /></g>),
    candles: (<g {...S}>{[[12, 30, 44, 22, 38, 1], [24, 20, 40, 26, 34, 0], [36, 14, 34, 18, 28, 1], [48, 8, 28, 12, 22, 1]].map(([x, top, bot, b1, b2, up], i) => (<g key={i}><path d={`M${x} ${top} V${bot}`} /><rect x={x - 4} y={b1} width="8" height={b2 - b1} fill={up ? H : "#f6f1e7"} /></g>))}<path d="M6 56 H58" /></g>),
    magnifier: (<g {...S}><circle cx="26" cy="26" r="16" /><circle cx="26" cy="26" r="16" fill={H} opacity=".3" stroke="none" /><path d="M38 38 L54 54" strokeWidth="5" /><path d="M18 30 L24 24 L28 28 L34 20" /></g>),
    briefcase: (<g {...S}><rect x="8" y="20" width="48" height="32" rx="3" /><path d="M24 20 V14 H40 V20" /><path d="M8 32 H56" /><rect x="28" y="29" width="8" height="7" fill={H} /><path d="M8 32 V52 H56 V32" fill={H} opacity=".25" stroke="none" /></g>),
    scale: (<g {...S}><path d="M32 10 V52 M20 54 H44" /><path d="M12 18 H52" /><path d="M12 18 L4 34 H20 Z" fill={H} /><path d="M52 18 L44 34 H60 Z" /><circle cx="32" cy="10" r="3" /></g>),
    document: (<g {...S}><path d="M14 8 H40 L50 18 V56 H14 Z" /><path d="M40 8 V18 H50" /><path d="M20 26 H44 M20 32 H44 M20 38 H36" /><rect x="20" y="43" width="18" height="8" fill={H} /></g>),
    quill: (<g {...S}><path d="M50 8 C30 12 18 28 14 50 C24 36 34 30 46 26 C40 24 38 22 40 18 C46 18 48 14 50 8 Z" fill={H} /><path d="M14 50 L10 56" /><path d="M20 56 H54" /></g>),
    film: (<g {...S}><rect x="8" y="14" width="48" height="34" rx="3" /><path d="M8 22 H56 M8 40 H56" />{[14, 24, 34, 44].map((x) => <rect key={x} x={x} y="16" width="5" height="4" fill="#161412" stroke="none" />)}<path d="M28 26 L38 31 L28 36 Z" fill="#161412" /></g>),
    grid: (<g {...S}><rect x="10" y="10" width="44" height="44" />{[21, 32, 43].map((v) => <path key={v} d={`M${v} 10 V54 M10 ${v} H54`} />)}{[[10, 10], [43, 21], [21, 32], [32, 43], [10, 43]].map(([x, y], i) => <rect key={i} x={x} y={y} width="11" height="11" fill="#161412" stroke="none" />)}</g>),
  };
  return (
    <svg viewBox="0 0 64 64" className="section-art" aria-hidden="true">
      {hatch}
      {art[kind] ?? null}
    </svg>
  );
}
