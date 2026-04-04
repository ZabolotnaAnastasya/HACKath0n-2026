import os
import math
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from app.core.parser import LogParser
from app.core.processor import FlightProcessor

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

        # 2. Парсинг телеметрії (GPS + IMU) [cite: 16, 17]
        parser = LogParser(file_path)
        gps_raw, imu_raw, _ = parser.parse_telemetry()

        if not gps_raw or not imu_raw:
            raise HTTPException(status_code=400, detail="Incomplete telemetry data")

        # 3. Конвертація координат для Вані (WGS-84 -> ENU) [cite: 21]
        full_trajectory = FlightProcessor.convert_to_local_system(gps_raw)

        # =========================================================
        # 4. ЯДРО АНАЛІТИКИ (Алгоритмічна реалізація за ТЗ) [cite: 18, 19]
        # =========================================================

        # А. Дистанція через функцію Haversine
        total_dist = 0
        R = 6371000  # Радіус Землі в метрах
        for i in range(1, len(gps_raw)):
            lat1, lon1 = math.radians(gps_raw[i - 1]['lat']), math.radians(gps_raw[i - 1]['lng'])
            lat2, lon2 = math.radians(gps_raw[i]['lat']), math.radians(gps_raw[i]['lng'])

            dlat = lat2 - lat1
            dlon = lon2 - lon1

            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            total_dist += R * c

        # Б. Швидкості через трапецієвидне інтегрування прискорень
        vx, vy, vz = 0, 0, 0
        max_h_speed = 0
        max_v_speed = 0
        max_accel = 0

        for i in range(1, len(imu_raw)):
            dt = imu_raw[i]['time_s'] - imu_raw[i - 1]['time_s']
            if dt <= 0: continue

            # v_current = v_prev + (a_prev + a_curr) / 2 * dt
            vx += (imu_raw[i - 1]['acc_x'] + imu_raw[i]['acc_x']) / 2 * dt
            vy += (imu_raw[i - 1]['acc_y'] + imu_raw[i]['acc_y']) / 2 * dt
            vz += (imu_raw[i - 1]['acc_z'] + imu_raw[i]['acc_z']) / 2 * dt

            # Розрахунок поточної горизонтальної швидкості
            curr_h_spd = math.sqrt(vx ** 2 + vy ** 2)
            max_h_speed = max(max_h_speed, curr_h_spd)
            max_v_speed = max(max_v_speed, abs(vz))

            # Максимальне прискорення (норма вектора)
            curr_acc = math.sqrt(imu_raw[i]['acc_x'] ** 2 + imu_raw[i]['acc_y'] ** 2 + imu_raw[i]['acc_z'] ** 2)
            max_accel = max(max_accel, curr_acc)

        # В. Додаткові показники місії [cite: 18]
        max_climb = max([p['alt'] for p in gps_raw]) - gps_raw[0]['alt']
        total_duration = imu_raw[-1]['time_s'] - imu_raw[0]['time_s']

        # =========================================================
        # 5. ПАКЕТ ДЛЯ AI-АГЕНТА (Analysis Block)
        # =========================================================
        analysis_block = {
            "max_horizontal_speed": round(max_h_speed, 2),
            "max_vertical_speed": round(max_v_speed, 2),
            "max_acceleration": round(max_accel, 2),
            "max_climb": round(max_climb, 2),
            "total_distance": round(total_dist, 2),
            "total_duration": round(total_duration, 2),
            "llm_response": "Аналіз готовий для передачі AI-агенту."
        }

        # Очищення тимчасового файлу після обробки
        if os.path.exists(file_path):
            os.remove(file_path)

        return {
            "status": "success",
            "data": full_trajectory[:max_points],  # Дані для 3D-карти Вані [cite: 20]
            "analysis": analysis_block,  # Пакет для Агента
            "meta": {
                "filename": file.filename,
                "methods": ["Haversine", "Trapezoidal Integration"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))