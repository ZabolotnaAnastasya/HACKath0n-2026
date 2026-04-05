import { create } from "zustand";

interface FileLoadState {
    file: File | null;
    isFile: boolean;
}

interface FileLoadActions {
    setFile: (file: File | null) => void;
    clearFile: () => void;
}

export const useFileLoadStore = create<FileLoadState & FileLoadActions>((set) => ({
    file: null,
    isFile: false,

    setFile: (file) => set({ file, isFile: file !== null }),
    clearFile: () => set({ file: null, isFile: false })
}));
