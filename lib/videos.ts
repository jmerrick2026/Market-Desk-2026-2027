// ─────────────────────────────────────────────────────────────
//  VIDEOS: paste links here to show them in the "Watch" section.
// ─────────────────────────────────────────────────────────────
//  Works with YouTube links (watch, youtu.be, shorts, or live), Vimeo links,
//  or a direct link to an .mp4/.webm file. Leave the list empty to hide the videos.
//
//  Example:
//  { url: "https://www.youtube.com/watch?v=VIDEO_ID", title: "How bonds work", note: "Watch before Tuesday" },

export type Video = { url: string; title: string; note?: string };

export const VIDEOS: Video[] = [];

/** Turn a pasted link into something a page can embed. */
export function toEmbed(url: string): { kind: "iframe" | "file"; src: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:shorts|live|embed)\/([\w-]+)/)?.[1];
      return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.match(/(\d+)/)?.[1];
      return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: "file", src: url };
  } catch {}
  return null;
}
