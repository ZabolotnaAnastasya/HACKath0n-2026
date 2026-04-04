import numpy as np
from scipy.interpolate import CubicSpline


def optimize_trajectory(trajectory: list, target_points: int = 100) -> list:
    """
    Згладжує траєкторію за допомогою кубічних сплайнів
    та повертає структуру, яку вимагає Ваня.
    """
    n = len(trajectory)
    if n <= target_points or target_points < 3:
        return trajectory

    # 1. Сортуємо та прибираємо дублікати за часом
    unique_traj = []
    seen_times = set()
    for p in sorted(trajectory, key=lambda x: x['time_s']):
        if p['time_s'] not in seen_times:
            unique_traj.append(p)
            seen_times.add(p['time_s'])

    n_unique = len(unique_traj)
    essential_indices = {0, n_unique - 1}

    # 2. Вибираємо найважливіші точки на основі прискорення (importance)
    scores = []
    for i in range(1, n_unique - 1):
        scores.append((i, unique_traj[i].get('importance', 0)))

    scores.sort(key=lambda x: x[1], reverse=True)

    num_to_add = min(target_points - 2, len(scores))
    for i in range(num_to_add):
        essential_indices.add(scores[i][0])

    skeleton_indices = sorted(list(essential_indices))
    skeleton_points = [unique_traj[i] for i in skeleton_indices]

    t_skel = np.array([p['time_s'] for p in skeleton_points])

    # 3. Створюємо сплайни для всіх полів
    # Координати ENU
    coords_skel = np.array([[p['x'], p['y'], p['z']] for p in skeleton_points])
    cs = CubicSpline(t_skel, coords_skel, bc_type='natural')

    # Гео-координати (lat, lon, alt_abs) — ТЕ, ЩО ТРЕБА ВАНІ
    lats_skel = np.array([p.get('lat', 0.0) for p in skeleton_points])
    lons_skel = np.array([p.get('lon', 0.0) for p in skeleton_points])
    alts_skel = np.array([p.get('alt_abs', 0.0) for p in skeleton_points])

    cs_lat = CubicSpline(t_skel, lats_skel, bc_type='natural')
    cs_lon = CubicSpline(t_skel, lons_skel, bc_type='natural')
    cs_alt = CubicSpline(t_skel, alts_skel, bc_type='natural')

    # 4. Генеруємо фінальну сітку
    t_final = np.linspace(t_skel[0], t_skel[-1], target_points)

    coords_final = cs(t_final)
    lats_final = cs_lat(t_final)
    lons_final = cs_lon(t_final)
    alts_final = cs_alt(t_final)

    # Швидкість (перша похідна сплайна)
    velocities = np.linalg.norm(cs(t_final, 1), axis=1)

    # 5. Формуємо вихідний JSON
    optimized_output = []
    for i in range(len(t_final)):
        optimized_output.append({
            "time_s": round(float(t_final[i]), 3),
            "x": round(float(coords_final[i][0]), 2),
            "y": round(float(coords_final[i][1]), 2),
            "z": round(float(coords_final[i][2]), 2),
            "speed": round(float(velocities[i]), 2),
            "lat": round(float(lats_final[i]), 7),
            "lon": round(float(lons_final[i]), 7),
            "alt_abs": round(float(alts_final[i]), 2)
        })

    return optimized_output