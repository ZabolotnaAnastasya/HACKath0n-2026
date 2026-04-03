import numpy as np
from scipy.interpolate import CubicSpline

def optimize_trajectory(trajectory: list, target_points: int = 100) -> list:
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

    # 2. Обов'язково старт і фініш
    essential_indices = {0, n_unique - 1}

    # 3. Вибираємо топ точок за показником 'importance' (з IMU)
    scores = []
    for i in range(1, n_unique - 1):
        scores.append((i, unique_traj[i].get('importance', 0)))

    scores.sort(key=lambda x: x[1], reverse=True)

    # Додаємо індекси найкращих точок
    num_to_add = min(target_points - 2, len(scores))
    for i in range(num_to_add):
        essential_indices.add(scores[i][0])

    # 4. Створюємо "кістяк" (skeleton)
    skeleton_indices = sorted(list(essential_indices))
    skeleton_points = [unique_traj[i] for i in skeleton_indices]

    # 5. Сплайн-інтерполяція для плавності в 3D (X, Y, Z)
    t_skel = np.array([p['time_s'] for p in skeleton_points])
    coords_skel = np.array([[p['x'], p['y'], p['z']] for p in skeleton_points])

    # Створюємо кубічний сплайн
    cs = CubicSpline(t_skel, coords_skel, bc_type='natural')

    # 6. Генеруємо фінальну рівномірну сітку точок
    t_final = np.linspace(t_skel[0], t_skel[-1], target_points)
    coords_final = cs(t_final)
    
    # Перша похідна для розрахунку швидкості
    velocities = np.linalg.norm(cs(t_final, 1), axis=1)

    # Формуємо результат для API
    optimized_output = []
    for i in range(len(t_final)):
        optimized_output.append({
            "time_s": round(float(t_final[i]), 3),
            "x": round(float(coords_final[i][0]), 2),
            "y": round(float(coords_final[i][1]), 2),
            "z": round(float(coords_final[i][2]), 2),
            "speed": round(float(velocities[i]), 2)
        })

    return optimized_output