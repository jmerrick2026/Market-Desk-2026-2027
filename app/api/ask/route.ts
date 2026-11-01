import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { loadAll } from "../../../lib/calc";
import { buildAskContext } from "../../../lib/askjack";

export const dynamic = "force-dynamic";

// Portfolio snapshot shared by all questions for two minutes
const getContext = unstable_cache(async () => buildAskContext(await loadAll()), ["ask-context-v1"], { revalidate: 120 });

const SYSTEM = `You are "Jack," the friendly market analyst inside The Merrick Market Monitor, a classroom markets newspaper.
Answer questions about the three model portfolios, their holdings, and the market, using ONLY the data snapshot provided.
Rules:
- Be concise: 2 to 5 sentences, or a short list. Plain English a high school student understands; define jargon briefly.
- Cite specific numbers from the snapshot. If the snapshot lacks the answer, say so and suggest which section of the site to check.
- For "should I buy/sell/hold" questions, give the educational signal read (trend, momentum, relative strength, 52-week range, earnings timing) and note it is not investment advice. Never promise returns.
- Do not invent news or reasons. Headlines in the snapshot are the latest coverage, not proven causes.
- No markdown headings. No em dashes.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ fallback: true }, { status: 501 });
  let q = "";
  try { q = String((await req.json())?.q ?? "").slice(0, 500).trim(); } catch {}
  if (!q) return NextResponse.json({ error: "empty" }, { status: 400 });
  try {
    const context = await getContext();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ASK_JACK_MODEL || "claude-haiku-5-5",
        max_tokens: 500,
        system: SYSTEM,
        messages: [{ role: "user", content: `DATA SNAPSHOT\n${context}\n\nQUESTION: ${q}` }],
      }),
    });
    if (!res.ok) { console.error("Ask Jack API error", res.status, await res.text()); return NextResponse.json({ fallback: true }, { status: 502 }); }
    const json: any = await res.json();
    const answer = (json.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Ask Jack failed", err);
    return NextResponse.json({ fallback: true }, { status: 502 });
  }
}
