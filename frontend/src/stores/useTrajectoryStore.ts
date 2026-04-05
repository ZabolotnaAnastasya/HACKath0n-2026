import { create } from "zustand";
import type { TrajectoryPoint, CameraPosition } from "../types/trajectory";

interface TrajectoryState {
    trajectoryArray: TrajectoryPoint[];
    activePoint: TrajectoryPoint | null;
    speedFactor: number;
    paused: boolean;
    cameraPosition: CameraPosition;
    controlsTarget: CameraPosition;
    replayTrigger: number;
    isLoading: boolean;
}

interface TrajectoryActions {
    setActivePoint: (point: TrajectoryPoint | null) => void;
    setSpeedFactor: (val: number) => void;
    setPaused: (val: boolean) => void;
    setCameraPosition: (pos: CameraPosition) => void;
    setControlsTarget: (pos: CameraPosition) => void;
    triggerReplay: () => void;
    reset: () => void;
    setIsLoading: (val: boolean) => void;
    clearTrajectory: () => void;
}

const defaultTrajectory: TrajectoryPoint[] =[]

const STORAGE_KEYS = {
    speedFactor: "speedFactor",
    cameraPosition: "cameraPosition",
    controlsTarget: "controlsTarget"
} as const;

const DEFAULT_CAMERA: CameraPosition = { x: 10, y: 10, z: 10 };
const DEFAULT_TARGET: CameraPosition = { x: 0, y: 0, z: 0 };

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
};

const saveToStorage = (key: string, value: unknown): void => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const useTrajectoryStore = create<
    TrajectoryState & TrajectoryActions
>((set) => ({
    trajectoryArray: defaultTrajectory,
    activePoint: null,
    speedFactor: parseFloat(localStorage.getItem(STORAGE_KEYS.speedFactor) || "1"),
    paused: false,
    cameraPosition: loadFromStorage(STORAGE_KEYS.cameraPosition, DEFAULT_CAMERA),
    controlsTarget: loadFromStorage(STORAGE_KEYS.controlsTarget, DEFAULT_TARGET),
    replayTrigger: 0,
    isLoading: false,

    setActivePoint: (point) => set({ activePoint: point }),

    setSpeedFactor: (val) => {
        saveToStorage(STORAGE_KEYS.speedFactor, val);
        set({ speedFactor: val });
    },

    setPaused: (val) => set({ paused: val }),

    setCameraPosition: (pos) => {
        saveToStorage(STORAGE_KEYS.cameraPosition, pos);
        set({ cameraPosition: pos });
    },

    setControlsTarget: (pos) => {
        saveToStorage(STORAGE_KEYS.controlsTarget, pos);
        set({ controlsTarget: pos });
    },

    triggerReplay: () =>
        set((state) => ({
            replayTrigger: state.replayTrigger + 1,
            paused: false
        })),

    reset: () =>
        set({
            speedFactor: 1,
            paused: false,
            cameraPosition: DEFAULT_CAMERA,
            controlsTarget: DEFAULT_TARGET,
            activePoint: null
        }),

    setIsLoading: (val: boolean) => set({ isLoading: val }),

    clearTrajectory: () => set({
        trajectoryArray: defaultTrajectory,
        activePoint: null,
        isLoading: false
    })
}));