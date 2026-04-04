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
        # Створюємо тимчасову папку для завантажень, якщо її нема
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # 1. Парсинг (ВИПРАВЛЕНІ НАЗВИ МЕТОДІВ)
        parser = LogParser(file_path)
        gps_data, imu_data, att_data = parser.parse_telemetry()
        raw_data = gps_data  # Беремо GPS координати для Вані

        # 2. Обробка (ВИПРАВЛЕНА НАЗВА МЕТОДУ)
        processed_data = FlightProcessor.convert_to_local_system(raw_data)

        # 3. Навігація та Оптимізація
        fusion = NavigationFusion(processed_data)
        final_data = fusion.interpolate(max_points)

        optimized_data = optimize_trajectory(final_data)

        return {
            "status": "success",
            "points_count": len(optimized_data),
            "data": optimized_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))