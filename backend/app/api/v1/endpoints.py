import os
import math
import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from app.core.parser import LogParser
from app.core.processor import FlightProcessor
from app.services.navigation.fusion import NavigationFusion
from app.services.navigation.optimizer import optimize_trajectory

router = APIRouter()


@router.post("/process-log")
async def process_log(file: UploadFile = File(...), max_points: int = Query(500)):
    try:
        # 1. Збереження файлу
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # 2. ПАРСИНГ
        parser = LogParser(file_path)
        gps_raw, imu_raw, _ = parser.parse_telemetry()

        if not gps_raw or not imu_raw:
            raise HTTPException(status_code=400, detail="Incomplete telemetry data")

        # 3. ПІДГОТОВКА ДАНИХ ДЛЯ FUSION (Anti-REB)
        # Конвертуємо GPS в локальну систему ENU для алгоритмів Святослава
        gps_enu_list = FlightProcessor.convert_to_local_system(gps_raw)

        df_gps = pd.DataFrame(gps_enu_list).rename(columns={
            'x': 'x_enu', 'y': 'y_enu', 'z': 'z_enu', 'time_s': 'time_s_gps'
        })
        # Важливо: Fusion чекає TimeUS для merge_asof
        df_gps['TimeUS'] = [p['timestamp'] for p in gps_raw[len(gps_raw) - len(gps_enu_list):]]

        df_imu = pd.DataFrame(imu_raw)

        # 4. ЗАПУСК РОЗУМНОЇ ФІЛЬТРАЦІЇ (NavigationFusion)
        fusion = NavigationFusion()
        smart_trajectory = fusion.process_flight_data(df_imu, df_gps)

        # Оптимізація сплайнами (плавність + обмеження точок для Вані)
        optimized_data = optimize_trajectory(smart_trajectory, target_points=max_points)

        # 5. ЯДРО АНАЛІТИКИ (Використовуємо ключі 'AccX' як у Святослава)
        total_dist = 0
        R = 6371000
        for i in range(1, len(gps_raw)):
            lat1, lon1 = math.radians(gps_raw[i - 1]['lat']), math.radians(gps_raw[i - 1]['lng'])
            lat2, lon2 = math.radians(gps_raw[i]['lat']), math.radians(gps_raw[i]['lng'])
            a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
            total_dist += R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        # Розрахунок макс. прискорення (використовуємо AccX, AccY, AccZ)
        max_accel = 0
        for p in imu_raw:
            acc = math.sqrt(p['AccX'] ** 2 + p['AccY'] ** 2 + (p['AccZ'] - 9.81) ** 2)
            if acc > max_accel: max_accel = acc

        # 6. ФОРМУВАННЯ ПАКЕТА ДЛЯ АГЕНТА
        analysis_block = {
            "max_horizontal_speed": round(max([p['speed'] for p in smart_trajectory]), 2),
            "max_vertical_speed": round(max([abs(p['speed']) for p in smart_trajectory]), 2),  # спрощено
            "max_acceleration": round(max_accel, 2),
            "max_climb": round(max([p['alt'] for p in gps_raw]) - gps_raw[0]['alt'], 2),
            "total_distance": round(total_dist, 2),
            "total_duration": round(smart_trajectory[-1]['time_s'] - smart_trajectory[0]['time_s'], 2),
            "llm_response": "Аналіз готовий. Використано фільтрацію UKF для Anti-REB."
        }

        if os.path.exists(file_path):
            os.remove(file_path)

        return {
            "status": "success",
            "data": optimized_data,
            "analysis": analysis_block,
            "meta": {"filename": file.filename, "engine": "NavigationFusion + Splines"}
        }

    except Exception as e:
        import traceback
        print(traceback.format_exc())  # Щоб бачити помилку в логах докера
        raise HTTPException(status_code=500, detail=str(e))