import os
import shutil
import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# 1. ІМПОРТУЄМО ТВОЇ КЛАСИ ТА КЛАС НАСТІ
from core.parser import LogParser
from core.processor import FlightProcessor
from services.navigation.fusion import NavigationFusion

app = FastAPI(title="Drone Telemetry API", description="Бекенд для обробки логів дрона")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/api/v1/process-log")
async def process_log(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 2. EXTRACT
        parser = LogParser(file_path)
        gps_raw, imu_raw, att_raw = parser.parse_telemetry()

        if not gps_raw:
            return {"status": "error", "message": "Не знайдено GPS даних у лозі"}

        # 3. TRANSFORM (Для Вані та Святослава)
        full_data = FlightProcessor.convert_to_local_system(gps_raw)

        trajectory_3d_raw = [{"time_s": p["time_s"], "x": p["x"], "y": p["y"], "z": p["z"], "speed": p["speed"]} for p in full_data]
        map_data = [{"time_s": p["time_s"], "lat": p["lat"], "lon": p["lon"], "alt_abs": p["alt_abs"]} for p in full_data]

        # 4. TRANSFORM (Для Насті - підготовка DataFrame)
        df_imu = pd.DataFrame(imu_raw).drop_duplicates(subset=['time_s'], keep='first')
        df_att = pd.DataFrame(att_raw).drop_duplicates(subset=['time_s'], keep='first') if att_raw else pd.DataFrame()

        # ========================================================
        # 5. ІНТЕГРАЦІЯ З НАСТЕЮ
        # ========================================================
        print("Передаю дані в клас NavigationFusion...")
        df_gps = pd.DataFrame(full_data)

        # Адаптуємо твої назви колонок під алгоритм Насті
        df_imu_nastya = df_imu.rename(columns={
            'time_s': 'TimeUS', 'acc_x': 'AccX', 'acc_y': 'AccY', 'acc_z': 'AccZ',
            'gyr_x': 'GyrX', 'gyr_y': 'GyrY', 'gyr_z': 'GyrZ'
        })
        # Її код очікує час у мікросекундах
        df_imu_nastya['TimeUS'] = df_imu_nastya['TimeUS'] * 1e6

        df_gps_nastya = df_gps.rename(columns={
            'time_s': 'TimeUS', 'x': 'x_enu', 'y': 'y_enu', 'z': 'z_enu'
        })
        df_gps_nastya['TimeUS'] = df_gps_nastya['TimeUS'] * 1e6

        # Викликаємо її розрахунки
        fusion_module = NavigationFusion()
        nastya_smart_trajectory = fusion_module.process_flight_data(df_imu_nastya, df_gps_nastya)
        # ========================================================

        # 6. LOAD
        return {
            "status": "success",
            "filename": file.filename,
            "telemetry": {
                "trajectory_3d_smart": nastya_smart_trajectory,
                "trajectory_3d_raw": trajectory_3d_raw,
                "map_data": map_data
            },
            "meta": {
                "points_count": len(trajectory_3d_raw),
                "imu_samples": len(df_imu)
            }
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)