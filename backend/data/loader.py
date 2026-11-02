import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd

logger = logging.getLogger("annadata.data_loader")

class DataFileNotFoundError(FileNotFoundError):
    """Raised when a required data file does not exist."""
    pass

class DataValidationError(ValueError):
    """Raised when a dataset does not meet schema or validation requirements."""
    pass

# Expected CSV Column Schemas
CROP_DISEASE_REQUIRED_COLUMNS = [
    "crop",
    "disease",
    "visible_symptoms",
    "prevention_and_first_steps",
    "urgency",
    "next_step"
]

MANDI_PRICE_REQUIRED_COLUMNS = [
    "date",
    "state",
    "market",
    "commodity",
    "min_price_rs_per_quintal",
    "max_price_rs_per_quintal",
    "modal_price_rs_per_quintal",
    "arrivals_tonnes"
]

WEATHER_REQUIRED_DAILY_KEYS = [
    "time",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "relative_humidity_2m_mean"
]

def find_data_directory() -> Path:
    """
    Resolve the data directory relative to this file's location,
    never relying on the shell's current working directory.
    """
    current_file = Path(__file__).resolve()
    
    # Check candidates:
    # 1. <repo_root>/data (e.g. backend/data/loader.py -> ../../../data)
    candidate_root_data = current_file.parent.parent.parent / "data"
    if candidate_root_data.is_dir():
        return candidate_root_data

    # 2. <repo_root>/Resource
    candidate_resource = current_file.parent.parent.parent / "Resource"
    if candidate_resource.is_dir():
        return candidate_resource

    # 3. <backend>/data
    candidate_backend_data = current_file.parent.parent / "data"
    if candidate_backend_data.is_dir():
        return candidate_backend_data

    # Fallback to candidate_root_data even if not yet found
    return candidate_root_data

