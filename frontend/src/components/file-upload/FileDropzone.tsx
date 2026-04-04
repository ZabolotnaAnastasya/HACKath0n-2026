import { useDropzone } from "react-dropzone";
import { useFileUpload } from "../../hooks/useFileUpload";

const MAX_SIZE = 1024 * 1024 * 100;
const MAX_FILES = 1;
const ACCEPTED_TYPES = { "application/octet-stream": [".bin"] };

interface FileDropzoneProps {
    onFileSelect: () => void;
}

export const FileDropzone = ({ onFileSelect }: FileDropzoneProps) => {
    const { tempFile, isUploading, uploadError, onDrop, startUpload } = useFileUpload();

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_TYPES,
        maxSize: MAX_SIZE,
        maxFiles: MAX_FILES
    });

    const handleUploadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        startUpload();
        onFileSelect();
    };

    return (
        <div
            {...getRootProps()}
            className={`flex justify-center items-center w-full h-screen transition-opacity duration-200 ${
                isDragActive ? "opacity-70" : "opacity-100"
            }`}
        >
            <div className="border-dashed border-2 border-gray-300 p-4 rounded-2xl w-8/12 min-h-[50%] flex flex-col justify-center items-center gap-4">
                <input {...getInputProps()} />

                {isDragActive ? (
                    <p>Drop the file here...</p>
                ) : (
                    <p>Drag & drop target .bin file here, or click to select a file</p>
                )}

                {tempFile && (
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="bg-white text-black px-4 py-2 rounded hover:cursor-pointer hover:scale-105 hover:opacity-80 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? "Loading..." : `Load ${tempFile.name}`}
                    </button>
                )}

                {uploadError && (
                    <p className="text-red-500">Error: {uploadError}</p>
                )}
            </div>
        </div>
    );
};
