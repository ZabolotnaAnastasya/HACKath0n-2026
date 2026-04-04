export interface TrajectoryPoint {
    x: number;
    y: number;
    z: number;
    speed: number;
    time_s: number;
    lat: number;
    lon: number;
    alt_abs: number;
}

export interface CameraPosition {
    x: number;
    y: number;
    z: number;
}

export interface MapPosition {
    lat: number;
    lon: number;
}
