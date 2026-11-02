import pytest
import pandas as pd
from fastapi import HTTPException
from data.loader import find_data_directory
from main import get_mandi_options, analyze_mandi_price
from schemas.models import MandiAnalysisRequest
from services.mandi_service import get_mandi_service

@pytest.fixture
def mandi_service():
    return get_mandi_service()

@pytest.fixture
def raw_df():
    data_dir = find_data_directory()
    return pd.read_csv(data_dir / "mandi_prices_bihar_SYNTHETIC.csv")

# 1. Test Mandi Options Endpoint
def test_mandi_options_endpoint(mandi_service):
    opts = mandi_service.get_mandi_options()
    assert len(opts.crops) == 7
    assert len(opts.mandis) == 5
    assert "Potato" in opts.crops
    assert "Patna" in opts.mandis
    assert opts.is_synthetic is True
    assert "कृत्रिम" in opts.disclaimer or "Synthetic" in opts.disclaimer

    endpoint_res = get_mandi_options()
    assert len(endpoint_res.crops) == 7
    assert len(endpoint_res.mandis) == 5

# 2. Test Potato in Patna (30-day trend)
def test_potato_in_patna(mandi_service, raw_df):
    req = MandiAnalysisRequest(crop="Potato", market="Patna", days=30)
    res = analyze_mandi_price(req)

    # Independent Pandas calculation
    patna_potato = raw_df[(raw_df["commodity"] == "Potato") & (raw_df["market"] == "Patna")].sort_values("date")
    last_row = patna_potato.iloc[-1]
    expected_modal = int(last_row["modal_price_rs_per_quintal"])
    expected_min = int(last_row["min_price_rs_per_quintal"])
    expected_max = int(last_row["max_price_rs_per_quintal"])
    expected_date = str(last_row["date"])

    p_7 = float(patna_potato.iloc[-7]["modal_price_rs_per_quintal"])
    p_30 = float(patna_potato.iloc[-30]["modal_price_rs_per_quintal"])
    expected_chg_7 = round(((expected_modal - p_7) / p_7) * 100, 2)
    expected_chg_30 = round(((expected_modal - p_30) / p_30) * 100, 2)

    assert res.crop == "Potato"
    assert res.market == "Patna"
    assert res.latest_date == expected_date == "2026-10-24"
    assert res.latest_modal_price == expected_modal == 1108
    assert res.latest_min_price == expected_min == 995
    assert res.latest_max_price == expected_max == 1223
    assert res.seven_day_change_pct == expected_chg_7 == -1.6
    assert res.thirty_day_change_pct == expected_chg_30 == 8.95
    assert res.percentage_change == 8.95
    assert len(res.nearby_markets_comparison) == 5

    # Highest modal among Bihar mandis for Potato is Bihar Sharif (1296)
    assert res.highest_recorded_modal_mandi is not None
    assert res.highest_recorded_modal_mandi.market == "Bihar Sharif"
    assert res.highest_recorded_modal_mandi.latest_modal_price == 1296

    # Simple Hindi explanation check
    assert "आलू" in res.sell_now_or_wait_explanation
    assert "गारंटी नहीं" in res.sell_now_or_wait_explanation
    assert "भंडारण लागत" in res.sell_now_or_wait_explanation
    assert res.is_synthetic is True

# 3. Test Onion in Hajipur (7-day trend)
def test_onion_in_hajipur(mandi_service, raw_df):
    req = MandiAnalysisRequest(crop="Onion", market="Hajipur", days=7)
    res = analyze_mandi_price(req)

    # Independent Pandas calculation
    hajipur_onion = raw_df[(raw_df["commodity"] == "Onion") & (raw_df["market"] == "Hajipur")].sort_values("date")
    last_row = hajipur_onion.iloc[-1]
    expected_modal = int(last_row["modal_price_rs_per_quintal"])
    expected_min = int(last_row["min_price_rs_per_quintal"])
    expected_max = int(last_row["max_price_rs_per_quintal"])

    p_7 = float(hajipur_onion.iloc[-7]["modal_price_rs_per_quintal"])
    expected_chg_7 = round(((expected_modal - p_7) / p_7) * 100, 2)

    assert res.crop == "Onion"
    assert res.market == "Hajipur"
    assert res.latest_modal_price == expected_modal == 2099
    assert res.latest_min_price == expected_min == 1891
    assert res.latest_max_price == expected_max == 2195
    assert res.seven_day_change_pct == expected_chg_7 == 9.67
    assert res.percentage_change == 9.67
    assert "बढ़त" in res.trend_direction

# 4. Test Wheat in Ara (30-day trend)
def test_wheat_in_ara(mandi_service, raw_df):
    req = MandiAnalysisRequest(crop="Wheat", market="Ara", days=30)
    res = analyze_mandi_price(req)

    # Independent Pandas calculation
    ara_wheat = raw_df[(raw_df["commodity"] == "Wheat") & (raw_df["market"] == "Ara")].sort_values("date")
    last_row = ara_wheat.iloc[-1]
    expected_modal = int(last_row["modal_price_rs_per_quintal"])
    expected_min = int(last_row["min_price_rs_per_quintal"])
    expected_max = int(last_row["max_price_rs_per_quintal"])

    p_30 = float(ara_wheat.iloc[-30]["modal_price_rs_per_quintal"])
    expected_chg_30 = round(((expected_modal - p_30) / p_30) * 100, 2)

    assert res.crop == "Wheat"
    assert res.market == "Ara"
    assert res.latest_modal_price == expected_modal == 2448
    assert res.latest_min_price == expected_min == 2184
    assert res.latest_max_price == expected_max == 2576
    assert res.thirty_day_change_pct == expected_chg_30 == 0.7
    assert res.percentage_change == 0.7
    assert "स्थिर" in res.trend_direction

# 5. Test Invalid Crop Handling
def test_invalid_crop():
    req = MandiAnalysisRequest(crop="Pineapple", market="Patna", days=30)
    with pytest.raises(HTTPException) as exc_info:
        analyze_mandi_price(req)
    assert exc_info.value.status_code == 404
    assert "Invalid crop" in exc_info.value.detail
    assert "Pineapple" in exc_info.value.detail

# 6. Test Invalid Mandi Handling
def test_invalid_mandi():
    req = MandiAnalysisRequest(crop="Potato", market="Kolkata", days=30)
    with pytest.raises(HTTPException) as exc_info:
        analyze_mandi_price(req)
    assert exc_info.value.status_code == 404
    assert "Invalid mandi" in exc_info.value.detail
    assert "Kolkata" in exc_info.value.detail

# 7. Safe Zero Division Handling
def test_zero_price_safety(mandi_service, monkeypatch):
    # Create artificial dataframe with 0 price in history
    zero_df = mandi_service.df.copy()
    zero_df.loc[
        (zero_df["commodity"] == "Potato") & (zero_df["market"] == "Patna"),
        "modal_price_rs_per_quintal"
    ] = 0

    monkeypatch.setattr(mandi_service, "_df", zero_df)

    res = mandi_service.analyze_mandi_price(crop="Potato", market="Patna", days=30)
    # Zero division was prevented safely
    assert res.seven_day_change_pct is None
    assert res.thirty_day_change_pct is None
    assert res.percentage_change is None

