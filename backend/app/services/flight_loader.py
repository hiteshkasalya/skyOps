"""Pandas-based flight data loader and normalization pipeline."""
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import pandas as pd
from pydantic import ValidationError

from app.schemas.flight import (
    FlightRecord,
    HistoricalFlightRecord,
    LiveFlightRecord,
    RecordType,
    FlightStatus,
)

logger = logging.getLogger(__name__)


@dataclass
class IngestionResult:
    """Outcome of batch flight ingestion."""
    valid_records: List[Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]] = field(default_factory=list)
    invalid_records: List[Dict[str, Any]] = field(default_factory=list)
    total_rows: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    dataframe: Optional[pd.DataFrame] = None


class FlightDataLoader:
    """Loads, cleans, validates, and normalizes flight dataset batches."""

    COLUMN_MAPPING = {
        "flight_no": "flight_number",
        "flight": "flight_number",
        "flight_num": "flight_number",
        "flt_no": "flight_number",
        "src": "origin_airport",
        "origin": "origin_airport",
        "source": "origin_airport",
        "from": "origin_airport",
        "dest": "destination_airport",
        "destination": "destination_airport",
        "to": "destination_airport",
        "dep_time": "scheduled_departure",
        "departure": "scheduled_departure",
        "sched_dep": "scheduled_departure",
        "arr_time": "scheduled_arrival",
        "arrival": "scheduled_arrival",
        "sched_arr": "scheduled_arrival",
        "act_dep": "actual_departure",
        "act_arr": "actual_arrival",
        "type": "aircraft_type",
        "aircraft": "aircraft_type",
        "reg": "tail_number",
        "registration": "tail_number",
        "tail": "tail_number",
        "delay": "delay_minutes",
        "dep_delay": "delay_minutes",
        "reason": "delay_reason",
    }

    REQUIRED_COLUMNS = [
        "flight_number",
        "origin_airport",
        "destination_airport",
        "scheduled_departure",
        "scheduled_arrival",
    ]

    def __init__(self, default_airline: str = "IndiGo", default_aircraft: str = "A320neo"):
        self.default_airline = default_airline
        self.default_aircraft = default_aircraft

    def load_csv(
        self,
        file_path: Union[str, Path],
        record_type: Optional[RecordType] = None,
    ) -> IngestionResult:
        """Load and normalize flights from a CSV file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Flight dataset not found at: {path}")

        df = pd.read_csv(path, comment="#", skipinitialspace=True, dtype=str)
        return self.normalize_dataframe(df, default_record_type=record_type)

    def normalize_dataframe(
        self,
        df: pd.DataFrame,
        default_record_type: Optional[RecordType] = None,
    ) -> IngestionResult:
        """Normalize and validate an existing pandas DataFrame."""
        total_rows = len(df)
        if total_rows == 0:
            return IngestionResult(total_rows=0, valid_count=0, invalid_count=0)

        # Standardize column headers
        df_clean = df.copy()
        df_clean.columns = [str(c).strip().lower() for c in df_clean.columns]
        df_clean.rename(columns=self.COLUMN_MAPPING, inplace=True)

        valid_records: List[Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]] = []
        invalid_records: List[Dict[str, Any]] = []

        # Check required columns presence
        missing_required_cols = [col for col in self.REQUIRED_COLUMNS if col not in df_clean.columns]
        if missing_required_cols:
            error_msg = f"Dataset missing mandatory columns: {missing_required_cols}"
            logger.error(error_msg)
            for idx, row in df_clean.iterrows():
                invalid_records.append({
                    "row_index": idx,
                    "raw_data": row.to_dict(),
                    "errors": [error_msg],
                })
            return IngestionResult(
                invalid_records=invalid_records,
                total_rows=total_rows,
                valid_count=0,
                invalid_count=total_rows,
            )

        # Parse date fields with error coercion
        date_fields = ["scheduled_departure", "scheduled_arrival", "actual_departure", "actual_arrival"]
        for col in date_fields:
            if col in df_clean.columns:
                df_clean[col] = pd.to_datetime(df_clean[col], utc=True, errors="coerce")

        for idx, row in df_clean.iterrows():
            row_errors: List[str] = []
            row_dict = row.to_dict()

            # 1. Validate mandatory fields
            flight_num = str(row_dict.get("flight_number", "")).strip()
            if not flight_num or pd.isna(row_dict.get("flight_number")):
                row_errors.append("Missing or empty 'flight_number'")

            origin = str(row_dict.get("origin_airport", "")).strip().upper()
            if not origin or len(origin) != 3 or origin == "NAN":
                row_errors.append(f"Invalid origin airport code: '{row_dict.get('origin_airport')}'")

            dest = str(row_dict.get("destination_airport", "")).strip().upper()
            if not dest or len(dest) != 3 or dest == "NAN":
                row_errors.append(f"Invalid destination airport code: '{row_dict.get('destination_airport')}'")

            sched_dep = row_dict.get("scheduled_departure")
            if pd.isna(sched_dep) or not isinstance(sched_dep, (pd.Timestamp, datetime)):
                row_errors.append(f"Invalid or unparseable 'scheduled_departure': {row.get('scheduled_departure')}")

            sched_arr = row_dict.get("scheduled_arrival")
            if pd.isna(sched_arr) or not isinstance(sched_arr, (pd.Timestamp, datetime)):
                row_errors.append(f"Invalid or unparseable 'scheduled_arrival': {row.get('scheduled_arrival')}")

            # Logical timestamp sanity: arrival cannot be before departure
            if not row_errors and sched_arr <= sched_dep:
                row_errors.append("scheduled_arrival must be after scheduled_departure")

            if row_errors:
                invalid_records.append({
                    "row_index": idx,
                    "raw_data": row.to_dict(),
                    "errors": row_errors,
                })
                continue

            # 2. Derive or clean values
            airline = str(row_dict.get("airline", self.default_airline)).strip()
            if not airline or airline == "nan":
                airline = self.default_airline

            aircraft = str(row_dict.get("aircraft_type", self.default_aircraft)).strip()
            if not aircraft or aircraft == "nan":
                aircraft = self.default_aircraft

            tail = row_dict.get("tail_number")
            tail_clean = None if (pd.isna(tail) or str(tail).strip().lower() == "nan") else str(tail).strip().upper()

            gate = row_dict.get("gate")
            gate_clean = None if (pd.isna(gate) or str(gate).strip().lower() == "nan") else str(gate).strip()

            terminal = row_dict.get("terminal")
            terminal_clean = None if (pd.isna(terminal) or str(terminal).strip().lower() == "nan") else str(terminal).strip()

            # Delay minutes coercion
            delay_val = row_dict.get("delay_minutes", 0)
            try:
                delay_minutes = max(0, int(float(delay_val))) if not pd.isna(delay_val) else 0
            except (ValueError, TypeError):
                delay_minutes = 0

            delay_reason = row_dict.get("delay_reason")
            delay_reason_clean = None if (pd.isna(delay_reason) or str(delay_reason).strip().lower() in ["nan", "none", ""]) else str(delay_reason).strip().upper()

            # Status normalization
            raw_status = str(row_dict.get("status", "")).strip().upper()
            status_clean = FlightStatus.DELAYED if delay_minutes > 15 else FlightStatus.ON_TIME
            if raw_status in FlightStatus.__members__:
                status_clean = FlightStatus(raw_status)

            # Record type distinction
            raw_rec_type = row_dict.get("record_type")
            rec_type = default_record_type
            if rec_type is None:
                if pd.notna(raw_rec_type) and str(raw_rec_type).strip().upper() in RecordType.__members__:
                    rec_type = RecordType(str(raw_rec_type).strip().upper())
                else:
                    rec_type = RecordType.HISTORICAL

            # Unique flight ID generation if not provided
            provided_id = row_dict.get("flight_id")
            if pd.notna(provided_id) and str(provided_id).strip() and str(provided_id).strip().lower() != "nan":
                flight_id = str(provided_id).strip()
            else:
                dep_str = sched_dep.strftime("%Y%m%d%H%M")
                flt_clean_id = flight_num.replace(" ", "")
                flight_id = f"{flt_clean_id}-{origin}-{dest}-{dep_str}"

            # Actual timestamps
            act_dep = row_dict.get("actual_departure")
            act_dep_clean = None if pd.isna(act_dep) else act_dep.to_pydantic_datetime() if hasattr(act_dep, "to_pydantic_datetime") else act_dep.to_pydatetime()

            act_arr = row_dict.get("actual_arrival")
            act_arr_clean = None if pd.isna(act_arr) else act_arr.to_pydantic_datetime() if hasattr(act_arr, "to_pydantic_datetime") else act_arr.to_pydatetime()

            sched_dep_dt = sched_dep.to_pydantic_datetime() if hasattr(sched_dep, "to_pydantic_datetime") else sched_dep.to_pydatetime()
            sched_arr_dt = sched_arr.to_pydantic_datetime() if hasattr(sched_arr, "to_pydantic_datetime") else sched_arr.to_pydatetime()

            data_source = str(row_dict.get("data_source", "SYNTHETIC_DEMO")).strip()

            # Construct typed Pydantic record based on record_type
            try:
                if rec_type == RecordType.HISTORICAL:
                    record = HistoricalFlightRecord(
                        flight_id=flight_id,
                        flight_number=flight_num,
                        airline=airline,
                        origin_airport=origin,
                        destination_airport=dest,
                        aircraft_type=aircraft,
                        tail_number=tail_clean,
                        scheduled_departure=sched_dep_dt,
                        scheduled_arrival=sched_arr_dt,
                        actual_departure=act_dep_clean,
                        actual_arrival=act_arr_clean,
                        status=status_clean,
                        delay_minutes=delay_minutes,
                        delay_reason=delay_reason_clean,
                        terminal=terminal_clean,
                        gate=gate_clean,
                        record_type=RecordType.HISTORICAL,
                        data_source=data_source,
                    )
                else:
                    record = LiveFlightRecord(
                        flight_id=flight_id,
                        flight_number=flight_num,
                        airline=airline,
                        origin_airport=origin,
                        destination_airport=dest,
                        aircraft_type=aircraft,
                        tail_number=tail_clean,
                        scheduled_departure=sched_dep_dt,
                        scheduled_arrival=sched_arr_dt,
                        estimated_departure=act_dep_clean or sched_dep_dt,
                        estimated_arrival=act_arr_clean or sched_arr_dt,
                        actual_departure=act_dep_clean,
                        actual_arrival=act_arr_clean,
                        current_status=status_clean,
                        current_delay_minutes=delay_minutes,
                        terminal=terminal_clean,
                        gate=gate_clean,
                        record_type=RecordType.LIVE_TRACKING,
                        data_source=data_source,
                    )
                valid_records.append(record)
            except ValidationError as e:
                invalid_records.append({
                    "row_index": idx,
                    "raw_data": row.to_dict(),
                    "errors": [str(err) for err in e.errors()],
                })

        normalized_df = pd.DataFrame([r.model_dump() for r in valid_records]) if valid_records else pd.DataFrame()

        return IngestionResult(
            valid_records=valid_records,
            invalid_records=invalid_records,
            total_rows=total_rows,
            valid_count=len(valid_records),
            invalid_count=len(invalid_records),
            dataframe=normalized_df,
        )
