import numpy as np
from scipy.spatial.transform import Rotation as R

class NavigationEngine:
    def __init__(self):
        self.position = np.array([0.0, 0.0, 0.0])
        self.velocity = np.array([0.0, 0.0, 0.0])
        self.orientation = R.from_quat([0, 0, 0, 1])
        self.gravity_global = np.array([0.0, 0.0, 9.81])
        self.accel_bias_body = np.array([0.0, 0.0, 0.0])
        self.accel_prev_global = np.array([0.0, 0.0, 0.0])

    def predict(self, acc_raw, gyr_raw, dt):
        if dt <= 0:
            return self.position, np.linalg.norm(self.velocity)

        # Оновлення орієнтації
        delta_rot = R.from_rotvec(gyr_raw * dt)
        self.orientation = self.orientation * delta_rot

        # Очищення від байасу (в системі координат дрона)
        acc_body_clean = acc_raw - self.accel_bias_body

        # Перетворення в глобальну систему ENU
        acc_global = self.orientation.apply(acc_body_clean)

        acc_linear = acc_global - self.gravity_global

        new_velocity = self.velocity + (self.accel_prev_global + acc_linear) * 0.5 * dt
        self.position += (self.velocity + new_velocity) * 0.5 * dt

        self.velocity = new_velocity
        self.accel_prev_global = acc_linear

        return self.position, np.linalg.norm(self.velocity)

    def correct(self, gps_pos, gps_vel=None, alpha=1.0):
        self.position = gps_pos
        if gps_vel is not None:
            self.velocity = (1.0 - alpha) * self.velocity + alpha * gps_vel