class DataLoader:
    """
    In-memory singleton cache for Annadata AI datasets.
    Loads and validates datasets once to avoid repeated disk reads.
    """
    _instance: Optional["DataLoader"] = None

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir: Path = data_dir or find_data_directory()
        self._crop_diseases_df: Optional[pd.DataFrame] = None
        self._mandi_prices_df: Optional[pd.DataFrame] = None
        self._weather_sample_dict: Optional[Dict[str, Any]] = None
        self._farmer_queries_list: Optional[List[str]] = None

    @classmethod
    def get_instance(cls, data_dir: Optional[Path] = None) -> "DataLoader":
        if cls._instance is None:
            cls._instance = DataLoader(data_dir=data_dir)
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton for tests or cache busting."""
        cls._instance = None

    def _resolve_file(self, filename: str) -> Path:
        target_path = self.data_dir / filename
        if not target_path.is_file():
            # Check secondary Resource folder as emergency fallback
            alt_path = self.data_dir.parent / "Resource" / filename
            if alt_path.is_file():
                return alt_path
            raise DataFileNotFoundError(
                f"Required data file '{filename}' was not found in directory: {self.data_dir}."
            )
        return target_path

    def load_crop_diseases(self, force_reload: bool = False) -> pd.DataFrame:
        """Loads and validates crop_disease_reference.csv with in-memory caching."""
        if self._crop_diseases_df is not None and not force_reload:
            return self._crop_diseases_df

        file_path = self._resolve_file("crop_disease_reference.csv")
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            raise DataValidationError(f"Failed to parse CSV file '{file_path}': {str(e)}") from e

        # Validate columns
        missing_cols = [col for col in CROP_DISEASE_REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            raise DataValidationError(
                f"crop_disease_reference.csv is missing required columns: {missing_cols}. Found: {df.columns.tolist()}"
            )

        if df.empty:
            raise DataValidationError("crop_disease_reference.csv is empty.")

        self._crop_diseases_df = df
        logger.info("Loaded and cached %d crop disease reference rows", len(df))
        return self._crop_diseases_df

    def load_mandi_prices(self, force_reload: bool = False) -> pd.DataFrame:
        """Loads and validates mandi_prices_bihar_SYNTHETIC.csv with in-memory caching."""
        if self._mandi_prices_df is not None and not force_reload:
            return self._mandi_prices_df

        file_path = self._resolve_file("mandi_prices_bihar_SYNTHETIC.csv")
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            raise DataValidationError(f"Failed to parse CSV file '{file_path}': {str(e)}") from e

        # Validate columns
        missing_cols = [col for col in MANDI_PRICE_REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            raise DataValidationError(
                f"mandi_prices_bihar_SYNTHETIC.csv is missing required columns: {missing_cols}. Found: {df.columns.tolist()}"
            )

        if df.empty:
            raise DataValidationError("mandi_prices_bihar_SYNTHETIC.csv is empty.")

        # Ensure numeric columns are properly typed
        df["min_price_rs_per_quintal"] = pd.to_numeric(df["min_price_rs_per_quintal"], errors="coerce")
        df["max_price_rs_per_quintal"] = pd.to_numeric(df["max_price_rs_per_quintal"], errors="coerce")
        df["modal_price_rs_per_quintal"] = pd.to_numeric(df["modal_price_rs_per_quintal"], errors="coerce")
        df["arrivals_tonnes"] = pd.to_numeric(df["arrivals_tonnes"], errors="coerce")
        df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")

        self._mandi_prices_df = df
        logger.info("Loaded and cached %d mandi price rows", len(df))
        return self._mandi_prices_df

    def load_weather_sample(self, force_reload: bool = False) -> Dict[str, Any]:
        """Loads and validates weather_sample_patna.json with in-memory caching."""
        if self._weather_sample_dict is not None and not force_reload:
            return self._weather_sample_dict

        file_path = self._resolve_file("weather_sample_patna.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            raise DataValidationError(f"Failed to parse JSON file '{file_path}': {str(e)}") from e

        if "daily" not in data or not isinstance(data["daily"], dict):
            raise DataValidationError(f"weather_sample_patna.json is missing required 'daily' dictionary.")

        daily_data = data["daily"]
        missing_keys = [k for k in WEATHER_REQUIRED_DAILY_KEYS if k not in daily_data]
        if missing_keys:
            raise DataValidationError(
                f"weather_sample_patna.json 'daily' object is missing required keys: {missing_keys}."
            )

        self._weather_sample_dict = data
        logger.info("Loaded and cached weather sample with %d daily forecast entries", len(daily_data["time"]))
        return self._weather_sample_dict

    def load_farmer_queries(self, force_reload: bool = False) -> List[str]:
        """Loads farmer_queries_sample.txt with in-memory caching."""
        if self._farmer_queries_list is not None and not force_reload:
            return self._farmer_queries_list

        file_path = self._resolve_file("farmer_queries_sample.txt")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception as e:
            raise DataValidationError(f"Failed to read file '{file_path}': {str(e)}") from e

        # Filter out comments and blank lines
        clean_queries = []
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                # If starts with numbering like '1. ', strip that for raw queries
                clean_queries.append(stripped)

        if not clean_queries:
            raise DataValidationError("farmer_queries_sample.txt does not contain any valid queries.")

        self._farmer_queries_list = clean_queries
        logger.info("Loaded and cached %d sample farmer queries", len(clean_queries))
        return self._farmer_queries_list

    def validate_all(self) -> Dict[str, Any]:
        """Validates all datasets and returns health status dictionary."""
        results = {
            "data_directory": str(self.data_dir),
            "directory_exists": self.data_dir.is_dir(),
            "files": {}
        }

        # Crop Diseases
        try:
            diseases_df = self.load_crop_diseases()
            results["files"]["crop_disease_reference.csv"] = {
                "valid": True,
                "rows": len(diseases_df),
                "columns": diseases_df.columns.tolist()
            }
        except Exception as e:
            results["files"]["crop_disease_reference.csv"] = {
                "valid": False,
                "error": str(e)
            }

        # Mandi Prices
        try:
            mandi_df = self.load_mandi_prices()
            results["files"]["mandi_prices_bihar_SYNTHETIC.csv"] = {
                "valid": True,
                "rows": len(mandi_df),
                "columns": mandi_df.columns.tolist(),
                "commodities": mandi_df["commodity"].dropna().unique().tolist(),
                "markets": mandi_df["market"].dropna().unique().tolist()
            }
        except Exception as e:
            results["files"]["mandi_prices_bihar_SYNTHETIC.csv"] = {
                "valid": False,
                "error": str(e)
            }

        # Weather Sample
        try:
            weather_data = self.load_weather_sample()
            results["files"]["weather_sample_patna.json"] = {
                "valid": True,
                "daily_days": len(weather_data["daily"]["time"]),
                "dates": weather_data["daily"]["time"]
            }
        except Exception as e:
            results["files"]["weather_sample_patna.json"] = {
                "valid": False,
                "error": str(e)
            }

        # Farmer Queries
        try:
            queries = self.load_farmer_queries()
            results["files"]["farmer_queries_sample.txt"] = {
                "valid": True,
                "count": len(queries),
                "sample_queries": queries[:3]
            }
        except Exception as e:
            results["files"]["farmer_queries_sample.txt"] = {
                "valid": False,
                "error": str(e)
            }

        results["all_valid"] = all(item.get("valid", False) for item in results["files"].values())
        return results

# Convenience helper functions
def get_crop_diseases() -> pd.DataFrame:
    return DataLoader.get_instance().load_crop_diseases()

def get_mandi_prices() -> pd.DataFrame:
    return DataLoader.get_instance().load_mandi_prices()

def get_weather_sample() -> Dict[str, Any]:
    return DataLoader.get_instance().load_weather_sample()

def get_farmer_queries() -> List[str]:
    return DataLoader.get_instance().load_farmer_queries()

