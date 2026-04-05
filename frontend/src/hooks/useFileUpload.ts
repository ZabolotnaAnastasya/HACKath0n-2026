import { useState, useCallback } from "react";
import type { FileRejection } from "react-dropzone";
import { useFileLoadStore } from "../stores/useFileLoadStore";
import { useUploadStore } from "../stores/useUploadStore";
import { useTrajectoryStore } from "../stores/useTrajectoryStore";
import { useMaxPointsStore } from "../stores/useMaxPointsStore";

interface UseFileUploadReturn {
    tempFile: File | null;
    isUploadStarted: boolean;
    isUploading: boolean;
    uploadError: string | null;
    onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
    startUpload: (onSuccess?: () => void) => void;
    clearTempFile: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
    const { setFile, clearFile } = useFileLoadStore();
    const { uploadFile, isUploading, error: uploadError, clearUpload } = useUploadStore();
    const { maxPoints } = useMaxPointsStore();
    const setIsLoading = useTrajectoryStore((state) => state.setIsLoading);
    const setActivePoint = useTrajectoryStore((state) => state.setActivePoint);
    const clearTrajectory = useTrajectoryStore((state) => state.clearTrajectory);
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [isUploadStarted, setIsUploadStarted] = useState(false);

    // reset stores on new file selection
    const resetAllStores = useCallback(() => {
        clearUpload();
        clearTrajectory();
        clearFile();
        setTempFile(null);
        setIsUploadStarted(false);
        setIsLoading(false);
    }, [clearUpload, clearTrajectory, clearFile, setIsLoading]);

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            if (acceptedFiles.length > 0) {
                // reset stores on new file
                resetAllStores();
                setTempFile(acceptedFiles[0]);
            }
            rejectedFiles.forEach(() => {
                resetAllStores();
            });
        },
        [resetAllStores]
    );

    const startUpload = useCallback((onSuccess?: () => void) => {
        if (!tempFile) return;
        setFile(tempFile);
        setIsUploadStarted(true);
        setIsLoading(true);

        uploadFile(tempFile, maxPoints, (trajectoryData) => {
            // only update trajectory on success
            useTrajectoryStore.setState({ trajectoryArray: trajectoryData });
            setActivePoint(trajectoryData[0] || null);
            setIsLoading(false);
            onSuccess?.();
        });
    }, [tempFile, setFile, uploadFile, maxPoints, setIsLoading, setActivePoint]);

    const clearTempFile = useCallback(() => {
        resetAllStores();
    }, [resetAllStores]);

    return {
        tempFile,
        isUploadStarted,
        isUploading,
        uploadError,
        onDrop,
        startUpload,
        clearTempFile
    };
};
