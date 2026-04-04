import { create } from "zustand";
import type { TrajectoryPoint } from "../types/trajectory";
import { fetchTrajectory, type TrajectoryResponse } from "../config/backend";

export interface AnalysisData {
  maxSpeed: number;
  totalPoints: number;
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
    onSuccess: (trajectoryData: TrajectoryPoint[]) => void
  ) => Promise<void>;
  clearUpload: () => void;
  setAnalysis: (analysis: AnalysisData | null) => void;
}

export const useUploadStore = create<UploadState & UploadActions>((set) => ({
  isUploading: false,
  error: null,
  analysis: null,

  uploadFile: async (file, onSuccess) => {
    set({ isUploading: true, error: null, analysis: null });
    try {
      const response: TrajectoryResponse = await fetchTrajectory(file, 500);

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
        abs_alt: point.abs_alt,
      }));

      if (response.analysis) {
        set({
          analysis: {
            maxSpeed: response.analysis.max_speed,
            totalPoints: response.analysis.total_points,
            llmResponse: response.analysis.llm_response,
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
