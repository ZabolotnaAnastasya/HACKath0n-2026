'''
ми помітили що на фронті дуже довго рендириться, тому було прийняте рішення зменшувати кількість точок,
але викидувати точки з якимось кроком, то стрілити собі в ногу, бо ми аналізуємо критичні моменти польоту.
Наша ідея:
    достатньо викинути ті точки де траєкторія мало змінювалась, тобто де зміна похідної близька до 0,
    ми формуємо ліст з топ 100 точок з максималною зміною похідної
    -> лишаються лише повороти, моменти особливої тряски і тд
'''

import numpy as np
from scipy.interpolate import CubicSpline


class TrajectoryOptimizer:
    @staticmethod
    def process(points, num_points=100, strategy="adaptive"):
        if len(points) < 10: return points

        t = np.array([p['time_s'] for p in points])
        coords = np.array([[p['x'], p['y'], p['z']] for p in points])
        t, idx = np.unique(t, return_index=True)
        coords = coords[idx]

        cs = CubicSpline(t, coords)

        if strategy == "adaptive":
            # Топ-100 точок за кривизною (друга похідна)
            t_fine = np.linspace(t[0], t[-1], len(t) * 2)
            curvature = np.linalg.norm(cs(t_fine, 2), axis=1)
            indices = np.argsort(curvature)[-(num_points - 2):]
            selected_t = np.sort(np.concatenate(([t[0], t[-1]], t_fine[indices])))
        else:
            # Рівновіддалені точки
            selected_t = np.linspace(t[0], t[-1], num_points)

        res_coords = cs(selected_t)
        res_vel = np.linalg.norm(cs(selected_t, 1), axis=1)

        return [{
            "x": round(float(res_coords[i, 0]), 2),
            "y": round(float(res_coords[i, 1]), 2),
            "z": round(float(res_coords[i, 2]), 2),
            "speed": round(float(res_vel[i]), 2),
            "time_s": round(float(selected_t[i]), 3)
        } for i in range(len(selected_t))]