import os
import shutil
import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
import math

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


def optimize_trajectory(trajectory: list, max_points: int) -> list:
    """Розумний фільтр: залишає GPS-точки та точки з найбільшою зміною (похідною)"""
    if len(trajectory) <= max_points or max_points <= 0:
        return trajectory

    # 1. Обов'язкові точки (старт, кінець і GPS)
    essential_points = [p for p in trajectory if p.get('is_gps_step', False)]
    essential_points.append(trajectory[0])
    essential_points.append(trajectory[-1])

    # Видаляємо дублікати з обов'язкових (по time_s)
    essential_dict = {p['time_s']: p for p in essential_points}

    # 2. Якщо обов'язкових точок вже більше ніж треба - просто повертаємо їх
    if len(essential_dict) >= max_points:
        return sorted(list(essential_dict.values()), key=lambda p: p['time_s'])

    # 3. Рахуємо "похідну" (відстань від попередньої точки) для решти точок
    other_points = []
    for i in range(1, len(trajectory) - 1):
        curr = trajectory[i]
        if curr['time_s'] in essential_dict:
            continue  # Пропускаємо ті, що вже зберегли

        prev = trajectory[i - 1]
        # Різниця координат (dx, dy, dz)
        dx = curr['x'] - prev['x']
        dy = curr['y'] - prev['y']
        dz = curr['z'] - prev['z']

        # Величина зміни (модуль вектора)
        derivative = math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)

        # Зберігаємо точку разом з її похідною
        curr_copy = curr.copy()
        curr_copy['_derivative'] = derivative
        other_points.append(curr_copy)

    # 4. Сортуємо по похідній (від найбільших змін до найменших)
    other_points.sort(key=lambda p: p['_derivative'], reverse=True)

    # 5. Добираємо найважливіші точки до потрібного ліміту
    points_needed = max_points - len(essential_dict)
    selected_others = other_points[:points_needed]

    # Прибираємо тимчасовий ключ '_derivative'
    for p in selected_others:
        del p['_derivative']

    # 6. Збираємо все докупи і сортуємо хронологічно
    final_trajectory = list(essential_dict.values()) + selected_others
    return sorted(final_trajectory, key=lambda p: p['time_s'])

@app.post("/api/v1/process-log")
async def process_log(
    file: UploadFile = File(...),
    max_points: int = Query(1000, description="Максимальна кількість точок 3D-траєкторії для фронтенду")
):
    """
    Головний ендпоінт. Парсить лог, обробляє координати, проганяє через фільтр Калмана
    та оптимізує кількість точок для плавного рендеру на фронтенді.
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

        # 2. TRANSFORM (Для фронтенду: перевід у метри)
        full_data = FlightProcessor.convert_to_local_system(gps_raw)

        trajectory_3d_raw = [{"time_s": p["time_s"], "x": p["x"], "y": p["y"], "z": p["z"], "speed": p["speed"]} for p in full_data]
        map_data = [{"time_s": p["time_s"], "lat": p["lat"], "lon": p["lon"], "alt_abs": p["alt_abs"]} for p in full_data]

        # 3. TRANSFORM (Підготовка DataFrame для Насті)
        df_imu = pd.DataFrame(imu_raw).drop_duplicates(subset=['time_s'], keep='first')
        df_gps = pd.DataFrame(full_data)

        # 4. ІНТЕГРАЦІЯ З НАСТЕЮ (UKF)
        print("Передаю дані в клас NavigationFusion...")

        # Адаптація колонок під математику
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

        # 5. ОПТИМІЗАЦІЯ ДЛЯ ФРОНТЕНДУ (Downsampling)
        print(f"Оптимізую траєкторію до {max_points} точок...")
        optimized_smart = optimize_trajectory(nastya_smart_trajectory, max_points)
        optimized_raw = optimize_trajectory(trajectory_3d_raw, max_points)

        # 6. LOAD
        return {
            "status": "success",
            "filename": file.filename,
            "telemetry": {
                "trajectory_3d_smart": optimized_smart,  # Відфільтрована математика Насті
                "trajectory_3d_raw": optimized_raw,      # Відфільтровані сирі дані
                "map_data": map_data                     # Дані для 2D карти (без фільтрації)
            },
            "meta": {
                "points_original": len(nastya_smart_trajectory) if nastya_smart_trajectory else len(trajectory_3d_raw),
                "points_optimized": len(optimized_smart),
                "max_points_limit": max_points,
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