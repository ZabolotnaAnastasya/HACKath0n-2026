import numpy as np
from scipy.spatial.transform import Rotation as R

"""
ТЕОРЕТИЧНЕ ТА ФІЗИЧНЕ ОБҐРУНТУВАННЯ АЛГОРИТМУ
Орієнтація: Для опису просторового положення БПЛА використовуються кватерніони (Rotation.from_quat). Це дозволяє уникнути 'gimbal lock' та забезпечує неперервність обертання при довільних кутах атаки.
Подвійне інтегрування: Згідно з законами кінематики, швидкість є похідною координати за часом. Ми реалізуємо зворотний процес: отримання швидкостей з масиву прискорень IMU через МЕТОД ТРАПЕЦІЄВИДНОГО ІНТЕГРУВАННЯ. Це мінімізує похибку дискретизації у порівнянні з методом прямокутників.
Похибки IMU: Подвійне інтегрування акселерометра призводить до квадратичного накопичення дрейфу (похибки вібрацій та bias). Для стабілізації використовується Sensor Fusion з GPS корекцією.
Сплайни: Оскільки частоти дискретизації IMU (~100Hz) та GPS (~1-5Hz) відрізняються, у моменти GPS-корекції виникають розриви траєкторії ('сходинки'). Кубічні сплайни застосовуються для згладжування цих розривів та відновлення фізично коректних значень швидкості через першу похідну сплайна.
"""

class NavigationEngine:
    """
    Інерціальна навігація через кватерніони.
    
    Інтегрує прискорення, компенсує гравітацію.
    """
    def __init__(self):
        self.position = np.array([0.0, 0.0, 0.0])
        self.velocity = np.array([0.0, 0.0, 0.0])
        self.orientation = R.from_quat([0, 0, 0, 1])
        self.gravity_global = np.array([0.0, 0.0, -9.81])
        self.accel_bias_body = np.array([0.0, 0.0, 0.0])
        self.accel_prev_global = np.array([0.0, 0.0, 0.0])

    def predict(self, acc_raw, gyr_raw, dt):
        """
        Прогноз позиції через інерціальну навігацію.
        
        Повертає позицію та швидкість.
        """
        if dt <= 0:
            return self.position, np.linalg.norm(self.velocity)

        delta_rot = R.from_rotvec(gyr_raw * dt)
        self.orientation = self.orientation * delta_rot
        acc_body_clean = acc_raw - self.accel_bias_body
        acc_global = self.orientation.apply(acc_body_clean)
        acc_linear = acc_global - self.gravity_global

        new_velocity = self.velocity + (self.accel_prev_global + acc_linear) * 0.5 * dt
        self.position += (self.velocity + new_velocity) * 0.5 * dt

        self.velocity = new_velocity
        self.accel_prev_global = acc_linear

        return self.position, np.linalg.norm(self.velocity)

    def correct(self, gps_pos, gps_vel=None, alpha=1.0):
        """
        Корекція позиції GPS даними.
        
        Жорстко встановлює позицію, м'яко коригує швидкість.
        """
        self.position = gps_pos
        if gps_vel is not None:
            self.velocity = (1.0 - alpha) * self.velocity + alpha * gps_vel