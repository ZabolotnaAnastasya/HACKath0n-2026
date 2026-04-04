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
            style={{
                width: '100%',
                minHeight: '100vh',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                padding: '50px'
            }}
        >
            <h2 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '24px' }}>Analysis</h2>
            <div style={{ lineHeight: '1.6' }}>
                {analysis ? (
                    <>
                        <p style={{ marginBottom: '16px' }}><strong>Max Speed:</strong> {analysis.maxSpeed.toFixed(2)} m/s</p>
                        <p style={{ marginBottom: '16px' }}><strong>Total Points:</strong> {analysis.totalPoints}</p>
                        <p style={{ marginBottom: '16px' }}><strong>LLM Response:</strong> {analysis.llmResponse}</p>
                    </>
                ) : (
                    <p>No analysis data available.</p>
                )}
            </div>
        </div>
    );
};

const TopSection = () => {
    const handleAnalysisClick = () => {
        const analysisSection = document.getElementById('analysis-section');
        if (analysisSection) {
            analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    return (
        <div style={{ height: '100vh', minHeight: '100vh' }} className="w-full flex gap-4 p-4">
            <SceneContainer>
                <TrajectoryScene />
            </SceneContainer>
            <Sidebar>
                <UploadNewFileButton />
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
                        <InfoPanel />
                        <MapView />
                    </div>
                </div>
            </Sidebar>
        </div>
    );
};

export const DashboardPage = () => {
    return (
        <MainLayout>
            <TopSection />
            <AnalysisSection />
        </MainLayout>
    );
};
