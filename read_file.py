import pandas as pd
from pymavlink import mavutil
import os

# Шлях до файлу (використовуємо твій робочий підхід)
base_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(base_dir, "data/00000001.BIN")
mlog = mavutil.mavlink_connection(file_path)

print("--- Починаємо парсинг усього файлу... ---")

data_gps = []

while True:
    # Шукаємо наступне повідомлення GPS
    msg = mlog.recv_match(type=['GPS'], blocking=False)
    if msg is None:
        break  # Файл закінчився

    # Витягуємо потрібні поля
    # Важливо: Lat/Lng в ArduPilot множаться на 10^7, треба повернути до градусів
    data_gps.append({
        'timestamp': msg.TimeUS,
        'lat': msg.Lat / 1.0e7,
        'lng': msg.Lng / 1.0e7,
        'alt': msg.Alt,
        'ground_speed': msg.Spd,
        'satellites': msg.NSats
    })

# Створюємо таблицю
df = pd.DataFrame(data_gps)

# Дивимось на результат
print(f"Парсинг завершено! Знайдено точок GPS: {len(df)}")
if not df.empty:
    print(df.head())  # Виведе перші 5 рядків

    # Збережемо для Насті, щоб вона могла працювати в Excel або Python
    df.to_csv(os.path.join(base_dir, "flight_data.csv"), index=False)
    print("Дані збережено у flight_data.csv")