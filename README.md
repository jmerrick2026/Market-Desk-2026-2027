# Market Monitor · MATH 621

A daily market recap, three class portfolios, and auto-generated discussion questions for MATH 621: Quantitative Finance and AI. Prices come live from Yahoo Finance; the yield curve comes from the U.S. Treasury.

## One page, in sections

- **The Session**: a written read of the day plus three Huddle questions.
- **Macro Trends**: rates, the dollar, oil, copper, gold, VIX and bitcoin over 1 day, 1 week and 1 month; growth vs. value, small vs. large, cyclicals vs. defensives, breadth; 1-month sector rotation.
- **Markets**: U.S. and world indices, the sector board, rates/dollar/commodities ETFs, crypto, and the Treasury yield curve.
- **Micro Trends**: a macro-day vs. micro-day verdict, the week's leaders and laggards among our holdings, stocks near 52-week highs and lows, and unusual volume.
- **Portfolios**: leaderboard vs. SPY, earnings calendar, and each portfolio's chart and holdings with links to 10-K filings.
- **Closing Questions**: end-of-class prompts written from the day's moves.

## Slideshow

Click **Present** in the masthead (or open the site with `?slides=1` at the end of the address). Each section becomes a full-screen slide. Arrow keys or the on-screen arrows move between slides; Esc exits.

Dotted underlined terms show a student-friendly definition on hover or tap.

## Deploy to Vercel (about 10 minutes, no coding)

1. **Put the code on GitHub.** Go to github.com → **New repository** → name it `market-monitor` → **Create**. On the empty repo page, click **uploading an existing file** and drag in everything from this folder.
2. **Import it into Vercel.** Go to vercel.com → **Add New… → Project** → pick the `market-monitor` repo → **Deploy**. No settings to change.
3. **Keep your current web address (optional).** If you want this to replace `financemarketmonitor.vercel.app`, open the *old* project in Vercel → **Settings → Domains**, remove that domain, then add it to the new project under **Settings → Domains**.

Every time you edit a file on GitHub, Vercel redeploys automatically within about a minute.

## Common edits

All in `lib/portfolios.ts` (you can edit it right on github.com with the pencil icon):

- **Real share counts:** change `{ symbol: "NVDA" }` to `{ symbol: "NVDA", shares: 12 }`. Any holding without `shares` is treated as an equal-dollar buy at the inception close, marked with `*` on the site.
- **Cash:** set `cash: 1500` on a portfolio. It counts toward value but earns nothing.
- **Add or remove a stock:** add or delete a `{ symbol: "..." }` line.
- **Start date or starting value:** change `startDate` or `startValue`.
- **Names, course title, byline:** the `SITE` block at the bottom.

Glossary definitions live in `lib/glossary.ts`. Market tickers shown on the Markets page live in the `MARKET` list in `lib/calc.ts`. Colors are at the top of `app/globals.css`.

## Preview without live data

Set the environment variable `DEMO=1` (Vercel: **Settings → Environment Variables**) to show simulated prices. Remove it to go live.

## Run locally (optional)

```
npm install
npm run dev
```

Then open http://localhost:3000.

## Notes

- Yahoo Finance is an unofficial data source: free and reliable for classroom use, delayed about 15 minutes, with no service guarantee. If a ticker fails, the site lists it under "No data for" rather than breaking.
- Earnings dates from Yahoo can be off by a day or two.
- Not investment advice.
