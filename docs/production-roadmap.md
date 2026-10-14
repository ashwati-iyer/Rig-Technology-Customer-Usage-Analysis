# From synthetic data to a production forecast

The dashboard uses a hand-built, transparent forecast. A production version keeps the same structure and replaces each part with a trained model. Table names and source systems here are assumptions to confirm with data owners.

| Dashboard element | Dashboard version | Production version |
|---|---|---|
| Rig hours | Active or idle state per rig | Telemetry hours plus a rig-activity model with market drivers |
| Wear parts | Hours times cost rate | Tweedie or Poisson GBM with operating hours as exposure |
| Overhaul kits | Probability of crossing an hour threshold | Survival or discrete-time hazard model (`python/hazard_model.py`) |
| Failure parts | Failure rate rising with life used | Poisson GBM on condition and repair history |
| Range band | Backtest error widened by horizon | Monte Carlo from the models, quantile GBM or conformal intervals |
| Accuracy tile | Rolling backtest against a flat average | Forecast snapshots joined to actuals (`fact_forecast_snapshot`) |
| Stock status | Reorder point from forecast and lead time | Service-level policy on simulated lead-time demand |

## Build order

1. Define the grain (unit by month) and build `ml_unit_month` (`sql/queries.sql`).
2. Reproduce the dashboard KPIs in SQL against real tables.
3. Baselines and a rolling-origin backtest (`python/baselines.py`, `python/backtest.py`).
4. Hours-driven expected-value model.
5. Hazard model for overhauls, then Tweedie for consumables.
6. Monte Carlo intervals and stock policy.
7. Hierarchical reconciliation (`hierarchicalforecast`, MinT) and monitoring.

## Data problems to expect

- **Parts not tied to a serial.** Spares are often booked to a customer, not a unit. Use work-order consumption, or allocate by hours and life used, and flag allocated demand.
- **Part supersession.** Roll demand history through `superseded_by` chains.
- **Stock-outs hide demand.** Zero sales during a stock-out is not zero demand. Use backorders and quotes, or mask those periods.
- **Warranty and intercompany transactions.** Separate them from paid demand.
- **Monitored units are a biased sample.** Check the model separately on monitored and unmonitored units.
- **Leakage.** Never use information from after the forecast origin in training features.
- **Small families.** Drawworks and BOPs have few units. Pool features across families instead of fitting separate models.

## Metrics to report

WAPE by family, region and horizon; bias; 80% interval coverage and pinball loss; skill against the baseline; and business outcomes such as stock-outs avoided and excess stock released.
