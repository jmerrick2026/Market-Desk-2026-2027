// "Giving Back": documented social-impact commitments by companies we own.
// Every line is drawn from the company's own filings or releases, or from reporting on them. Researched Oct 31, 2026.
export type Giving = { s: string; name: string; kind: string; hl: string; body: string; stat: string; statLabel: string; src: { t: string; u: string }[] };

export const GIVING: Giving[] = [
  {
    s: "LLY", name: "Eli Lilly", kind: "Global health", stat: "40M", statLabel: "people reached in 2025",
    hl: "Beat its own 30-million-person goal five years early",
    body: "Lilly 30x30 set out to improve access to quality healthcare for 30 million people a year in resource-limited settings by 2030. Lilly says it finished in 2025, five years ahead of schedule, reaching 40 million, and has followed it with the Change the Course Commitment on diabetes and obesity care in lower-income countries.",
    src: [{ t: "Lilly release on Change the Course", u: "https://lilly.gcs-web.com/node/54966" }, { t: "Lilly 30x30 overview", u: "https://sustainability.lilly.com/social/improving-global-access-and-health" }],
  },
  {
    s: "PFE", name: "Pfizer", kind: "Global health", stat: "45", statLabel: "lower-income countries",
    hl: "Medicines at cost for 1.2 billion people",
    body: "Through An Accord for a Healthier World (2022), Pfizer committed to provide all its current and future patent-protected medicines and vaccines available in the U.S. or EU on a not-for-profit basis to 45 lower-income countries, starting with Rwanda, Ghana, Malawi, Senegal and Uganda.",
    src: [{ t: "Pfizer launch release", u: "https://www.pfizer.com/news/press-release/press-release-detail/pfizer-launches-accord-healthier-world-improve-health" }],
  },
  {
    s: "GILD", name: "Gilead Sciences", kind: "Community health", stat: "~$240M", statLabel: "HIV grants in one year",
    hl: "The largest corporate funder of the fight against HIV",
    body: "Funders Concerned About AIDS found Gilead distributed more than 1,000 HIV-related grants worth almost $240 million in 2021, ranking it the top philanthropic funder of HIV work. Its Zeroing In program funds community groups in the areas hit hardest by the epidemic.",
    src: [{ t: "Gilead on the FCAA ranking", u: "https://www.businesswire.com/news/home/20231024925091/en/" }, { t: "Zeroing In grants", u: "https://www.biospace.com/gilead-sciences-announces-24-million-in-grants-to-help-end-the-hiv-epidemic-for-everyone-everywhere" }],
  },
  {
    s: "VEEV", name: "Veeva Systems", kind: "Corporate structure", stat: "99%", statLabel: "of shareholders voted yes",
    hl: "Wrote purpose into its legal charter",
    body: "In 2021 Veeva became the first public company to convert into a public benefit corporation. Its directors are now legally required to balance shareholders' interests against those of customers, employees and communities, and the company publishes a PBC report every year.",
    src: [{ t: "Veeva 10-K, FY2026", u: "https://www.sec.gov/Archives/edgar/data/1393052/000139305226000014/veev-20260131.htm" }, { t: "Conversion announcement", u: "https://www.biospace.com/veeva-becomes-first-public-company-to-convert-to-a-public-benefit-corporation" }],
  },
  {
    s: "TILE", name: "Interface", kind: "Climate", stat: "2040", statLabel: "carbon-negative target",
    hl: "A mission literally named Climate Take Back",
    body: "The carpet-tile maker built its strategy around giving back more than it takes from the Earth. It built a carbon-negative prototype tile in 2017 and launched commercial cradle-to-gate carbon-negative tiles in 2020. The UN gave it a Climate Action award, and the company is aiming to be carbon negative as a whole by 2040.",
    src: [{ t: "University of Birmingham case study", u: "https://www.birmingham.ac.uk/research/responsible-business/urgent-business-book/the-pioneering-global-corporate-interface" }, { t: "UNFCCC profile", u: "https://unfccc.int/ru/node/254591" }],
  },
  {
    s: "AMZN", name: "Amazon", kind: "Housing", stat: "$3.6B", statLabel: "for 35,000+ affordable homes",
    hl: "Building homes families can afford near where they work",
    body: "Amazon's Housing Equity Fund uses below-market loans and grants to create and preserve affordable housing for households earning 30% to 80% of area median income in Puget Sound, Arlington and Nashville. After passing its first goal of 20,000 homes, Amazon added $1.4 billion in 2024. Most of the housing must remain affordable for a century.",
    src: [{ t: "Amazon $1.4B expansion release", u: "https://www.businesswire.com/news/home/20240610875833/en/Amazon-Adds-$1.4-Billion-to-Housing-Equity-Fund-to-Create-and-Preserve-an-Additional-14000-Affordable-Homes" }, { t: "About the fund", u: "https://www.aboutamazon.com/md/news/community/amazon-housing-equity-fund" }],
  },
  {
    s: "WMT", name: "Walmart", kind: "Communities & hunger", stat: "$2.0B", statLabel: "cash and in-kind, FY2025",
    hl: "Food, disaster relief and local grants at enormous scale",
    body: "Walmart and the Walmart Foundation report giving $2 billion in cash and in-kind donations globally in fiscal 2025, more than 752 million pounds of donated food in the U.S., and about 295,000 hours volunteered by U.S. associates.",
    src: [{ t: "Walmart.org impact", u: "https://walmart.org/" }],
  },
  {
    s: "NVDA", name: "NVIDIA", kind: "Employee giving", stat: "$64M", statLabel: "donations and matching, FY26",
    hl: "The company matches what its people give",
    body: "Through the NVIDIA Foundation's Inspire 365 program, employee donations and company matching reached $64 million in fiscal 2026, supporting about 11,000 nonprofits in more than 70 countries, plus over 122,000 volunteer hours.",
    src: [{ t: "NVIDIA Foundation FY26 report", u: "https://www.nvidia.com/en-gb/foundation/reports/" }],
  },
  {
    s: "MU", name: "Micron Technology", kind: "STEM education", stat: "2.3M", statLabel: "people reached via grants, 2023",
    hl: "Free Chip Camps for the next generation of engineers",
    body: "The Micron Foundation runs free Chip Camps where middle schoolers learn how memory chips are made. Micron says its foundation gave $11.2 million in 2023, with employees adding $2.8 million of their own.",
    src: [{ t: "Micron Gives 2023 summary", u: "https://www.micron.cn/content/dam/micron/global/public/infographics/lgl-fnd-1604508-cy2023-annual-gives-summary.pdf" }, { t: "Chip Camp at CWI", u: "https://cwi.edu/index%2Ephp/news/learn-and-have-fun-stem-micron-chip-camp" }],
  },
  {
    s: "ELF", name: "e.l.f. Beauty", kind: "Profit pledge", stat: "2%", statLabel: "of prior-year profits donated",
    hl: "A standing promise tied to the bottom line",
    body: "e.l.f. pledges at least 2% of the previous year's profits to causes such as board diversity, animal welfare and disaster relief. It calls itself the first beauty company with Fair Trade Certified facilities, and it prices 75% of e.l.f. Cosmetics products under $10.",
    src: [{ t: "e.l.f. FY2025 Impact Report release", u: "https://www.businesswire.com/news/home/20251027943332/zh-CN" }, { t: "e.l.f. company boilerplate", u: "https://investor.elfbeauty.com/stock-and-financial/press-releases/landing-news/2025/01-14-2025-050117116" }],
  },
];
