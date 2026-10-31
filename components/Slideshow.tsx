"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Turns every element marked data-slide on the page into a full-screen slide.
 * Keys: → / Space / PageDown = next, ← / PageUp = back, Home / End, Esc = exit.
 * Open the page with ?slides=1 to start in slideshow mode.
 */
export default function Slideshow({ title, date }: { title: string; date: string }) {
  const [on, setOn] = useState(false);
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);

  const slides = () => Array.from(document.querySelectorAll<HTMLElement>("[data-slide]"));

  const show = useCallback((idx: number) => {
    const all = slides();
    const k = Math.max(0, Math.min(all.length - 1, idx));
    all.forEach((el, j) => el.classList.toggle("slide-active", j === k));
    all[k]?.scrollTo(0, 0);
    setI(k);
    setN(all.length);
  }, []);

  const start = useCallback((idx = 0) => {
    document.body.classList.add("presenting");
    setOn(true);
    show(idx);
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  }, [show]);

  const stop = useCallback(() => {
    document.body.classList.remove("presenting");
    slides().forEach((el) => el.classList.remove("slide-active"));
    setOn(false);
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch {}
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("slides") === "1") start(0);
  }, [start]);

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); show(i + 1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); show(i - 1); }
      else if (e.key === "Home") show(0);
      else if (e.key === "End") show(n - 1);
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, i, n, show, stop]);

  if (!on) {
    return (
      <button className="present-btn" onClick={() => start(0)} title="Present this page as a slideshow (arrow keys to move, Esc to exit)">
        ▶ Present
      </button>
    );
  }
  return createPortal(
    <div className="slide-chrome" role="toolbar" aria-label="Slideshow controls">
      <span className="slide-brand">The {title} <em>· {date}</em></span>
      <span className="slide-ctrl">
        <button onClick={() => show(i - 1)} disabled={i === 0} aria-label="Previous slide">←</button>
        <span className="slide-count">{i + 1} / {n}</span>
        <button onClick={() => show(i + 1)} disabled={i >= n - 1} aria-label="Next slide">→</button>
        <button onClick={stop} aria-label="Exit slideshow">Exit</button>
      </span>
    </div>,
    document.body
  );
}
