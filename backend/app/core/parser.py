from pymavlink import mavutil

class LogParser:
    def __init__(self, file_path):
        self.file_path = file_path

    def parse_telemetry(self):
        mlog = mavutil.mavlink_connection(self.file_path)
        gps_data = []
        imu_data = []
        att_data = []
        last_imu_time = None
        found_pos = False

        # Змінні для збереження останніх відомих похибок
        last_hacc = 2.0  # Дефолт 2 метри
        last_sacc = 0.5  # Дефолт 0.5 м/с

        while True:
            # Додаємо GPA в список типів, які ми очікуємо від mlink
            msg = mlog.recv_match(type=['POS', 'GPS', 'GPA', 'IMU', 'ATT'], blocking=False)
            if msg is None:
                break

            m_type = msg.get_type()

            # Обробка похибок GPS Accuracy
            if m_type == 'GPA':
                last_hacc = getattr(msg, 'HAcc', 2.0)
                last_sacc = getattr(msg, 'SAcc', 0.5)

            elif m_type == 'POS':
                if not found_pos:
                    gps_data.clear()
                    found_pos = True
                gps_data.append({
                    "timestamp": msg.TimeUS,
                    "lat": msg.Lat,
                    "lng": msg.Lng,
                    "alt": msg.RelAlt,
                    "speed": getattr(msg, 'Spd', 0.0),
                    "course": getattr(msg, 'GCrs', 0.0),
                    "vz": getattr(msg, 'VZ', 0.0),
                    "h_acc": last_hacc, # Додаємо динамічну похибку
                    "s_acc": last_sacc  # Додаємо динамічну похибку
                })

            elif m_type == 'GPS' and not found_pos:
                if getattr(msg, 'Status', 0) >= 3:
                    gps_data.append({
                        "timestamp": getattr(msg, 'TimeUS', 0),
                        "lat": getattr(msg, 'Lat', 0),
                        "lng": getattr(msg, 'Lng', 0),
                        "alt": getattr(msg, 'Alt', 0),
                        "speed": getattr(msg, 'Spd', 0.0),
                        "course": getattr(msg, 'GCrs', 0.0),
                        "vz": getattr(msg, 'VZ', 0.0),
                        "h_acc": last_hacc, # Додаємо динамічну похибку
                        "s_acc": last_sacc  # Додаємо динамічну похибку
                    })

            elif m_type == 'IMU':
                current_time = getattr(msg, 'TimeUS', 0) / 1_000_000.0
                dt = 0.0
                if last_imu_time is not None:
                    dt = current_time - last_imu_time
                last_imu_time = current_time

                imu_data.append({
                    "TimeUS": getattr(msg, 'TimeUS', 0),
                    "time_s": round(current_time, 4),
                    "dt": round(dt, 4),
                    "AccX": getattr(msg, 'AccX', 0.0),
                    "AccY": getattr(msg, 'AccY', 0.0),
                    "AccZ": getattr(msg, 'AccZ', 0.0),
                    "GyrX": getattr(msg, 'GyrX', 0.0),
                    "GyrY": getattr(msg, 'GyrY', 0.0),
                    "GyrZ": getattr(msg, 'GyrZ', 0.0)
                })
            elif m_type == 'ATT':
                att_data.append({
                    "time_s": getattr(msg, 'TimeUS', 0) / 1_000_000.0,
                    "roll": getattr(msg, 'Roll', 0.0),
                    "pitch": getattr(msg, 'Pitch', 0.0),
                    "yaw": getattr(msg, 'Yaw', 0.0)
                })

        return gps_data, imu_data, att_data