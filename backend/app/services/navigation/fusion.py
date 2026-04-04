import pandas as pd
import numpy as np
from .engine import NavigationEngine

class NavigationFusion:
    def __init__(self):
        self.engine = NavigationEngine()
        self.is_calibrated = False
        self.prev_gps_alt = None
        self.prev_gps_time = None

    def process_flight_data(self, imu_df: pd.DataFrame, gps_df: pd.DataFrame):
        if gps_df.empty or imu_df.empty:
            return []

        imu_df = imu_df.sort_values('TimeUS')
        gps_df = gps_df.sort_values('TimeUS')

        # Перший GPS як точку старту
        first_gps = gps_df.iloc[0]
        self.engine.correct(
            np.array([first_gps['x_enu'], first_gps['y_enu'], first_gps['z_enu']]),
            np.array([first_gps.get('VelE', 0), first_gps.get('VelN', 0), 0])
        )
        
        # Ініціалізація змінних для розрахунку Vz перед циклом
        self.prev_gps_alt = first_gps['z_enu']
        self.prev_gps_time = first_gps['TimeUS'] / 1e6

        imu_filtered = imu_df[imu_df['TimeUS'] >= first_gps['TimeUS']].copy()

        # Калібрування (обчислення байасу)
        if not self.is_calibrated and len(imu_filtered) > 50:
            sample = imu_filtered.head(50)
            avg_acc = np.array([sample['AccX'].mean(), sample['AccY'].mean(), sample['AccZ'].mean()])
            self.engine.accel_bias_body = avg_acc - np.array([0, 0, 9.81])
            self.is_calibrated = True

        # Розрахунок норми прискорення (важливості)
        imu_filtered['accel_norm'] = np.sqrt(
            imu_filtered['AccX']**2 +
            imu_filtered['AccY']**2 +
            (imu_filtered['AccZ'] - 9.81)**2
        )

        # МЕРДЖ IMU та GPS
        combined = pd.merge_asof(
            imu_filtered, gps_df, on='TimeUS', direction='backward', tolerance=500000
        )

        final_trajectory = []
        for _, row in combined.iterrows():
            # Прогноз стану через engine.py
            acc = np.array([row['AccX'], row['AccY'], row['AccZ']])
            gyr = np.array([row['GyrX'], row['GyrY'], row['GyrZ']])
            pos, speed = self.engine.predict(acc, gyr, row.get('dt', 0.02))

            is_gps_update = False
            is_anomaly = False
            
            if pd.notnull(row.get('x_enu')):
                curr_pos = np.array([row['x_enu'], row['y_enu'], row['z_enu']])
                curr_time = row['TimeUS'] / 1e6

                # Розрахунок Vz
                vz = 0.0
                if self.prev_gps_alt is not None and curr_time > self.prev_gps_time:
                    vz = (row['z_enu'] - self.prev_gps_alt) / (curr_time - self.prev_gps_time)
                else:
                    vz = -row.get('VelD', 0.0)

                curr_vel = np.array([row.get('VelE', 0), row.get('VelN', 0), vz])
                
                # Отримання динамічних похибок
                h_acc = row.get('h_acc', 2.0)
                s_acc = row.get('s_acc', 0.5)

                # Перевірка на аномалії (РЕБ)
                if self.engine.is_gps_plausible(curr_pos, curr_vel, h_acc, s_acc):
                    self.engine.correct(curr_pos, curr_vel, alpha=0.2)
                    pos = self.engine.position
                    self.prev_gps_alt = row['z_enu']
                    self.prev_gps_time = curr_time
                    is_gps_update = True
                else:
                    is_anomaly = True
                    is_gps_update = False

            # Формуємо точку
            final_trajectory.append({
                "x": float(pos[0]),
                "y": float(pos[1]),
                "z": float(pos[2]),
                "speed": float(speed),
                "time_s": float(row['TimeUS'] / 1e6),
                "is_gps_step": is_gps_update,
                "is_anomaly": is_anomaly,
                "importance": float(row['accel_norm'])
            })

        return final_trajectory