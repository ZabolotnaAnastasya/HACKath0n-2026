import os
import shutil
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

# ІМПОРТУЄМО ТВОЇ КЛАСИ ТА КЛАСИ НАСТІ
from core.parser import LogParser
from core.processor import FlightProcessor
from services.navigation.fusion import NavigationFusion
from services.navigation.optimizer import optimize_trajectory  # Імпорт гібридного оптимізатора

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
async def process_log(
        file: UploadFile = File(...),
        max_points: int = Query(100, description="Ліміт точок для 3D рендеру")
):
    """
    Головний ендпоінт. Парсить лог, проганяє через фільтр Калмана (UKF)
    та оптимізує 3D траєкторію за допомогою кубічних сплайнів.
    """
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 1. EXTRACT
        parser = LogParser(file_path)
        gps_raw, imu_raw, att_raw = parser.parse_telemetry()

        if not gps_raw:
            return {"status": "error", "message": "Не знайдено GPS даних у лозі"}

        # 2. TRANSFORM
        full_data = FlightProcessor.convert_to_local_system(gps_raw)

        trajectory_3d_raw = [{"time_s": p["time_s"], "x": p["x"], "y": p["y"], "z": p["z"], "speed": p["speed"]} for p
                             in full_data]
        map_data = [{"time_s": p["time_s"], "lat": p["lat"], "lon": p["lon"], "alt_abs": p["alt_abs"]} for p in
                    full_data]

        df_imu = pd.DataFrame(imu_raw).drop_duplicates(subset=['time_s'], keep='first')
        df_gps = pd.DataFrame(full_data)

        # 3. ІНТЕГРАЦІЯ З НАСТЕЮ (UKF Fusion)
        print("Передаю дані в клас NavigationFusion...")

        df_imu_nastya = df_imu.rename(columns={
            'time_s': 'TimeUS', 'acc_x': 'AccX', 'acc_y': 'AccY', 'acc_z': 'AccZ',
            'gyr_x': 'GyrX', 'gyr_y': 'GyrY', 'gyr_z': 'GyrZ'
        })
        df_imu_nastya['TimeUS'] = df_imu_nastya['TimeUS'] * 1e6

        df_gps_nastya = df_gps.rename(columns={
            'time_s': 'TimeUS', 'x': 'x_enu', 'y': 'y_enu', 'z': 'z_enu'
        })
        df_gps_nastya['TimeUS'] = df_gps_nastya['TimeUS'] * 1e6

        fusion_module = NavigationFusion()
        nastya_smart_trajectory = fusion_module.process_flight_data(df_imu_nastya, df_gps_nastya)

        # 4. ОПТИМІЗАЦІЯ ДЛЯ ФРОНТЕНДУ (Сплайни)
        print(f"Оптимізую траєкторію через CubicSpline до {max_points} точок...")

        optimized_smart = optimize_trajectory(nastya_smart_trajectory, target_points=max_points)
        optimized_raw = optimize_trajectory(trajectory_3d_raw, target_points=max_points)

        # 5. LOAD
        return {
            "status": "success",
            "filename": file.filename,
            "telemetry": {
                "trajectory_3d_smart": optimized_smart,
                "trajectory_3d_raw": optimized_raw,
                "map_data": map_data
            },
            "meta": {
                "points_original": len(nastya_smart_trajectory) if nastya_smart_trajectory else len(trajectory_3d_raw),
                "points_optimized": len(optimized_smart),
                "algorithm": "CubicSpline + UKF Fusion",
                "max_points_limit": max_points
            }
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)