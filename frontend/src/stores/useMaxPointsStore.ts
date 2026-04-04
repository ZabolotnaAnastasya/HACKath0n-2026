import { create } from "zustand";

interface MaxPointsState {
  maxPoints: number;
}

interface MaxPointsActions {
  setMaxPoints: (val: number) => void;
}

const STORAGE_KEY = "maxPoints";

const getInitialMaxPoints = (): number => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 1000;
};

export const useMaxPointsStore = create<MaxPointsState & MaxPointsActions>((set) => ({
  maxPoints: getInitialMaxPoints(),

  setMaxPoints: (val) => {
    localStorage.setItem(STORAGE_KEY, val.toString());
    set({ maxPoints: val });
  },
}));
