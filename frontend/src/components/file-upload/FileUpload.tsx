import { FileDropzone } from "./FileDropzone";

interface FileUploadProps {
    onUploadComplete?: () => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
    const handleFileSelect = () => {
        onUploadComplete?.();
    };

    return <FileDropzone onFileSelect={handleFileSelect} />;
};
