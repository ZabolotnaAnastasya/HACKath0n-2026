from pymavlink import mavutil


class LogParser:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def parse_telemetry(self):
        # Відкриваємо з'єднання з файлом логу (.tlog або .bin)
        mlog = mavutil.mavlink_connection(self.file_path)

        gps_data = []
        imu_data = []
        att_data = []

        # Дефолтні значення точності, якщо GPA повідомлення відсутні
        last_hacc = 2.0
        last_sacc = 0.5

        last_imu_time = None
        found_pos = False

        while True:
            # Слухаємо всі потрібні типи повідомлень
            msg = mlog.recv_match(type=['POS', 'GPS', 'IMU', 'ATT', 'GPA'], blocking=False)
            if msg is None:
                break

            m_type = msg.get_type()

            # 1. Отримуємо дані про точність (Accuracy)
            if m_type == 'GPA':
                last_hacc = getattr(msg, 'HAcc', 2.0)
                last_sacc = getattr(msg, 'SAcc', 0.5)

            # 2. Пріоритетні дані позиції (вже в метрах від точки зльоту)
            elif m_type == 'POS':
                if not found_pos:
                    gps_data.clear()  # Якщо знайшли POS, ігноруємо попередні GPS
                    found_pos = True

                gps_data.append({
                    "TimeUS": msg.TimeUS,
                    "lat": getattr(msg, 'Lat', 0),
                    "lng": getattr(msg, 'Lng', 0),
                    "alt": getattr(msg, 'RelAlt', 0),
                    "x_enu": getattr(msg, 'RelHomeX', 0.0),  # Локальна координата X
                    "y_enu": getattr(msg, 'RelHomeY', 0.0),  # Локальна координата Y
                    "z_enu": getattr(msg, 'RelAlt', 0.0),  # Висота
                    "h_acc": last_hacc,  # Точність з останнього GPA
                    "s_acc": last_sacc,
                    "speed": getattr(msg, 'Spd', 0.0)  # Модуль швидкості
                })

            # 3. Резервні дані GPS (якщо POS повідомлень немає в лозі)
            elif m_type == 'GPS' and not found_pos:
                if getattr(msg, 'Status', 0) >= 3:
                    gps_data.append({
                        "TimeUS": getattr(msg, 'TimeUS', 0),
                        "lat": getattr(msg, 'Lat', 0),
                        "lng": getattr(msg, 'Lng', 0),
                        "alt": getattr(msg, 'Alt', 0),
                        "speed": getattr(msg, 'Spd', 0.0),
                        "course": getattr(msg, 'GCrs', 0.0),  # Напрямок руху (Course)
                        "vz": getattr(msg, 'VZ', 0.0),  # Вертикальна швидкість
                    })

            # 4. Дані інерціальних датчиків (Акселерометр + Гіроскоп)
            elif m_type == 'IMU':
                current_time = getattr(msg, 'TimeUS', 0) / 1_000_000.0
                dt = current_time - last_imu_time if last_imu_time else 0.02
                last_imu_time = current_time

                imu_data.append({
                    "TimeUS": getattr(msg, 'TimeUS', 0),
                    "dt": round(dt, 4),
                    "AccX": getattr(msg, 'AccX', 0.0),
                    "AccY": getattr(msg, 'AccY', 0.0),
                    "AccZ": getattr(msg, 'AccZ', 0.0),
                    "GyrX": getattr(msg, 'GyrX', 0.0),
                    "GyrY": getattr(msg, 'GyrY', 0.0),
                    "GyrZ": getattr(msg, 'GyrZ', 0.0)
                })

            # 5. Кути нахилу (Roll, Pitch, Yaw) для візуалізації
            elif m_type == 'ATT':
                att_data.append({
                    "time_s": getattr(msg, 'TimeUS', 0) / 1_000_000.0,
                    "roll": getattr(msg, 'Roll', 0.0),
                    "pitch": getattr(msg, 'Pitch', 0.0),
                    "yaw": getattr(msg, 'Yaw', 0.0)
                })

        return gps_data, imu_data, att_data