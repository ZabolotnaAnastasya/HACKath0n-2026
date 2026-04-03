from pymavlink import mavutil


class LogParser:
    def __init__(self, file_path):
        # Шлях до бінарного файлу логу
        self.file_path = file_path

    def parse_telemetry(self):
        # Підключаємось до файлу
        mlog = mavutil.mavlink_connection(self.file_path)

        # Списки для збереження результатів
        gps_data = []
        imu_data = []
        att_data = []

        last_imu_time = None

        # Прапорець. Якщо ми хоч раз знайдемо супер-точне повідомлення POS,
        # ми перемикаємо цей прапорець і перестаємо збирати звичайний GPS.
        found_pos = False

        while True:
            # Читаємо наступне повідомлення
            msg = mlog.recv_match(type=['POS', 'GPS', 'IMU', 'ATT'], blocking=False)

            if msg is None:
                break

            m_type = msg.get_type()

            # --- ЗБИРАЄМО ДАНІ ДЛЯ ВАНІ (Координати) ---

            if m_type == 'POS':
                # Якщо це перше повідомлення POS у файлі, очищаємо все,
                # що могли випадково зібрати з гіршого GPS до цього.
                if not found_pos:
                    gps_data.clear()
                    found_pos = True

                gps_data.append({
                    "timestamp": msg.TimeUS,
                    "lat": msg.Lat,
                    "lng": msg.Lng,
                    "alt": msg.RelAlt,
                    "speed": getattr(msg, 'Spd', 0)
                })

            elif m_type == 'GPS' and not found_pos:
                # Збираємо звичайний GPS тільки якщо точного POS немає у файлі взагалі.
                # Status >= 3 означає, що дрон зловив достатньо супутників для точної позиції.
                if getattr(msg, 'Status', 0) >= 3:
                    gps_data.append({
                        "timestamp": getattr(msg, 'TimeUS', 0),
                        "lat": getattr(msg, 'Lat', 0),
                        "lng": getattr(msg, 'Lng', 0),
                        "alt": getattr(msg, 'Alt', 0),  # Висота над рівнем моря
                        "speed": getattr(msg, 'Spd', 0)
                    })

            # --- ЗБИРАЄМО ДАНІ ДЛЯ НАСТІ (Сенсори руху) ---

            elif m_type == 'IMU':
                current_time = getattr(msg, 'TimeUS', 0) / 1_000_000.0

                dt = 0.0
                if last_imu_time is not None:
                    dt = current_time - last_imu_time

                last_imu_time = current_time

                imu_data.append({
                    "time_s": round(current_time, 4),
                    "dt": round(dt, 4),
                    "acc_x": getattr(msg, 'AccX', 0.0),
                    "acc_y": getattr(msg, 'AccY', 0.0),
                    "acc_z": getattr(msg, 'AccZ', 0.0),
                    "gyr_x": getattr(msg, 'GyrX', 0.0),
                    "gyr_y": getattr(msg, 'GyrY', 0.0),
                    "gyr_z": getattr(msg, 'GyrZ', 0.0)
                })
            elif m_type == 'ATT':
                att_data.append({
                    "time_s": getattr(msg, 'TimeUS', 0) / 1_000_000.0,
                    "roll": getattr(msg, 'Roll', 0.0),
                    "pitch": getattr(msg, 'Pitch', 0.0),
                    "yaw": getattr(msg, 'Yaw', 0.0)
                })

        return gps_data, imu_data, att_data