import "./index.css";
import { FileUpload } from "./components/file-upload/FileUpload";
import { DashboardPage } from "./pages/DashboardPage";
import { useFileLoadStore } from "./stores/useFileLoadStore";
import { useUploadStore } from "./stores/useUploadStore";
import { useTrajectoryStore } from "./stores/useTrajectoryStore";

export default function App() {
    const { isFile } = useFileLoadStore();
    const { error } = useUploadStore();
    const { trajectoryArray } = useTrajectoryStore();

    // block dashboard until valid - check all conditions
    const shouldRenderDashboard = isFile === true && error === null && trajectoryArray.length > 0;

    return (
        <div className="min-h-screen min-w-screen bg-black text-white flex items-center justify-center">
            {shouldRenderDashboard ? <DashboardPage /> : <FileUpload />}
        </div>
    );
}