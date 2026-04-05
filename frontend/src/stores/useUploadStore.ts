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

      // show upload error if response status is not success or data is empty
      if (response.status === "error" || !response.data || response.data.length === 0) {
        const errorMessage = response.status === "error" 
          ? response.message || "Failed to process file"
          : "No trajectory data received";
        set({
          isUploading: false,
          error: errorMessage,
        });
        return; // do not render dashboard if error
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

      // only update trajectory on success
      onSuccess(trajectoryData);
      set({ isUploading: false });
    } catch (err) {
      // show upload error for any network or parsing errors
      set({
        isUploading: false,
        error: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  },

  clearUpload: () => set({ isUploading: false, error: null, analysis: null }),
  setAnalysis: (analysis) => set({ analysis }),
}));
