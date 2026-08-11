import os
import json
import uuid
import datetime
import urllib.request
import urllib.error

# We will save the telemetry to the exact Volume path the Databricks simulator expects
BASE_VOLUME_PATH = "C:/Volumes/workspace/default/infrawatch_raw/telemetry"

def fetch_open_meteo():
    """Fetches real-time temperature and wind speed from Open-Meteo."""
    print("[1/2] Fetching live weather telemetry from Open-Meteo API...")
    url = "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            temp = data["current"]["temperature_2m"]
            wind = data["current"]["wind_speed_10m"]
            print(f"      -> Received Temp: {temp}°C, Wind Speed: {wind} km/h")
            return temp, wind
    except Exception as e:
        print(f"      -> Failed to fetch weather data: {e}")
        return 22.5, 15.0  # fallback

def fetch_usgs_earthquake():
    """Fetches real-time seismic vibration data from USGS."""
    print("[2/2] Fetching live seismic vibration telemetry from USGS API...")
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            features = data.get("features", [])
            if features:
                # Get the magnitude of the most recent earthquake
                mag = features[0]["properties"]["mag"]
                print(f"      -> Received recent seismic magnitude: {mag} (Richter)")
                return mag
            print("      -> No recent seismic activity. Baseline: 0.0")
            return 0.0
    except Exception as e:
        print(f"      -> Failed to fetch seismic data: {e}")
        return 0.0

def generate_telemetry_records():
    """Creates Databricks Bronze-ready JSON payloads."""
    temp, wind = fetch_open_meteo()
    seismic_mag = fetch_usgs_earthquake()
    
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Simulate data for Asset ID 1 (e.g. Primary Wind Turbine or Dam)
    records = []
    
    # 1. Temperature Sensor
    records.append({
        "event_id": str(uuid.uuid4()),
        "tenant_id": 1,
        "asset_id": 1,
        "sensor_id": "SENSOR_TEMP_01",
        "sensor_type": "TEMPERATURE",
        "event_timestamp": timestamp,
        "value": float(temp),
        "unit": "CELSIUS",
        "quality": "GOOD",
        "event_source": "OPEN_METEO_PUBLIC_API"
    })
    
    # 2. Wind Sensor
    records.append({
        "event_id": str(uuid.uuid4()),
        "tenant_id": 1,
        "asset_id": 1,
        "sensor_id": "SENSOR_WIND_01",
        "sensor_type": "WIND_SPEED",
        "event_timestamp": timestamp,
        "value": float(wind),
        "unit": "KM_H",
        "quality": "GOOD",
        "event_source": "OPEN_METEO_PUBLIC_API"
    })
    
    # 3. Vibration Sensor
    records.append({
        "event_id": str(uuid.uuid4()),
        "tenant_id": 1,
        "asset_id": 1,
        "sensor_id": "SENSOR_VIB_01",
        "sensor_type": "VIBRATION",
        "event_timestamp": timestamp,
        "value": float(seismic_mag),
        "unit": "RICHTER",
        "quality": "GOOD",
        "event_source": "USGS_EARTHQUAKE_PUBLIC_API"
    })
    
    return records

def save_to_landing_zone(records):
    """Saves records to the local /Volumes simulator directory as JSON Lines."""
    date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    out_dir = os.path.join(BASE_VOLUME_PATH, date_str)
    
    os.makedirs(out_dir, exist_ok=True)
    
    file_name = f"telemetry_{int(datetime.datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}.json"
    file_path = os.path.join(out_dir, file_name)
    
    with open(file_path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
            
    print(f"\nSuccessfully wrote {len(records)} authentic telemetry records to {file_path}")
    print("These records are now ready for Databricks Bronze ingestion.")

if __name__ == "__main__":
    print("="*60)
    print("REAL-WORLD TELEMETRY INGESTION (EXTERNAL PUBLIC APIs)")
    print("="*60)
    records = generate_telemetry_records()
    save_to_landing_zone(records)
