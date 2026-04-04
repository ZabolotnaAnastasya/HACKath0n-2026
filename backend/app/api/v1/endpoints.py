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

        # 2. ПАРСИНГ (Тепер без помилки __init__)
        parser = LogParser(file_path)  # Передаємо шлях у конструктор
        gps_raw, imu_raw, _ = parser.parse_telemetry()

        if not gps_raw or not imu_raw:
            raise HTTPException(status_code=400, detail="Incomplete telemetry data")

        # 3. Конвертація координат (WGS-84 -> ENU)
        full_trajectory = FlightProcessor.convert_to_local_system(gps_raw)

        # 4. ЯДРО АНАЛІТИКИ (Haversine + Трапеції) [cite: 18, 19]
        # Дистанція (Haversine)
        total_dist = 0
        R = 6371000
        for i in range(1, len(gps_raw)):
            lat1, lon1 = math.radians(gps_raw[i - 1]['lat']), math.radians(gps_raw[i - 1]['lng'])
            lat2, lon2 = math.radians(gps_raw[i]['lat']), math.radians(gps_raw[i]['lng'])
            a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
            total_dist += R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        # Швидкості (Трапеції) [cite: 19]
        vx, vy, vz = 0, 0, 0
        max_h_speed, max_v_speed, max_accel = 0, 0, 0

        for i in range(1, len(imu_raw)):
            dt = imu_raw[i]['time_s'] - imu_raw[i - 1]['time_s']
            if dt <= 0: continue
            vx += (imu_raw[i - 1]['acc_x'] + imu_raw[i]['acc_x']) / 2 * dt
            vy += (imu_raw[i - 1]['acc_y'] + imu_raw[i]['acc_y']) / 2 * dt
            vz += (imu_raw[i - 1]['acc_z'] + imu_raw[i]['acc_z']) / 2 * dt
            max_h_speed = max(max_h_speed, math.sqrt(vx ** 2 + vy ** 2))
            max_v_speed = max(max_v_speed, abs(vz))
            max_accel = max(max_accel,
                            math.sqrt(imu_raw[i]['acc_x'] ** 2 + imu_raw[i]['acc_y'] ** 2 + imu_raw[i]['acc_z'] ** 2))

        # 5. ФОРМУВАННЯ ПАКЕТА ДЛЯ АГЕНТА (Мар'яні) [cite: 25]
        analysis_block = {
            "max_horizontal_speed": round(max_h_speed, 2),
            "max_vertical_speed": round(max_v_speed, 2),
            "max_acceleration": round(max_accel, 2),
            "max_climb": round(max([p['alt'] for p in gps_raw]) - gps_raw[0]['alt'], 2),
            "total_distance": round(total_dist, 2),
            "total_duration": round(imu_raw[-1]['time_s'] - imu_raw[0]['time_s'], 2),
            "llm_response": "Аналіз готовий для передачі AI-агенту."
        }

        if os.path.exists(file_path):
            os.remove(file_path)

        return {
            "status": "success",
            "data": full_trajectory[:max_points],
            "analysis": analysis_block,
            "meta": {"filename": file.filename}
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))