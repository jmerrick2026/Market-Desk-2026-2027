# Market Monitor · MATH 621

A daily market recap, three class portfolios, and auto-generated discussion questions for MATH 621: Quantitative Finance and AI. Prices come live from Yahoo Finance; the yield curve comes from the U.S. Treasury.

## Pages

- **Markets** (`/`): a written read of the session, three Huddle questions, U.S. and world indices, a sector board, rates/dollar/commodities, crypto, and the Treasury yield curve with the 2s10s spread.
- **Portfolios** (`/portfolios`): a leaderboard against SPY, an upcoming earnings calendar, and for each portfolio a value chart vs. SPY plus a holdings table with weights, contribution, earnings dates, and links to each company's latest 10-K on SEC EDGAR.
- **Closing Questions** (`/closing-questions`): end-of-class prompts written from that day's portfolio moves.

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
