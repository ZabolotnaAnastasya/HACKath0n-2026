import "./index.css";
import { FileUpload } from "./components/file-upload/FileUpload";
import { DashboardPage } from "./pages/DashboardPage";
import { useFileLoadStore } from "./stores/useFileLoadStore";

export default function App() {
    const { isFile } = useFileLoadStore();

    return (
        <div className="min-h-screen min-w-screen bg-black text-white flex items-center justify-center">
            {isFile ? <DashboardPage /> : <FileUpload />}
        </div>
    );
}