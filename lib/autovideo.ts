// Video of the Day, picked automatically from Yahoo Finance's official YouTube channel.
// YouTube publishes a free RSS feed of each channel's latest ~15 uploads, so no API key is needed.
// The site refreshes the feed every 30 minutes and picks the newest video whose title best matches today's market story.
import type { Video } from "./videos";
import { DEMO } from "./data";

const CHANNEL = "UCEAZeUIeJs0IjQiqTCdVSIg"; // Yahoo Finance (youtube.com/@yahoofinance)
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`;

type Entry = { id: string; title: string; published: string };

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function latest(): Promise<Entry[]> {
  if (DEMO) return [];
  try {
    const r = await fetch(FEED, { next: { revalidate: 1800 }, headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => ({
      id: m[1].match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "",
      title: decode(m[1].match(/<title>([^<]+)<\/title>/)?.[1] ?? ""),
      published: m[1].match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
    })).filter((e) => e.id && !/#shorts?\b/i.test(e.title));
  } catch {
    return [];
  }
}

/** Score each recent upload against today's story keywords and return the best match. */
export async function videoOfTheDay(keywords: string[]): Promise<(Video & { auto: true; why: string }) | null> {
  const list = await latest();
  if (!list.length) return null;
  const now = Date.now();
  const words = [...new Set(keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 2))];
  const general = ["stock market", "stocks", "market", "s&p", "dow", "nasdaq", "wall street", "fed", "earnings"];
  let best = list[0], bestScore = -1, hits: string[] = [];
  for (const e of list) {
    const t = e.title.toLowerCase();
    const h = words.filter((w) => t.includes(w));
    const ageDays = (now - Date.parse(e.published)) / 864e5;
    const score = h.length * 3 + general.filter((g) => t.includes(g)).length - Math.max(0, ageDays - 1) * 0.6;
    if (score > bestScore) { best = e; bestScore = score; hits = h; }
  }
  const when = best.published ? new Date(best.published).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }) : "";
  return {
    url: `https://www.youtube.com/watch?v=${best.id}`,
    title: best.title,
    note: `Yahoo Finance${when ? ` · ${when}` : ""}`,
    auto: true,
    why: hits.length ? `Picked automatically because it mentions ${hits.slice(0, 3).join(", ")}.` : "Yahoo Finance's latest market coverage.",
  };
}
