import numpy as np
from scipy.spatial.transform import Rotation as R

class NavigationEngine:
    def __init__(self):
        self.position = np.array([0.0, 0.0, 0.0])
        self.velocity = np.array([0.0, 0.0, 0.0])
        self.orientation = R.from_quat([0, 0, 0, 1])
        # В системі ENU Up - це +Z, тому гравітація спрямована вниз (-9.81)
        self.gravity_global = np.array([0.0, 0.0, -9.81])#правлю на +
        self.accel_bias_body = np.array([0.0, 0.0, 0.0])
        self.accel_prev_global = np.array([0.0, 0.0, 0.0])

    def predict(self, acc_raw, gyr_raw, dt):
        if dt <= 0 or dt > 0.1: # Захист від занадто великих кроків часу
            return self.position, np.linalg.norm(self.velocity)

        # Оновлення орієнтації
        delta_rot = R.from_rotvec(gyr_raw * dt)
        self.orientation = self.orientation * delta_rot

        # Очищення від байасу та перетворення в глобальну систему ENU
        acc_body_clean = acc_raw - self.accel_bias_body
        acc_global = self.orientation.apply(acc_body_clean)

        # Розрахунок лінійного прискорення (віднімаємо гравітацію)
        # Оскільки gravity_global = [0,0,-9.81], віднімання дасть +9.81 компенсації
        acc_linear = acc_global - self.gravity_global

        # Метод трапецій для швидкості та позиції
        new_velocity = self.velocity + (self.accel_prev_global + acc_linear) * 0.5 * dt
        self.position += (self.velocity + new_velocity) * 0.5 * dt

        self.velocity = new_velocity
        self.accel_prev_global = acc_linear

        return self.position, np.linalg.norm(self.velocity)
    

    def is_gps_plausible(self, new_gps_pos, new_gps_vel, h_acc, s_acc):
        """
        Порівнює прогноз інерціальної моделі з даними GPS, 
        використовуючи похибки з бінарника як динамічні пороги.
        """
        # Рахуємо реальну відстань між прогнозом і GPS у метрах
        pos_diff = np.linalg.norm(new_gps_pos - self.position)
        # Рахуємо різницю швидкостей у м/с
        vel_diff = np.linalg.norm(new_gps_vel - self.velocity)
        
        # Ми даємо запас (коефіцієнт 2.0 або 3.0), бо GPS може шуміти,
        # а інерція — трохи дрейфувати.
        # Якщо розбіжність більша за (похибка з логу * запас) — це аномалія.
        
        is_pos_ok = pos_diff < (h_acc * 2.5)
        is_vel_ok = vel_diff < (s_acc * 2.0)
        
        return is_pos_ok and is_vel_ok





    def correct(self, gps_pos, gps_vel=None, alpha=1.0):
        self.position = (1.0 - alpha) * self.position + alpha * gps_pos
        if gps_vel is not None:
            self.velocity = (1.0 - alpha) * self.velocity + alpha * gps_vel
    