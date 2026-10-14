"""Overhaul timing as a discrete-time hazard model (one row per unit-month).
Reference script: expects ml_unit_month.parquet built from sql/queries.sql, plus a life_used_start column."""
import numpy as np
import pandas as pd
import lightgbm as lgb

df = pd.read_parquet("ml_unit_month.parquet").sort_values(["unit_serial", "month_start"])
g = df.groupby("unit_serial")
df["hours_6m"] = g["hours_m"].transform(lambda s: s.rolling(6, min_periods=1).mean())
df["repairs_12m"] = g["repairs_m"].transform(lambda s: s.rolling(12, min_periods=1).sum())
for c in ["family", "rig_type", "region"]:
    df[c] = df[c].astype("category")

FEATS = ["life_used_start", "hours_6m", "repairs_12m", "family", "rig_type", "region"]
# Time-ordered split. Never use a random split on time series.
train = df[df.month_start < "2025-10-01"]
valid = df[(df.month_start >= "2025-10-01") & (df.month_start < "2026-04-01")]

model = lgb.LGBMClassifier(
    n_estimators=600, learning_rate=0.03, num_leaves=31, min_child_samples=40,
    subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
    monotone_constraints=[1, 0, 0, 0, 0, 0],   # more life used -> higher overhaul hazard
)
model.fit(train[FEATS], train["overhaul_m"], eval_set=[(valid[FEATS], valid["overhaul_m"])],
          callbacks=[lgb.early_stopping(50)])


def expected_kit_usd(unit_rows: pd.DataFrame, kit_price: pd.Series, horizon: int = 12) -> np.ndarray:
    """Roll each unit forward. unit_rows holds each unit's current features, one row per unit."""
    survival = np.ones(len(unit_rows))
    out = np.zeros(horizon)
    state = unit_rows.copy()
    for h in range(horizon):
        p = model.predict_proba(state[FEATS])[:, 1]
        out[h] = float((survival * p * kit_price.values).sum())
        survival *= (1 - p)
        state["life_used_start"] += state["hours_6m"] / state["overhaul_interval_hours"]   # project hours forward
    return out
