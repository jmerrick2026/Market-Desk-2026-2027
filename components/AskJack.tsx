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

/** Jack: an original cartoon alligator in round glasses, suit, and tie. */
function Avatar() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><clipPath id={`c${id}`}><circle cx="60" cy="60" r="60" /></clipPath></defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="120" height="120" fill="#efe9d8" />
        <path d="M10 120 C14 98 34 90 60 90 C86 90 106 98 110 120 Z" fill="#2b2b33" />
        <path d="M46 90 L60 112 L74 90 Z" fill="#fbf8f1" />
        <path d="M57 94 L63 94 L65 99 L60 114 L55 99 Z" fill="#8c1d2f" />
        <path d="M57 94 L63 94 L61.5 98 L58.5 98 Z" fill="#6e1424" />
        <path d="M44 78 C46 88 74 88 76 78 L76 92 C70 96 50 96 44 92 Z" fill="#4f9a4a" />
        <path d="M26 58 C26 38 40 28 58 28 C76 28 92 36 96 52 C99 62 96 74 86 80 C74 86 46 86 36 80 C29 76 26 68 26 58 Z" fill="#5aab52" />
        <path d="M52 50 C64 46 92 46 104 50 C112 53 113 64 105 68 C92 73 66 74 54 70 Z" fill="#62b85a" />
        <path d="M40 70 C56 76 90 76 105 68 C104 76 92 82 76 83 C60 84 46 80 40 70 Z" fill="#c9e3a6" />
        <path d="M44 69 C60 75 90 74 106 66" stroke="#2f5e2c" strokeWidth="2" fill="none" strokeLinecap="round" />
        <g fill="#fff" stroke="#2f5e2c" strokeWidth=".8">
          <path d="M62 72 L64.5 77 L67 72.6 Z" /><path d="M74 73.2 L76.5 78 L79 73 Z" /><path d="M86 72.4 L88.5 77 L91 71.8 Z" /><path d="M97 70 L99 74 L101 69 Z" />
        </g>
        <ellipse cx="101" cy="53" rx="2" ry="1.4" fill="#2f5e2c" /><ellipse cx="94" cy="52" rx="2" ry="1.4" fill="#2f5e2c" />
        <g fill="#4a9443"><circle cx="40" cy="42" r="2.6" /><circle cx="34" cy="52" r="2.2" /><circle cx="72" cy="56" r="2" /><circle cx="82" cy="58" r="1.8" /><circle cx="64" cy="59" r="1.8" /></g>
        <ellipse cx="46" cy="38" rx="11" ry="11" fill="#5aab52" />
        <ellipse cx="66" cy="36" rx="11" ry="11" fill="#5aab52" />
        <ellipse cx="46" cy="38" rx="7.5" ry="8" fill="#fff" />
        <ellipse cx="66" cy="36" rx="7.5" ry="8" fill="#fff" />
        <circle cx="48" cy="39" r="4" fill="#1d1a16" /><circle cx="68" cy="37" r="4" fill="#1d1a16" />
        <circle cx="49.3" cy="37.6" r="1.3" fill="#fff" /><circle cx="69.3" cy="35.6" r="1.3" fill="#fff" />
        <path d="M38.5 34 C42 29 50 29 53.5 34" stroke="#3f8239" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M58.5 32 C62 27 70 27 73.5 32" stroke="#3f8239" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g stroke="#b88a2a" strokeWidth="2.2" fill="none"><circle cx="46" cy="38.5" r="9.5" /><circle cx="66" cy="36.5" r="9.5" /><path d="M55.3 37.6 Q56 35.5 56.8 37.3" /><path d="M36.6 39 L28 41" /></g>
        <ellipse cx="44" cy="62" rx="4" ry="2.4" fill="#f2a9a0" opacity=".45" />
      </g>
    </svg>
  );
}
