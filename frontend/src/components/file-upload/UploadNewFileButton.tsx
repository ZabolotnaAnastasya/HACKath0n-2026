import { FiUpload } from "react-icons/fi";
import { useFileLoadStore } from "../../stores/useFileLoadStore";

interface UploadNewFileButtonProps {
    className?: string;
}

export const UploadNewFileButton = ({ className = "" }: UploadNewFileButtonProps) => {
    const { clearFile } = useFileLoadStore();

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter") {
            clearFile();
        }
    };

    return (
        <button
            onClick={clearFile}
            onKeyDown={handleKeyDown}
            className={`hover:cursor-pointer hover:scale-105 duration-200 bg-white text-black px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 ${className}`}
        >
            <FiUpload /> Upload New File
        </button>
    );
};
