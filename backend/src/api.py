import os
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from scipy.interpolate import interp1d

# Спробуй імпорти БЕЗ src. якщо ти зробив backend Sources Root,
# або ЗАЛИШ з src., якщо запускаєш через Docker.
from core.parser import LogParser
from core.processor import FlightProcessor
from services.navigation.fusion import NavigationFusion
from services.navigation.optimizer import optimize_trajectory

app = FastAPI(title="Drone Telemetry API")

# CORS налаштування
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/api/v1/process-log")
async def process_log(
        file: UploadFile = File(...),
        max_points: int = Query(500, description="Limit points")
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    # Використовуємо прямий запис без shutil
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    try:
        parser = LogParser(file_path)
        gps_raw, imu_raw, _ = parser.parse_telemetry()

        if not gps_raw:
            return {"status": "error", "message": "No GPS data"}

        full_data = FlightProcessor.convert_to_local_system(gps_raw)
        df_imu = pd.DataFrame(imu_raw).drop_duplicates(subset=['time_s'])
        df_gps = pd.DataFrame(full_data)

        df_imu['TimeUS'] = df_imu['time_s'] * 1e6
        df_gps['TimeUS'] = df_gps['time_s'] * 1e6

        fusion_module = NavigationFusion()

        # Перейменування для Насті
        imu_in = df_imu.rename(columns={
            'acc_x': 'AccX', 'acc_y': 'AccY', 'acc_z': 'AccZ',
            'gyr_x': 'GyrX', 'gyr_y': 'GyrY', 'gyr_z': 'GyrZ'
        })
        gps_in = df_gps.rename(columns={'x': 'x_enu', 'y': 'y_enu', 'z': 'z_enu'})

        smart_traj = fusion_module.process_flight_data(imu_in, gps_in)

        # Оптимізація та інтерполяція
        optimized_points = optimize_trajectory(smart_traj, target_points=max_points)

        raw_t = df_gps['time_s'].values
        f_lat = interp1d(raw_t, df_gps['lat'].values, fill_value="extrapolate")
        f_lon = interp1d(raw_t, df_gps['lon'].values, fill_value="extrapolate")
        f_alt = interp1d(raw_t, df_gps['alt_abs'].values, fill_value="extrapolate")

        final_data = []
        for p in optimized_points:
            t = p['time_s']
            final_data.append({
                "x": p['x'], "y": p['y'], "z": p['z'],
                "speed": p['speed'], "time_s": t,
                "lat": float(f_lat(t)), "lon": float(f_lon(t)), "abs_alt": float(f_alt(t))
            })

        return {
            "status": "success",
            "data": final_data,
            "analysis": {
                "max_speed": round(float(max([p['speed'] for p in final_data])), 2),
                "total_points": len(final_data),
                "llm_response": "Stable flight detected."
            },
            "meta": {"filename": file.filename}
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)