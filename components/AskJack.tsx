"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Topic, QA } from "../lib/askjack";

// Which topic each page section belongs to
const SECTION_TOPIC: Record<string, string> = {
  front: "front", macro: "macro", week: "week", markets: "markets", micro: "micro",
  portfolios: "portfolios", map: "portfolios", "jack-merrick": "portfolios", class: "portfolios", dartboard: "portfolios",
  risk: "risk", reports: "reports", closing: "front", puzzles: "puzzles",
};
const TINTS = ["lav", "pink", "lime"];

type Msg = { role: "you" | "jack"; qa: QA };

export default function AskJack({ topics, asOf }: { topics: Topic[]; asOf: string }) {
  const [open, setOpen] = useState(false);
  const [topicId, setTopicId] = useState("front");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Follow the reader: whichever section is on screen sets the topic
  useEffect(() => {
    const els = Object.keys(SECTION_TOPIC).map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setTopicId(SECTION_TOPIC[vis.target.id] ?? "front");
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keep the newest question and its answer in view (not the buttons below it)
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const qs = body.querySelectorAll<HTMLElement>(".aj-you");
    const last = qs[qs.length - 1];
    body.scrollTo({ top: last ? last.offsetTop - 12 : 0, behavior: "smooth" });
  }, [msgs, typing]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const topic = topics.find((t) => t.id === topicId) ?? topics[0];
  const others = topics.filter((t) => t.id !== topic.id);

  const ask = (qa: QA) => {
    setMsgs((m) => [...m, { role: "you", qa }]);
    setTyping(true);
    setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { role: "jack", qa }]); }, 650);
  };
  const askedSet = new Set(msgs.filter((m) => m.role === "you").map((m) => m.qa.q));
  const remaining = topic.qs.filter((x) => !askedSet.has(x.q));

  return (
    <>
      {!open && (
        <button className="aj-launch" onClick={() => setOpen(true)} aria-label="Open Ask Jack">
          <span className="aj-ava sm"><Avatar /><i className="aj-dot" /></span>
          <span>Ask Jack</span>
        </button>
      )}
      {open && (
        <div className="aj-panel" role="dialog" aria-label="Ask Jack">
          <header className="aj-head">
            <div className="aj-title">
              <span className="aj-ava"><Avatar /><i className="aj-dot" /></span>
              <div className="aj-name"><h2>Ask Jack</h2><span className="aj-status">Online · usually replies instantly</span></div>
              <button className="aj-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <p>A little help with the markets and our portfolios. Choose a question below.</p>
          </header>
          <div className="aj-context">
            <b>Looking at: {topic.label}</b>
            <span>Prices through {asOf}</span>
          </div>
          <div className="aj-body" ref={bodyRef}>
            {msgs.length === 0 && (
              <>
                <h3>Let&apos;s make sense of it.</h3>
                <p className="aj-intro">Pick a question for a simple explanation or a calculation using the data currently shown on the site.</p>
              </>
            )}
            {msgs.map((m, i) =>
              m.role === "you" ? (
                <div key={i} className="aj-you">{m.qa.q}</div>
              ) : (
                <div key={i} className="aj-row">
                  <span className="aj-ava xs"><Avatar /></span>
                  <div className="aj-jack">
                    {m.qa.a.map((t, j) => <p key={j}>{t}</p>)}
                    {m.qa.list && <ul>{m.qa.list.map((t, j) => <li key={j} className={/^(\.\.\.|Worst|Best)/.test(t) ? "aj-sub" : ""}>{t}</li>)}</ul>}
                  </div>
                </div>
              )
            )}
            {typing && <div className="aj-row"><span className="aj-ava xs"><Avatar /></span><div className="aj-jack aj-typing" aria-label="Jack is typing"><span /><span /><span /></div></div>}
            {!typing && (
              <div className="aj-qs">
                {msgs.length > 0 && remaining.length > 0 && <p className="aj-more">More about {topic.label.toLowerCase()}:</p>}
                {remaining.map((x, i) => (
                  <button key={x.q} className={`aj-q ${TINTS[i % 3]}`} onClick={() => ask(x)}>{x.q}</button>
                ))}
                <p className="aj-more">Other topics:</p>
                <div className="aj-topics">
                  {others.map((t) => (
                    <button key={t.id} className="aj-topic" onClick={() => setTopicId(t.id)}>{t.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <footer className="aj-foot">
            <button className="aj-reset" onClick={() => setMsgs([])}>↺ Start over</button>
            <p>Built-in helper, not AI. No AI usage charges. Answers use the displayed data when you tap a question; prices may be delayed.</p>
          </footer>
        </div>
      )}
    </>
  );
}

/** Jack: a friendly cartoon 18-year-old in a navy hoodie (original illustration). */
function Avatar() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><clipPath id={`c${id}`}><circle cx="60" cy="60" r="60" /></clipPath></defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="120" height="120" fill="#e7e0fb" />
        <path d="M14 120 C16 96 34 86 60 86 C86 86 104 96 106 120 Z" fill="#2f4570" />
        <path d="M44 88 C50 98 70 98 76 88 L72 86 C66 92 54 92 48 86 Z" fill="#253a60" />
        <path d="M52 92 L50 108 M68 92 L70 108" stroke="#e8e2f8" strokeWidth="2" strokeLinecap="round" />
        <path d="M51 74 L51 88 C55 92 65 92 69 88 L69 74 Z" fill="#e3ad87" />
        <ellipse cx="35.5" cy="56" rx="4.5" ry="6.5" fill="#efbf9a" />
        <ellipse cx="84.5" cy="56" rx="4.5" ry="6.5" fill="#efbf9a" />
        <path d="M36 50 C36 30 48 22 60 22 C72 22 84 30 84 50 C84 66 74 80 60 80 C46 80 36 66 36 50 Z" fill="#f4caa6" />
        <path d="M34 50 C31 30 42 16 58 15 C70 14 80 18 85 28 C88 34 87 44 85 50 C83 42 80 37 76 34 C70 38 60 39 50 36 C46 40 40 43 36 52 Z" fill="#5b3a24" />
        <path d="M50 36 C54 30 62 27 70 29 C64 31 60 34 58 38 Z" fill="#6e4a30" />
        <path d="M44.5 46.5 Q49 44 53.5 46" stroke="#4a2f1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M66.5 46 Q71 44 75.5 46.5" stroke="#4a2f1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <ellipse cx="49.5" cy="53" rx="2.8" ry="3.3" fill="#2a2340" />
        <ellipse cx="70.5" cy="53" rx="2.8" ry="3.3" fill="#2a2340" />
        <circle cx="50.5" cy="52" r="0.9" fill="#fff" /><circle cx="71.5" cy="52" r="0.9" fill="#fff" />
        <path d="M60 56 Q58.5 62 61.5 63" stroke="#d99e7a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="44" cy="63" rx="4" ry="2.4" fill="#f2a9a0" opacity=".45" />
        <ellipse cx="76" cy="63" rx="4" ry="2.4" fill="#f2a9a0" opacity=".45" />
        <path d="M52 67 Q60 74 68 67" stroke="#a5523f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M54 68 Q60 72.5 66 68 Q60 70.5 54 68 Z" fill="#fff" />
      </g>
    </svg>
  );
}
