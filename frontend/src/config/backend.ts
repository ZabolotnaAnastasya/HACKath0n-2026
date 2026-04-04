const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8000";

export const FETCH_TRAJECTORY_ENDPOINT = "/api/v1/process-log";

export interface TrajectoryResponse {
  status: "success" | "error";
  data?: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
    time_s: number;
    lat: number;
    lon: number;
    abs_alt: number;
  }>;
  analysis?: {
    max_speed: number;
    total_points: number;
    llm_response: string;
  };
  meta?: {
    filename: string;
  };
  message?: string;
}

export async function fetchTrajectory(
  file: File,
  maxPoints: number = 500
): Promise<TrajectoryResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(FETCH_TRAJECTORY_ENDPOINT, BACKEND_BASE_URL);
  url.searchParams.append("max_points", maxPoints.toString());

  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
