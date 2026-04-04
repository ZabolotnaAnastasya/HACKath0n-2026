import os
import json
import sys
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.parser import LogParser
from core.processor import FlightProcessor

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
    # 1. ДАНІ ДЛЯ ВАНІ ТА СВЯТОСЛАВА
    # ==========================================
    full_data = FlightProcessor.convert_to_local_system(gps_raw)

    vanya_data = [{"time_s": p["time_s"], "x": p["x"], "y": p["y"], "z": p["z"], "speed": p["speed"]} for p in
                  full_data]
    with open(VANYA_OUTPUT, "w") as f:
        json.dump(vanya_data, f, indent=4)

    sviat_data = [{"time_s": p["time_s"], "lat": p["lat"], "lon": p["lon"], "alt_abs": p["alt_abs"]} for p in full_data]
    with open(SVIAT_OUTPUT, "w") as f:
        json.dump(sviat_data, f, indent=4)

    # ==========================================
    # 2. ДАНІ ДЛЯ НАСТІ (З ФІЛЬТРАЦІЄЮ ДУБЛІКАТІВ)
    # ==========================================
    df_imu = pd.DataFrame(imu_raw)
    # Магія Pandas: групуємо записи з однаковим часом і беремо середнє значення
    df_imu = pd.DataFrame(imu_raw).drop_duplicates(subset=['time_s'], keep='first')
    df_imu.to_csv(NASTYA_OUTPUT, index=False)

    if att_raw:
        # Відкидаємо дублікати для ATT (кути нахилу)
        df_att = pd.DataFrame(att_raw).drop_duplicates(subset=['time_s'], keep='first')
        df_att.to_csv(NASTYA_ATT_OUTPUT, index=False)

    print("Всі файли успішно згенеровано!")


if __name__ == "__main__":
    main()