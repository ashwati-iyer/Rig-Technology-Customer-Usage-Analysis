# Rig lifecycle and spares intelligence dashboard

An interactive, single-page dashboard that follows a drilling rig's lifecycle (manufacture, sell and install, repair, spares) and turns it into a 12-month spares demand forecast. Built as a portfolio piece for a business data science role in rig technology.

**All data is synthetic.** Equipment names follow public product descriptions, but quantities, prices, customers, dates and failure rates are generated. **Nothing here is NOV data**.

**To check the live website click link in the About section. Thankyou!**

## Structure

| Level | Page | What it answers |
|---|---|---|
| 1 | Overview | Six KPI plates for leadership, forecast with range, three decision signals |
| 2 | Manufacture | Backlog, book-to-bill, on-time delivery, order-level detail |
| 2 | Sell and installed base | Utilisation, age and life used, customer to rig to unit drill-down |
| 2 | Repair | Planned vs unplanned work, failure-rate curve, service centre turnaround, work orders |
| 2 | Spares | Scenario sliders, forecast composition, backtest, part-level stock status |
| 3 | Findings | Insights, recommendations, next steps, closing remarks |

Each KPI plate on the overview links to the drill-down that explains it. Region and rig-type filters apply to every page.

## Run it

No build step is needed to view it. Open `index.html` in a browser.

To edit the source and rebuild the single file:

```bash
python3 build.py          # bundles src/ into index.html
```

## Deploy on GitHub Pages

1. Push the repository to GitHub.
2. Settings, Pages, Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

## Source layout

```
src/data.js       seeded synthetic data and the forecast engine (no DOM code)
src/charts.js     SVG chart helpers, tables, tooltip support
src/pages.js      KPI definitions, insights and the six pages
src/app.js        router, filters, events
src/styles.css    design tokens and layout, light and dark themes
src/template.html page shell
build.py          inlines everything into index.html
sql/              reference schema and queries for a real data build
python/           reference modelling scripts for a real data build
docs/             production roadmap
```

## How the forecast works

For every equipment unit and each future month:

1. Project operating hours from the unit's trailing six-month average, scaled by the utilisation scenario.
2. Wear parts: hours times a family cost rate.
3. Failure parts: a failure rate that rises with the share of the overhaul interval already used.
4. Overhaul kits: the probability that the unit crosses its overhaul threshold that month, given its remaining hours.

Unit forecasts sum to family and company totals. A six-month rolling backtest compares the model with a trailing 12-month average. The range band widens with horizon from the backtest error.

This is a transparent expected-value model, not machine learning. `docs/production-roadmap.md` explains how to replace each part with trained models on real data.

## Notes

- Fonts load from Google Fonts. The page falls back to system fonts offline.
- The data seed is fixed in `src/data.js`, so the dashboard is identical on every load.
