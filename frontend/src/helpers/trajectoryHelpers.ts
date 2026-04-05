import type { TrajectoryPoint } from "../types/trajectory";

export const getDefaultPoint = (points: TrajectoryPoint[]): TrajectoryPoint | null => {
    return points[0] ?? null;
};

export const getPointId = (point: TrajectoryPoint): string =>
    `${point.x}_${point.y}_${point.z}_${point.time_s}`;

export const formatCoordinate = (value: number | undefined | null, decimals = 6): string =>
    value !== undefined && value !== null ? value.toFixed(decimals) : '-';

export const formatNumber = (value: number | undefined | null): string =>
    value !== undefined && value !== null ? value.toString() : '-';
