import { create } from "zustand";
import type { TrajectoryPoint } from "../types/trajectory";
import { fetchTrajectory, type TrajectoryResponse } from "../config/backend";

export interface AnalysisData {
  maxHorizontalSpeed: number;
  maxVerticalSpeed: number;
  maxAcceleration: number;
  maxClimb: number;
  totalDistance: number;
  totalDuration: number;
  llmResponse: string;
}

interface UploadState {
  isUploading: boolean;
  error: string | null;
  analysis: AnalysisData | null;
}

interface UploadActions {
  uploadFile: (
    file: File,
    maxPoints: number,
    onSuccess: (trajectoryData: TrajectoryPoint[]) => void
  ) => Promise<void>;
  clearUpload: () => void;
  setAnalysis: (analysis: AnalysisData | null) => void;
}

export const useUploadStore = create<UploadState & UploadActions>((set) => ({
  isUploading: false,
  error: null,
  analysis: null,

  uploadFile: async (file, maxPoints, onSuccess) => {
    set({ isUploading: true, error: null, analysis: null });
    try {
      const response: TrajectoryResponse = await fetchTrajectory(file, maxPoints);

      if (response.status === "error" || !response.data) {
        throw new Error(response.message || "Failed to process file");
      }

      const trajectoryData: TrajectoryPoint[] = response.data.map((point) => ({
        x: point.x,
        y: point.y,
        z: point.z,
        speed: point.speed,
        time_s: point.time_s,
        lat: point.lat,
        lon: point.lon,
        alt_abs: point.alt_abs,
      }));

      if (response.analysis) {
        set({
          analysis: {
            maxHorizontalSpeed: response.analysis.max_horizontal_speed_ms,
            maxVerticalSpeed: response.analysis.max_vertical_speed_ms,
            maxAcceleration: response.analysis.max_acceleration_m_s2,
            maxClimb: response.analysis.max_climb_ms,
            totalDistance: response.analysis.total_distance_m,
            totalDuration: response.analysis.total_duration_sec,
            llmResponse: response.ai_analysis || "",
          },
        });
      }

      onSuccess(trajectoryData);
      set({ isUploading: false });
    } catch (err) {
      set({
        isUploading: false,
        error: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  },

  clearUpload: () => set({ isUploading: false, error: null, analysis: null }),
  setAnalysis: (analysis) => set({ analysis }),
}));
