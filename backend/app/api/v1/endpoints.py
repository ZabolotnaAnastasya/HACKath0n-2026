import os
import math
import pandas as pd
import traceback
from fastapi import APIRouter, UploadFile, File, Query, HTTPException

from app.core.parser import LogParser
from app.core.processor import FlightProcessor
from app.services.navigation.fusion import NavigationFusion
from app.services.navigation.optimizer import optimize_trajectory
from app.services.n8n_service import get_ai_analysis

router = APIRouter()


@router.post("/process-log")
async def process_log(file: UploadFile = File(...), max_points: int = Query(500)):
    file_path = None
    try:
        print(f"🚀 Отримано файл: {file.filename}. Починаємо обробку...")
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        # Збереження файлу
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # 1. ПАРСИНГ
        print("⏳ 1/5: Парсинг телеметрії...")
        parser = LogParser(file_path)
        gps_raw, imu_raw, _ = parser.parse_telemetry()

        if not gps_raw or not imu_raw:
            raise HTTPException(status_code=400, detail="Incomplete telemetry data")

        # 2. ПІДГОТОВКА ДАНИХ
        print(f"⏳ 2/5: Підготовка даних (GPS: {len(gps_raw)}, IMU: {len(imu_raw)})...")
        # FlightProcessor тепер використовує TimeUS всередині
        gps_enu_list = FlightProcessor.convert_to_local_system(gps_raw)

        flight_gps_raw = gps_raw[-len(gps_enu_list):] if gps_enu_list else gps_raw

        df_gps = pd.DataFrame(flight_gps_raw)
        df_enu = pd.DataFrame(gps_enu_list)

        if not df_gps.empty and not df_enu.empty:
            df_gps['x_enu'] = df_enu['x'].values
            df_gps['y_enu'] = df_enu['y'].values
            df_gps['z_enu'] = df_enu['z'].values

        df_imu = pd.DataFrame(imu_raw)

        # 3. Ф'ЮЖН ТА ОПТИМІЗАЦІЯ
        print("⏳ 3/5: Запуск NavigationFusion...")
        fusion = NavigationFusion()
        smart_trajectory = fusion.process_flight_data(df_imu, df_gps)

        print("⏳ Згладжування сплайнами...")
        optimized_data = optimize_trajectory(smart_trajectory, target_points=max_points)

        # 4. АНАЛІТИКА
        print("⏳ 4/5: Розрахунок аналітики...")

        # Дистанція (Haversine)
        total_dist = 0
        R = 6371000
        for i in range(1, len(gps_raw)):
            p1, p2 = gps_raw[i - 1], gps_raw[i]
            lat1, lon1 = math.radians(p1.get('lat', 0)), math.radians(p1.get('lng', 0))
            lat2, lon2 = math.radians(p2.get('lat', 0)), math.radians(p2.get('lng', 0))
            a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
            total_dist += R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        # Максимальне прискорення
        max_accel = 0
        if imu_raw:
            accels = []
            for p in imu_raw:
                # Використовуємо .get() для запобігання KeyError
                ax, ay, az = p.get('AccX', 0), p.get('AccY', 0), p.get('AccZ', 9.81)
                accels.append(math.sqrt(ax ** 2 + ay ** 2 + (az - 9.81) ** 2))
            max_accel = max(accels) if accels else 0

        # ТРИВАЛІСТЬ (ВИПРАВЛЕНО: TimeUS замість time_s)
        duration = 0
        if imu_raw:
            t_start = imu_raw[0].get('TimeUS', 0)
            t_end = imu_raw[-1].get('TimeUS', 0)
            duration = (t_end - t_start) / 1_000_000.0

        analysis_block = {
            "max_horizontal_speed_ms": round(max([p.get('speed', 0) for p in optimized_data]) if optimized_data else 0,
                                             2),
            "max_vertical_speed_ms": round(
                max([abs(p.get('speed', 0)) for p in smart_trajectory]) if smart_trajectory else 0, 2),
            "max_acceleration_m_s2": round(max_accel, 2),
            "max_climb_ms": round(max([p.get('alt', 0) for p in gps_raw]) - gps_raw[0].get('alt', 0) if gps_raw else 0,
                                  2),
            "total_distance_m": round(total_dist, 2),
            "total_duration_sec": round(duration, 2),
        }

        # 5. AI АГЕНТ
        print("⏳ 5/5: Виклик ai_report...")
        ai_report = "AI report unavailable"
        try:
            ai_report = get_ai_analysis(telemetry_data=analysis_block)
        except Exception as ai_err:
            print(f"⚠️ n8n error: {ai_err}")

        if os.path.exists(file_path):
            os.remove(file_path)

        print("✅ Готово!")
        return {
            "status": "success",
            "data": optimized_data,
            "analysis": analysis_block,
            "ai_analysis": ai_report,
            "meta": {"filename": file.filename, "engine": "NavigationFusion + Splines"}
        }

    except Exception as e:
        print("❌ Помилка:")
        print(traceback.format_exc())
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))