"""ТЕОРЕТИЧНЕ ОБГРУНТУВАННЯ

Дрейф Подвійної Інтеграції IMU:
Вимірювання акселерометра потребують подвійної інтеграції для отримання позиції:
position = ∫∫(прискорення - зміщення + шум) dt²
Цей процес накопичує помилки квадратично з часом (O(dt²)), що призводить до
значного дрейфу позиції навіть при малих сталих зміщеннях. Інтеграція білого шуму
спричиняє випадкове блукання в швидкості та позиції.

Sensor Fusion з GPS Корекцією:
GPS надає абсолютні вимірювання позиції з обмеженою точністю (HAcc/SAcc).
Шляхом ф'южну високочастотних даних IMU з низькочастотними корекціями GPS через
комплементарну фільтрацію ми досягаємо:
- Високочастотної динаміки від IMU (100Гц+)
- Низькочастотної корекції дрейфу від GPS (10Гц)
- Обмеженої помилки позиції через періодичні абсолютні оновлення
Вага ф'южну α динамічно коригується на основі метрик точності GPS.

Фізична Неперервність Кубічних Сплайнів:
Інтерполяція траєкторії повинна зберігати фізичні закони:
- Неперервність позиції: C⁰ неперервність
- Неперервність швидкості: C¹ неперервність (перша похідна)
- Неперервність прискорення: C² неперервність (друга похідна)
Кубічні сплайни забезпечують C¹ неперервність шляхом узгодження перших похідних
у вузлових точках, надаючи фізично реалістичні гладкі траєкторії без штучних
стрибків швидкості. Це критично важливо для точної реконструкції траєкторії польоту
та візуалізації.
"""

import numpy as np
from scipy.spatial.transform import Rotation as R

class NavigationEngine:
    """Навігація високочастотного IMU з GPS корекцією.
    
    Реалізує комплементарну фільтрацію для sensor fusion:
    - IMU: 100Гц+ dead reckoning з накопиченням дрейфу
    - GPS: 10Гц абсолютні корекції позиції
    - Вихід: Оцінка траєкторії з обмеженою помилкою
    """
    def __init__(self):
        """Ініціалізація векторів стану навігації.
        
        Змінні стану:
        - position: координати ENU [м]
        - velocity: швидкість ENU [м/с]
        - orientation: кватерніон обертання (body до global frame)
        - gravity_global: вектор гравітації в глобальній системі
        - accel_bias_body: оцінка зміщення акселерометра
        - accel_prev_global: попереднє прискорення для трапецеїдальної інтеграції
        """
        self.position = np.array([0.0, 0.0, 0.0])
        self.velocity = np.array([0.0, 0.0, 0.0])
        self.orientation = R.from_quat([0, 0, 0, 1])
        self.gravity_global = np.array([0.0, 0.0, -9.81])
        self.accel_bias_body = np.array([0.0, 0.0, 0.0])
        self.accel_prev_global = np.array([0.0, 0.0, 0.0])

    def predict(self, acc_raw, gyr_raw, dt):
        """Крок прогнозування IMU dead reckoning.
        
        Args:
            acc_raw: сиі вимірювання акселерометра [м/с²]
            gyr_raw: сиі вимірювання гіроскопа [рад/с]
            dt: дельта часу [с]
            
        Returns:
            tuple: (позиція [м], швидкість [м/с])
            
        Алгоритм:
        1. Оновлення орієнтації через інтеграцію кватерніона
        2. Прискорення: трансформація body → global frame
        3. Компенсація гравітації
        4. Трапецеідальна інтеграція для швидкості/позиції
        """
        if dt <= 0:
            return self.position, np.linalg.norm(self.velocity)

        # Оновлення орієнтації через кватерніонну інтеграцію
        delta_rot = R.from_rotvec(gyr_raw * dt)
        self.orientation = self.orientation * delta_rot
        acc_body_clean = acc_raw - self.accel_bias_body
        acc_global = self.orientation.apply(acc_body_clean)
        acc_linear = acc_global - self.gravity_global

        # Інтеграція методом трапецій для точності
        new_velocity = self.velocity + (self.accel_prev_global + acc_linear) * 0.5 * dt
        self.position += (self.velocity + new_velocity) * 0.5 * dt

        self.velocity = new_velocity
        self.accel_prev_global = acc_linear

        return self.position, np.linalg.norm(self.velocity)


    def correct(self, gps_pos, gps_vel=None, alpha=1.0):
        """Крок корекції GPS вимірювань.
        
        Args:
            gps_pos: позиція GPS в ENU frame [м]
            gps_vel: швидкість GPS в ENU frame [м/с] (опціонально)
            alpha: вага ф'южну [0-1], вище = більше довіри до GPS
            
        Алгоритм:
        - Позиція: пряма заміна GPS (абсолютна корекція)
        - Швидкість: комплементарна фільтрація з адаптивною вагою
        """
        self.position = gps_pos
        if gps_vel is not None:
            self.velocity = (1.0 - alpha) * self.velocity + alpha * gps_vel