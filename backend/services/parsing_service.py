from pymavlink import mavutil
import pandas as pd


class ParsingService:
    def parse_file_by_path(self, file_path):
        mlog = mavutil.mavlink_connection(file_path)
        imu_data, gps_data = [], []
        last_imu_time = None

        while True:
            msg = mlog.recv_msg()
            if msg is None: break

            m_type = msg.get_type()
            if m_type == 'IMU':
                dt = (msg.TimeUS - last_imu_time) / 1e6 if last_imu_time else 0.02
                imu_data.append({
                    'TimeUS': msg.TimeUS, 'dt': dt,
                    'AccX': msg.AccX, 'AccY': msg.AccY, 'AccZ': msg.AccZ,
                    'GyrX': msg.GyrX, 'GyrY': msg.GyrY, 'GyrZ': msg.GyrZ
                })
                last_imu_time = msg.TimeUS
            elif m_type == 'GPS':
                gps_data.append({
                    'TimeUS': msg.TimeUS,
                    'Lat': msg.Lat, 'Lon': getattr(msg, 'Lng', getattr(msg, 'Lon', 0)),
                    'Alt': msg.Alt, 'VelN': getattr(msg, 'VN', 0),
                    'VelE': getattr(msg, 'VE', 0), 'VelD': getattr(msg, 'VZ', 0)
                })
        return pd.DataFrame(imu_data), pd.DataFrame(gps_data)