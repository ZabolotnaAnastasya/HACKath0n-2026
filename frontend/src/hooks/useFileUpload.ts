import { useState, useCallback } from "react";
import type { FileRejection } from "react-dropzone";
import { useFileLoadStore } from "../stores/useFileLoadStore";

// interface UseFileUploadOptions {
//     maxSize?: number;
//     maxFiles?: number;
//     acceptedFileTypes?: Record<string, string[]>;
// }

interface UseFileUploadReturn {
    tempFile: File | null;
    isUploadStarted: boolean;
    onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
    startUpload: () => void;
    clearTempFile: () => void;
}

export const useFileUpload = (
    // options: UseFileUploadOptions = {}
): UseFileUploadReturn => {
    const { setFile } = useFileLoadStore();
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [isUploadStarted, setIsUploadStarted] = useState(false);

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            if (acceptedFiles.length > 0) {
                setTempFile(acceptedFiles[0]);
                setIsUploadStarted(false);
            }
            rejectedFiles.forEach(() => {
                setTempFile(null);
                setIsUploadStarted(false);
            });
        },
        []
    );

    const startUpload = useCallback(() => {
        if (!tempFile) return;
        setFile(tempFile);
        setIsUploadStarted(true);
    }, [tempFile, setFile]);

    const clearTempFile = useCallback(() => {
        setTempFile(null);
        setIsUploadStarted(false);
    }, []);

    return {
        tempFile,
        isUploadStarted,
        onDrop,
        startUpload,
        clearTempFile
    };
};
