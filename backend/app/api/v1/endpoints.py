import os
import math
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Query, HTTPException

from app.core.parser import LogParser
from app.core.processor import FlightProcessor
from app.services.navigation.fusion import NavigationFusion
from app.services.navigation.optimizer import optimize_trajectory

from app.services.n8n_service import get_ai_analysis
router = APIRouter()


@router.post("/process-log")
async def process_log(file: UploadFile = File(...), max_points: int = Query(500)):
    try:
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # 1. ПАРСИНГ
        parser = LogParser(file_path)
        gps_raw, imu_raw, _ = parser.parse_telemetry()

        if not gps_raw or not imu_raw:
            raise HTTPException(status_code=400, detail="Incomplete telemetry data")

        # 2. ПІДГОТОВКА ДАНИХ ДЛЯ ФІЛЬТРАЦІЇ
        gps_enu_list = FlightProcessor.convert_to_local_system(gps_raw)

        # FlightProcessor відрізає частину точок (до зльоту), тому беремо тільки актуальні GPS
        flight_gps_raw = gps_raw[-len(gps_enu_list):] if gps_enu_list else gps_raw

        df_gps = pd.DataFrame(flight_gps_raw)
        df_enu = pd.DataFrame(gps_enu_list)

        # Зшиваємо координати ENU у загальний датафрейм GPS
        if not df_gps.empty and not df_enu.empty:
            df_gps['x_enu'] = df_enu['x']
            df_gps['y_enu'] = df_enu['y']
            df_gps['z_enu'] = df_enu['z']

        df_imu = pd.DataFrame(imu_raw)

        # 3. АЛГОРИТМИ СВЯТОСЛАВА: ЗЛИття ТА ОПТИМІЗАЦІЯ
        fusion = NavigationFusion()
        smart_trajectory = fusion.process_flight_data(df_imu, df_gps)
        optimized_data = optimize_trajectory(smart_trajectory, target_points=max_points)

        # 4. АНАЛІТИКА ДЛЯ AI-АГЕНТА
        total_dist = 0
        R = 6371000
        for i in range(1, len(gps_raw)):
            lat1, lon1 = math.radians(gps_raw[i - 1]['lat']), math.radians(gps_raw[i - 1]['lng'])
            lat2, lon2 = math.radians(gps_raw[i]['lat']), math.radians(gps_raw[i]['lng'])
            a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
            total_dist += R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        max_accel = 0
        if imu_raw:
            max_accel = max([math.sqrt(p['AccX'] ** 2 + p['AccY'] ** 2 + (p['AccZ'] - 9.81) ** 2) for p in imu_raw])

        analysis_block = {
            "max_horizontal_speed": round(max([p['speed'] for p in optimized_data]) if optimized_data else 0, 2),
            "max_acceleration": round(max_accel, 2),
            "max_climb": round(max([p['alt'] for p in gps_raw]) - gps_raw[0]['alt'] if gps_raw else 0, 2),
            "total_distance": round(total_dist, 2),
            "total_duration": round(imu_raw[-1]['time_s'] - imu_raw[0]['time_s'] if imu_raw else 0, 2),
            "llm_response": "Аналіз готовий. Використано фільтрацію UKF (злиття GPS+IMU) та оптимізацію кубічними сплайнами."
        }

        ai_report = get_ai_analysis(telemetry_data=analysis_block) # виклик n8n для генерації звіту ШІ

        # Видаляємо тимчасовий файл
        if os.path.exists(file_path):
            os.remove(file_path)

        return {
            "status": "success",
            "data": optimized_data,
            "analysis": analysis_block,
            "ai_analysis": ai_report,
            "data": optimized_data,  # Ваня отримає плавні, ідеальні дані
            "analysis": analysis_block,  # ШІ отримає чіткі метрики
            "meta": {"filename": file.filename, "engine": "NavigationFusion + Splines"}
        }

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))