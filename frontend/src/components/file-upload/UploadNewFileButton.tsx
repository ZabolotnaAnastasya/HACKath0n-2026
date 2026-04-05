import { FiUpload } from "react-icons/fi";
import { useFileLoadStore } from "../../stores/useFileLoadStore";
import { useUploadStore } from "../../stores/useUploadStore";
import { useTrajectoryStore } from "../../stores/useTrajectoryStore";

interface UploadNewFileButtonProps {
    className?: string;
}

export const UploadNewFileButton = ({ className = "" }: UploadNewFileButtonProps) => {
    const { clearFile } = useFileLoadStore();
    const { clearUpload } = useUploadStore();
    const { reset, clearTrajectory } = useTrajectoryStore();

    const handleClick = () => {
        clearFile();
        clearUpload();
        reset();
        clearTrajectory(); // reset stores on new file
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter") {
            handleClick();
        }
    };

    return (
        <button
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`hover:cursor-pointer hover:scale-105 duration-200 bg-white text-black px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 ${className}`}
        >
            <FiUpload /> Upload New File
        </button>
    );
};
