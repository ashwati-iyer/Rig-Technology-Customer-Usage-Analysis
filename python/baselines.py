"""Baselines any ML model must beat on your own history."""
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import HistoricAverage, SeasonalNaive, CrostonOptimized, TSB


def run_baselines(long_df: pd.DataFrame, horizon: int = 12) -> pd.DataFrame:
    """long_df columns: unique_id (part family x region), ds (month start), y (demand)."""
    sf = StatsForecast(models=[HistoricAverage(), SeasonalNaive(season_length=12),
                               CrostonOptimized(), TSB(alpha_d=0.2, alpha_p=0.2)],
                       freq="MS", n_jobs=-1)
    return sf.forecast(df=long_df, h=horizon)
