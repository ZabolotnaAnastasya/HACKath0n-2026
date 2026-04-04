import os
import json
import sys
import pandas as pd
import numpy as np
import io
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')
# Додаємо шлях до модулів
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.parser import LogParser
from core.processor import FlightProcessor
# --- НОВІ ІМПОРТИ ---
from services.navigation.fusion import NavigationFusion
from services.navigation.optimizer import optimize_trajectory

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(base_dir, "data", "00000001.BIN")

VANYA_OUTPUT = os.path.join(base_dir, "data", "to_vanya.json")
SVIAT_OUTPUT = os.path.join(base_dir, "data", "to_sviat.json")
NASTYA_OUTPUT = os.path.join(base_dir, "data", "to_nastya.csv")
NASTYA_ATT_OUTPUT = os.path.join(base_dir, "data", "to_nastya_att.csv")

def main():
    if not os.path.exists(DATA_PATH):
        print(f"Помилка: Файл не знайдено: {DATA_PATH}")
        return

    print("Починаю читати лог-файл...")
    parser = LogParser(DATA_PATH)
    gps_raw, imu_raw, att_raw = parser.parse_telemetry()

    if not gps_raw or not imu_raw:
        print("Помилка: В лозі немає потрібних даних.")
        return

    # ==========================================
    # 1. ПІДГОТОВКА ДАНИХ ДЛЯ FUSION
    # ==========================================
    # Отримуємо базові ENU координати
    full_data_raw = FlightProcessor.convert_to_local_system(gps_raw)
    
    # Готуємо DataFrame для IMU (з назвами колонок як у fusion.py)
    df_imu = pd.DataFrame(imu_raw).drop_duplicates(subset=['time_s'], keep='first')
    df_imu_fusion = df_imu.rename(columns={
        'time_s': 'TimeUS', 'acc_x': 'AccX', 'acc_y': 'AccY', 'acc_z': 'AccZ',
        'gyr_x': 'GyrX', 'gyr_y': 'GyrY', 'gyr_z': 'GyrZ'
    })
    df_imu_fusion['TimeUS'] = df_imu_fusion['TimeUS'] * 1e6 # Конвертація в мікросекунди

    # Готуємо DataFrame для GPS
    df_gps = pd.DataFrame(full_data_raw).rename(columns={
        'time_s': 'TimeUS', 'x': 'x_enu', 'y': 'y_enu', 'z': 'z_enu'
    })
    df_gps['TimeUS'] = df_gps['TimeUS'] * 1e6

    # ==========================================
    # 2. ЗАПУСК РОЗУМНОЇ ОБРОБКИ (АНТИ-РЕБ)
    # ==========================================
    print("Запускаю аналіз аномалій та фільтрацію...")
    fusion_module = NavigationFusion()
    smart_trajectory = fusion_module.process_flight_data(df_imu_fusion, df_gps)

    # Оптимізуємо траєкторію (зменшуємо кількість точок, зберігаючи важливі маневри)
    # Якщо точок забагато для JSON, можеш поставити target_points=500
    optimized_trajectory = optimize_trajectory(smart_trajectory, target_points=len(smart_trajectory))

    # Зберігаємо для Вані (тепер тут є importance та is_anomaly!)
    with open(VANYA_OUTPUT, "w") as f:
        json.dump(optimized_trajectory, f, indent=4)

    # Зберігаємо для Святослава (дані для 2D карти)
    # Використовуємо оригінальні lat/lon для карти
    sviat_data = [{"time_s": p["time_s"], "lat": p.get("lat", 0), "lon": p.get("lon", 0), "alt_abs": p.get("alt_abs", 0)} 
                  for p in full_data_raw]
    with open(SVIAT_OUTPUT, "w") as f:
        json.dump(sviat_data, f, indent=4)

    # ==========================================
    # 3. ДАНІ ДЛЯ НАСТІ (CSV)
    # ==========================================
    df_imu.to_csv(NASTYA_OUTPUT, index=False)

    if att_raw:
        df_att = pd.DataFrame(att_raw).drop_duplicates(subset=['time_s'], keep='first')
        df_att.to_csv(NASTYA_ATT_OUTPUT, index=False)

    print("Всі файли успішно згенеровано з підтримкою анти-РЕБ логіки!")

if __name__ == "__main__":
    main()