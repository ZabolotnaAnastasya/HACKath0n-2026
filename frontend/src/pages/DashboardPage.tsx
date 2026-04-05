import { MainLayout } from "../components/layout/MainLayout";
import { SceneContainer } from "../components/layout/SceneContainer";
import { Sidebar } from "../components/layout/Sidebar";
import { UploadNewFileButton } from "../components/file-upload/UploadNewFileButton";
import { InfoPanel } from "../components/info/InfoPanel";
import { MapView } from "../components/map/MapView";
import { TrajectoryScene } from "../components/trajectory/TrajectoryScene";
import { useUploadStore } from "../stores/useUploadStore";

const AnalysisSection = () => {
    const { analysis } = useUploadStore();

    return (
        <div
            id="analysis-section"
            className="w-full h-screen bg-black text-white p-6"
        >
            <h2 className="text-2xl font-bold mb-4">Analysis</h2>

            {analysis ? (
                <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-3 col-span-1">
                        <div className="bg-black border border-white p-2 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Max Horizontal Speed</p>
                            <p className="text-xl font-bold">{analysis.maxHorizontalSpeed.toFixed(2)} m/s</p>
                        </div>
                        <div className="bg-black border border-white p-2 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Max Vertical Speed</p>
                            <p className="text-xl font-bold">{analysis.maxVerticalSpeed.toFixed(2)} m/s</p>
                        </div>
                        <div className="bg-black border border-white p-2 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Max Acceleration</p>
                            <p className="text-xl font-bold">{analysis.maxAcceleration.toFixed(2)} m/s²</p>
                        </div>
                        <div className="bg-black border border-white p-2 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Max Climb</p>
                            <p className="text-xl font-bold">{analysis.maxClimb.toFixed(2)} m/s</p>
                        </div>
                        <div className="bg-black border border-white p-2 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Total Distance</p>
                            <p className="text-xl font-bold">{analysis.totalDistance.toFixed(2)} m</p>
                        </div>
                        <div className="bg-black border border-white p-2 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Total Duration</p>
                            <p className="text-xl font-bold">{analysis.totalDuration.toFixed(2)} s</p>
                        </div>
                    </div>

                    <div className="col-span-2 bg-black border border-white p-4 rounded-lg">
                        <p className="text-gray-400 text-xs mb-1">LLM Analysis</p>
                        <p className="text-sm leading-relaxed">{analysis.llmResponse}</p>
                    </div>
                </div>
            ) : (
                <p className="text-sm">No analysis data available.</p>
            )}
        </div>
    );
};
const TopSection = () => {
    const handleAnalysisClick = () => {
        const analysisSection = document.getElementById('analysis-section');
        if (analysisSection) {
            analysisSection.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    };

    return (
        <div style={{height: '100vh', minHeight: '100vh'}} className="w-full flex gap-4 p-6">
            <SceneContainer>
                <TrajectoryScene/>
            </SceneContainer>
            <Sidebar>
                <UploadNewFileButton/>
                <div className="bg-black text-white flex flex-col h-full">
                    <div className="flex border-b border-gray-700">
                        <div className="flex-1 px-4 py-2 text-sm font-medium opacity-70 border-b-2 border-white">
                            Points info
                        </div>
                        <button
                            onClick={handleAnalysisClick}
                            className="flex-1 px-4 py-2 text-sm font-medium opacity-100 hover:opacity-60 cursor-pointer bg-transparent text-white border-none"
                        >
                            Analysis
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <InfoPanel/>
                        <MapView/>
                    </div>
                </div>
            </Sidebar>
        </div>
    );
};

export const DashboardPage = () => {
    return (
        <MainLayout>
            <TopSection/>
            <AnalysisSection/>
        </MainLayout>
    );
};
