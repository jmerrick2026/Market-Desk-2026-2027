"use client";

import { useEffect, useState } from "react";
import type { DeskNote } from "../lib/stockdesk";

/**
 * Click any element with data-stock="TICKER" to open that stock's desk note.
 * Notes are computed on the server and passed in as props.
 */
export default function StockDesk({ notes }: { notes: Record<string, DeskNote> }) {
  const [sym, setSym] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-stock]");
      if (!el) return;
      const s = el.dataset.stock!;
      if (!notes[s]) return;
      e.preventDefault();
      setSym(s);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSym(null);
      if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement)?.dataset?.stock) {
        e.preventDefault();
        setSym((e.target as HTMLElement).dataset.stock!);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, [notes]);

  const n = sym ? notes[sym] : null;
  if (!n) return null;
  const pct = (v?: number, d = 2) => (v == null || !isFinite(v) ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);
  const cls = (v?: number) => (v == null ? "" : v > 0 ? "up" : v < 0 ? "down" : "");
  const leanCls = n.lean === "Leans long" ? "long" : n.lean === "Leans short" ? "short" : "neutral";

  return (
    <div className="sd-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSym(null); }}>
      <aside className="sd-panel" role="dialog" aria-label={`Desk note: ${n.s}`}>
        <header className="sd-head">
          <p className="kicker">Desk note · {n.owners.join(" · ")}</p>
          <button className="sd-close" onClick={() => setSym(null)} aria-label="Close">×</button>
          <h2>{n.s}</h2>
          <p className="sd-name">{n.name}</p>
          <div className="sd-stats">
            <div><span>Last</span><b>{n.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
            <div><span>Today</span><b className={cls(n.dayPct)}>{pct(n.dayPct)}</b></div>
            <div><span>1 week</span><b className={cls(n.w1)}>{pct(n.w1, 1)}</b></div>
            <div><span>1 month</span><b className={cls(n.m1)}>{pct(n.m1, 1)}</b></div>
          </div>
        </header>

        <section className="sd-sec">
          <h3>Why it moved</h3>
          {n.why.map((w, i) => <p key={i}>{w}</p>)}
          {n.headlines.length > 0 && (
            <ul className="sd-news">
              {n.headlines.map((h) => (
                <li key={h.link}><a href={h.link} target="_blank" rel="noreferrer">{h.title}</a><span>{h.publisher}{h.date ? ` · ${h.date}` : ""}</span></li>
              ))}
            </ul>
          )}
        </section>

        <section className="sd-sec">
          <h3>Position lean</h3>
          <p className={`sd-lean ${leanCls}`}>{n.lean === "Leans long" ? "▲ " : n.lean === "Leans short" ? "▼ " : "◆ "}{n.lean}</p>
          <p>{n.leanWhy}</p>
          <ul className="sd-signals">
            {n.signals.map((s) => (
              <li key={s.label} className={s.dir > 0 ? "pos" : s.dir < 0 ? "neg" : "flat"}>
                <span className="sd-dot">{s.dir > 0 ? "+" : s.dir < 0 ? "−" : "·"}</span>
                <b>{s.label}</b> {s.text}
              </li>
            ))}
          </ul>
        </section>

        <footer className="sd-foot">
          <p>Educational signal read built from price data, not investment advice. Headlines are the latest coverage, not necessarily the cause of a move.</p>
          <div className="sd-links">
            <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(n.s)}`} target="_blank" rel="noreferrer">Quote ↗</a>
            <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(n.s)}/financials`} target="_blank" rel="noreferrer">Financials ↗</a>
            <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(n.s)}&type=10-K&dateb=&owner=include&count=10`} target="_blank" rel="noreferrer">SEC filings ↗</a>
          </div>
        </footer>
      </aside>
    </div>
  );
}
