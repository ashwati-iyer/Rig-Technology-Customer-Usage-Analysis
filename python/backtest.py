"""Rolling-origin backtest and the metrics the dashboard should report."""
import numpy as np
import pandas as pd


def wape(actual, forecast):
    return np.abs(actual - forecast).sum() / actual.sum()


def bias(actual, forecast):
    return (forecast - actual).sum() / actual.sum()


def pinball(actual, q_pred, tau):
    d = actual - q_pred
    return np.mean(np.maximum(tau * d, (tau - 1) * d))


def coverage(actual, lo, hi):
    return float(np.mean((actual >= lo) & (actual <= hi)))


def backtest(df, origins, fit_and_forecast, actuals_between, horizon=6):
    """For each origin month: train only on data up to the origin, forecast the next `horizon` months, score."""
    rows = []
    for t0 in origins:
        train = df[df.month_start <= t0]
        fc = fit_and_forecast(train, horizon)
        act = actuals_between(t0, horizon)
        merged = fc.merge(act, on=["family", "month"])
        rows.append({"origin": t0, "wape": wape(merged.actual, merged.p50),
                     "bias": bias(merged.actual, merged.p50),
                     "coverage_80": coverage(merged.actual, merged.p10, merged.p90)})
    return pd.DataFrame(rows)


def skill_vs_baseline(model_wape, baseline_wape):
    """1 means perfect, 0 means no better than the baseline, negative means worse."""
    return 1 - model_wape / baseline_wape
