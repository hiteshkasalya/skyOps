# SkyOps Dataset Provenance & Data Dictionary

## 1. Research Paper Dataset Investigation

During project planning, an academic aircraft-routing optimization paper was discussed as a potential source for IndiGo tail-number and routing schedules. We conducted an audit to verify the dataset's availability:

- **Original Source**: Academic studies on aircraft routing and tail assignment in India typically draw from:
  1. Proprietary airline operations databases (direct non-disclosure agreements with carriers like IndiGo / InterGlobe Aviation Ltd.).
  2. Aggregated operational reports from the Directorate General of Civil Aviation (DGCA India).
  3. ADS-B flight tracker archives (e.g. OpenSky Network, FlightRadar24).
- **Public Availability**: The specific raw operational schedule and routing dataset with tail numbers used in academic aircraft-routing literature is **not publicly available** for direct open-access download. Proprietary airline flight dispatch data is protected by corporate privacy constraints and commercial aviation confidentiality.
- **Licence Status**:
  - Official DGCA statistics are public under India's Open Government Data (OGD) framework for aggregated analytics.
  - Airline commercial flight operations data remains proprietary to InterGlobe Aviation Ltd. (IndiGo).
- **Policy Compliance**: Per SkyOps engineering guidelines, we do **not** invent download URLs or fabricate claims regarding public availability of proprietary airline data.

---

## 2. Synthetic Demo Dataset: `synthetic_indigo_flights_demo.csv`

To enable immediate, reproducible testing and prototype validation without violating licensing constraints or relying on unavailable external URLs, a synthetic demo dataset is provided:

- **File**: `backend/data/synthetic_indigo_flights_demo.csv`
- **Classification**: **Synthetic Demo Data (Clearly Labelled)**
- **Origin**: Synthesized based on real-world Indian domestic routes (DEL, BOM, BLR, CCU, HYD), typical IndiGo Airbus A320neo / A321neo fleet configurations, and standard turnaround intervals.
- **Licence**: Creative Commons Zero (CC0) / Public Domain for project testing.
- **Purpose**: Facilitate end-to-end ingestion pipeline development, normalization logic, conflict detection testing, and demo execution.

---

## 3. Schema & Column Specifications

The synthetic CSV adheres to the following column layout:

| Column | Type | Example | Description |
|---|---|---|---|
| `flight_id` | string | `6E-204-DEL-BOM-20261012` | Unique composite identifier |
| `flight_number` | string | `6E 204` | IATA airline code + route flight number |
| `airline` | string | `IndiGo` | Operating airline name |
| `origin_airport` | string (3-letter) | `DEL` | Origin IATA code |
| `destination_airport` | string (3-letter) | `BOM` | Destination IATA code |
| `aircraft_type` | string | `A321neo` | Aircraft ICAO/IATA type designator |
| `tail_number` | string | `VT-IMG` | Aircraft registration / tail number |
| `scheduled_departure` | ISO 8601 string | `2026-10-12T08:00:00Z` | Scheduled time of departure |
| `scheduled_arrival` | ISO 8601 string | `2026-10-12T10:15:00Z` | Scheduled time of arrival |
| `actual_departure` | ISO 8601 string | `2026-10-12T08:45:00Z` | Actual or projected departure time |
| `actual_arrival` | ISO 8601 string | `2026-10-12T11:00:00Z` | Actual or projected arrival time |
| `status` | string | `DELAYED` | Operational status (`ON_TIME`, `DELAYED`, `BOARDING`, `ARRIVED`) |
| `delay_minutes` | integer | `45` | Departure delay in minutes |
| `delay_reason` | string | `LATE_INBOUND_AIRCRAFT` | Operational delay classification |
| `terminal` | string | `T3` | Assigned airport terminal |
| `gate` | string | `42` | Assigned gate |
| `record_type` | string | `HISTORICAL` | Record category: `HISTORICAL` vs `LIVE_TRACKING` |
| `data_source` | string | `SYNTHETIC_DEMO` | Provenance marker |

---

## 4. Separation of Historical vs. Live Tracking Data

SkyOps strictly distinguishes between:
1. **Historical Records (`record_type = HISTORICAL`)**:
   - Represents completed flights or fixed schedule timetables.
   - Immutable baseline used for statistical modeling, turnaround baseline calculations, and ML model training.
2. **Live Tracking Data (`record_type = LIVE_TRACKING`)**:
   - Dynamic operational state with real-time ETA adjustments, live gate changes, and active conflict alerts.
   - Ephemeral and subject to rapid updates from live event feeds or WebSocket pushes.

---

## 5. Limitations

- The dataset contains synthetic operational parameters and timestamps designed specifically for the demonstration environment.
- It does not represent actual real-time positions from active ADS-B transponders.
- Live operations will require integration with certified live data providers (e.g. FlightAware Firehose, OpenSky live network, or direct airline API feeds).
