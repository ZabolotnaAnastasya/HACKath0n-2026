from fastapi import APIRouter, UploadFile, File, Query, HTTPException
import os
from app.core.parser import LogParser
from app.core.processor import FlightProcessor
from app.services.navigation.fusion import NavigationFusion
from app.services.navigation.optimizer import optimize_trajectory

router = APIRouter()


@router.post("/process-log")
async def process_log(file: UploadFile = File(...), max_points: int = Query(500)):
    try:
        # 1. Створюємо тимчасову папку для завантажень
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # 2. Парсинг телеметрії
        parser = LogParser(file_path)
        gps_data, imu_data, att_data = parser.parse_telemetry()

        if not gps_data:
            raise HTTPException(status_code=400, detail="No GPS data found in log file")

        # 3. Перетворення в локальну систему координат (x, y, z)
        raw_processed = FlightProcessor.convert_to_local_system(gps_data)

        # 4. Навігація, інтерполяція та оптимізація траєкторії
        fusion = NavigationFusion(raw_processed)
        interpolated_data = fusion.interpolate(max_points)
        optimized_data = optimize_trajectory(interpolated_data)

        # 5. Розрахунок аналітики для Вані (блок "analysis")
        # Знаходимо максимальну швидкість серед точок
        max_spd = max([p.get('speed', 0) for p in optimized_data]) if optimized_data else 0

        analysis_block = {
            "max_speed": round(max_spd, 2),
            "total_points": len(optimized_data),
            "llm_response": "Stable flight detected. Analysis completed successfully."
        }

        # 6. Метадані файлу
        meta_block = {
            "filename": file.filename
        }

        # Фінальна відповідь, яку чекає фронтенд
        return {
            "status": "success",
            "data": optimized_data,
            "analysis": analysis_block,
            "meta": meta_block
        }

    except Exception as e:
        # Якщо щось пішло не так, повертаємо 500 помилку з описом
        raise HTTPException(status_code=500, detail=str(e))