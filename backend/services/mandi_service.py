import logging
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

from data.loader import get_mandi_prices
from schemas.models import (
    MandiAnalysisResponse,
    MandiComparisonItem,
    MandiOptionItem,
    MandiOptionsResponse,
    MandiTrendResponse,
    PriceHistoryPoint,
)
from utils.hindi import (
    detect_crop_from_text,
    detect_market_from_text,
    format_inr,
    translate_crop,
    translate_market,
)
from utils.safety import MANDATORY_SYNTHETIC_PRICE_DISCLAIMER

logger = logging.getLogger("annadata.mandi_service")

class MandiService:
    """
    Pandas-driven Mandi Price Intelligence Engine.
    All calculations are done strictly in Python/Pandas, never hallucinated by LLM.
    Clearly marks all data as synthetic and provides realistic 7-day/30-day trends.
    """

    def __init__(self):
        self._df: Optional[pd.DataFrame] = None

    @property
    def df(self) -> pd.DataFrame:
        if self._df is None:
            self._df = get_mandi_prices()
        return self._df

    def get_available_commodities(self) -> List[str]:
        """Returns sorted list of available commodities."""
        return sorted(self.df["commodity"].dropna().unique().tolist())

    def get_available_markets(self) -> List[str]:
        """Returns sorted list of available markets."""
        return sorted(self.df["market"].dropna().unique().tolist())

    def get_mandi_options(self) -> MandiOptionsResponse:
        """
        Returns supported crops and Bihar mandis with Hindi translations
        and synthetic data disclaimer.
        """
        crops = self.get_available_commodities()
        mandis = self.get_available_markets()

        crops_formatted = [
            MandiOptionItem(value=c, label_hindi=translate_crop(c))
            for c in crops
        ]
        mandis_formatted = [
            MandiOptionItem(value=m, label_hindi=translate_market(m))
            for m in mandis
        ]

        return MandiOptionsResponse(
            crops=crops,
            crops_formatted=crops_formatted,
            mandis=mandis,
            mandis_formatted=mandis_formatted,
            is_synthetic=True,
            disclaimer=MANDATORY_SYNTHETIC_PRICE_DISCLAIMER
        )

    def _resolve_crop_name(self, crop_input: str) -> str:
        """Resolves user input to exact CSV commodity name, raising ValueError if invalid."""
        if not crop_input or not crop_input.strip():
            raise ValueError("Crop name is required.")

        clean = crop_input.strip()
        available = self.get_available_commodities()

        # Exact case-insensitive match
        for c in available:
            if c.lower() == clean.lower():
                return c

        # Check Hindi/Hinglish aliases (e.g. 'aalu' -> 'Potato', 'pyaaz' -> 'Onion')
        detected = detect_crop_from_text(clean)
        if detected:
            for c in available:
                if c.lower() == detected.lower():
                    return c

        # Substring match (e.g. 'lentil' or 'masoor' matches 'Masoor (lentil)')
        for c in available:
            if clean.lower() in c.lower() or c.lower() in clean.lower():
                return c

        raise ValueError(
            f"Invalid crop '{crop_input}'. Supported crops: {available}"
        )

    def _resolve_market_name(self, market_input: str) -> str:
        """Resolves user input to exact CSV market name, raising ValueError if invalid."""
        if not market_input or not market_input.strip():
            raise ValueError("Market name is required.")

        clean = market_input.strip()
        available = self.get_available_markets()

        # Exact case-insensitive match
        for m in available:
            if m.lower() == clean.lower():
                return m

        # Check Hindi/Hinglish aliases (e.g. 'patna' -> 'Patna', 'arrah' -> 'Ara')
        detected = detect_market_from_text(clean)
        if detected:
            for m in available:
                if m.lower() == detected.lower():
                    return m

        raise ValueError(
            f"Invalid mandi '{market_input}'. Supported Bihar mandis: {available}"
        )

    def analyze_mandi_price(
        self,
        crop: str,
        market: str = "Patna",
        days: int = 30
    ) -> MandiAnalysisResponse:
        """
        Calculates latest price, min/max spread, 7-day & 30-day price trends,
        percentage changes, highest recorded market, and simple sell-now-or-wait explanation.
        All calculations performed via Pandas.
        """
        canonical_crop = self._resolve_crop_name(crop)
        canonical_market = self._resolve_market_name(market)
        trend_days = 7 if days == 7 else 30

        # Filter by commodity and market using Pandas
        sub_df = self.df[
            (self.df["commodity"].str.lower() == canonical_crop.lower()) &
            (self.df["market"].str.lower() == canonical_market.lower())
        ].copy()

        if sub_df.empty:
            raise ValueError(
                f"No price records found for crop '{canonical_crop}' in mandi '{canonical_market}'."
            )

        # Date conversion and sorting
        sub_df["date"] = pd.to_datetime(sub_df["date"]).dt.strftime("%Y-%m-%d")
        sub_df = sub_df.sort_values(by="date", ascending=True).reset_index(drop=True)

        # Group daily records in case of multiple entries per date
        sub_df = sub_df.groupby("date", as_index=False).agg({
            "modal_price_rs_per_quintal": "mean",
            "min_price_rs_per_quintal": "min",
            "max_price_rs_per_quintal": "max",
            "arrivals_tonnes": "sum"
        })

        # Latest record from Pandas
        latest_row = sub_df.iloc[-1]
        latest_date = str(latest_row["date"])
        latest_modal = int(round(float(latest_row["modal_price_rs_per_quintal"])))
        latest_min = int(round(float(latest_row["min_price_rs_per_quintal"])))
        latest_max = int(round(float(latest_row["max_price_rs_per_quintal"])))

        # Seven-day price trend & percentage change (with safe zero division)
        if len(sub_df) >= 7:
            p_7 = float(sub_df.iloc[-7]["modal_price_rs_per_quintal"])
            seven_day_change_pct = round(((latest_modal - p_7) / p_7) * 100, 2) if p_7 > 0 else None
        else:
            seven_day_change_pct = None

        # Thirty-day price trend & percentage change (with safe zero division)
        if len(sub_df) >= 30:
            p_30 = float(sub_df.iloc[-30]["modal_price_rs_per_quintal"])
            thirty_day_change_pct = round(((latest_modal - p_30) / p_30) * 100, 2) if p_30 > 0 else None
        elif len(sub_df) > 1:
            p_start = float(sub_df.iloc[0]["modal_price_rs_per_quintal"])
            thirty_day_change_pct = round(((latest_modal - p_start) / p_start) * 100, 2) if p_start > 0 else None
        else:
            thirty_day_change_pct = None

        # Percentage change for the requested period
        period_change_pct = seven_day_change_pct if trend_days == 7 else thirty_day_change_pct

        # Trend direction label
        if period_change_pct is not None and period_change_pct > 1.5:
            trend_direction = "बढ़त की ओर (Upward)"
        elif period_change_pct is not None and period_change_pct < -1.5:
            trend_direction = "गिरावट की ओर (Downward)"
        else:
            trend_direction = "स्थिर (Stable)"

        # Historical chart data
        history_slice = sub_df.tail(trend_days)
        chart_data = [
            PriceHistoryPoint(
                date=str(r["date"]),
                modal_price=int(round(float(r["modal_price_rs_per_quintal"]))),
                min_price=int(round(float(r["min_price_rs_per_quintal"]))),
                max_price=int(round(float(r["max_price_rs_per_quintal"]))),
                arrivals_tonnes=round(float(r["arrivals_tonnes"]), 1)
            )
            for _, r in history_slice.iterrows()
        ]

        # Cross-Bihar mandi comparisons on their latest available dates
        all_mandis_comparison = self._get_cross_mandi_comparison(canonical_crop, target_modal=latest_modal)

        # Highest recorded modal price among available mandis
        highest_recorded_mandi = None
        if all_mandis_comparison:
            highest_recorded_mandi = max(all_mandis_comparison, key=lambda x: x.latest_modal_price)

        # Formulate Hindi sell-now-or-wait explanation
        crop_hi = translate_crop(canonical_crop)
        mkt_hi = translate_market(canonical_market)
        sell_explanation = self._generate_hindi_explanation(
            crop_hindi=crop_hi,
            market_hindi=mkt_hi,
            trend_days=trend_days,
            current_modal=latest_modal,
            change_pct=period_change_pct,
            highest_mandi=highest_recorded_mandi,
            current_market=canonical_market
        )

        return MandiAnalysisResponse(
            crop=canonical_crop,
            crop_hindi=crop_hi,
            market=canonical_market,
            market_hindi=mkt_hi,
            trend_period_days=trend_days,
            latest_date=latest_date,
            latest_modal_price=latest_modal,
            latest_min_price=latest_min,
            latest_max_price=latest_max,
            seven_day_change_pct=seven_day_change_pct,
            thirty_day_change_pct=thirty_day_change_pct,
            percentage_change=period_change_pct,
            trend_direction=trend_direction,
            highest_recorded_modal_mandi=highest_recorded_mandi,
            nearby_markets_comparison=all_mandis_comparison,
            historical_chart_data=chart_data,
            sell_now_or_wait_explanation=sell_explanation,
            data_source="mandi_prices_bihar_SYNTHETIC.csv (Synthetic demonstration data for build#thon 2026)",
            is_synthetic=True,
            disclaimer=MANDATORY_SYNTHETIC_PRICE_DISCLAIMER
        )

    def _get_cross_mandi_comparison(self, commodity: str, target_modal: int) -> List[MandiComparisonItem]:
        """Compares latest prices of the commodity across all 5 Bihar mandis."""
        comp_df = self.df[self.df["commodity"].str.lower() == commodity.lower()]
        items = []

        for mkt in sorted(comp_df["market"].unique()):
            mkt_sub = comp_df[comp_df["market"] == mkt].sort_values(by="date")
            if not mkt_sub.empty:
                last_r = mkt_sub.iloc[-1]
                modal_p = int(round(float(last_r["modal_price_rs_per_quintal"])))
                items.append(
                    MandiComparisonItem(
                        market=str(mkt),
                        latest_modal_price=modal_p,
                        min_price=int(round(float(last_r["min_price_rs_per_quintal"]))),
                        max_price=int(round(float(last_r["max_price_rs_per_quintal"]))),
                        latest_date=str(last_r["date"]),
                        price_difference_from_target=modal_p - target_modal
                    )
                )
        return items

    def _generate_hindi_explanation(
        self,
        crop_hindi: str,
        market_hindi: str,
        trend_days: int,
        current_modal: int,
        change_pct: Optional[float],
        highest_mandi: Optional[MandiComparisonItem],
        current_market: str
    ) -> str:
        """
        Builds a simple Hindi explanation following the exact problem statement guidelines:
        Plain-language summary of trend, storage costs, nearby mandis comparison, and no guarantee.
        """
        price_str = format_inr(current_modal)

        if change_pct is not None and change_pct > 2.0:
            direction_text = f"वृद्धि ({change_pct}%) दिखाई दे रही है"
            advice_core = "बाजार में मांग अच्छी है, कुछ दिन इंतजार करना फायदेमंद हो सकता है।"
        elif change_pct is not None and change_pct < -2.0:
            direction_text = f"गिरावट ({abs(change_pct)}%) दर्ज की गई है"
            advice_core = "और अधिक गिरावट से बचने के लिए सुविधानुसार बिक्री पर विचार करें।"
        else:
            direction_text = "भाव लगभग स्थिर बना हुआ है"
            advice_core = "बाजार में आवक सामान्य है, आप अपनी सुविधानुसार माल निकाल सकते हैं।"

        explanation = (
            f"पिछले {trend_days} दिनों में {market_hindi} मंडी में {crop_hindi} के भाव में {direction_text} "
            f"(वर्तमान मॉडल भाव {price_str})। {advice_core} लेकिन भविष्य में भाव बढ़ने की कोई गारंटी नहीं है। "
            f"भंडारण लागत और आसपास की मंडियों के भाव की तुलना करें।"
        )

        # Nearby market comparison highlight if another mandi has a better price
        if highest_mandi and highest_mandi.market.lower() != current_market.lower() and highest_mandi.price_difference_from_target > 30:
            h_mkt_hi = translate_market(highest_mandi.market)
            h_price = format_inr(highest_mandi.latest_modal_price)
            diff_price = format_inr(highest_mandi.price_difference_from_target)
            explanation += (
                f" तुलना: {h_mkt_hi} मंडी में {crop_hindi} का भाव {h_price} दर्ज है, जो यहाँ से {diff_price} अधिक है।"
            )

        return explanation

    def get_price_trends(
        self,
        commodity: str,
        market: str = "Patna",
        days: int = 30
    ) -> MandiTrendResponse:
        """Backward-compatible wrapper for existing endpoints."""
        analysis = self.analyze_mandi_price(crop=commodity, market=market, days=days)

        rec = (
            "रुकें (Wait) - भाव में तेजी"
            if (analysis.percentage_change or 0) > 2.0
            else "अभी बेचें (Sell Now) - गिरावट संभव"
            if (analysis.percentage_change or 0) < -2.0
            else "सुविधानुसार बेचें (Stable)"
        )

        return MandiTrendResponse(
            commodity=analysis.crop,
            commodity_hindi=analysis.crop_hindi,
            market=analysis.market,
            market_hindi=analysis.market_hindi,
            latest_date=analysis.latest_date,
            current_modal_price=analysis.latest_modal_price,
            current_min_price=analysis.latest_min_price,
            current_max_price=analysis.latest_max_price,
            seven_day_change_pct=analysis.seven_day_change_pct or 0.0,
            thirty_day_change_pct=analysis.thirty_day_change_pct or 0.0,
            trend_direction=analysis.trend_direction,
            best_nearby_market=analysis.highest_recorded_modal_mandi,
            all_mandis_comparison=analysis.nearby_markets_comparison,
            price_history=analysis.historical_chart_data,
            recommendation=rec,
            sell_or_wait_reasoning=analysis.sell_now_or_wait_explanation,
            is_synthetic=True,
            disclaimer=analysis.disclaimer
        )

# Singleton instance
_mandi_service: Optional[MandiService] = None

def get_mandi_service() -> MandiService:
    global _mandi_service
    if _mandi_service is None:
        _mandi_service = MandiService()
    return _mandi_service
