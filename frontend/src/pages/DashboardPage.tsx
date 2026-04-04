import { MainLayout } from "../components/layout/MainLayout";
import { SceneContainer } from "../components/layout/SceneContainer";
import { Sidebar } from "../components/layout/Sidebar";
import { UploadNewFileButton } from "../components/file-upload/UploadNewFileButton";
import { InfoPanel } from "../components/info/InfoPanel";
import { MapView } from "../components/map/MapView";
import { TrajectoryScene } from "../components/trajectory/TrajectoryScene";
import { useTrajectoryStore } from "../stores/useTrajectoryStore";

// Analysis Section Component - Full width block below main interface
const AnalysisSection = () => {
    const loremText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    
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
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
                <p style={{ marginBottom: '24px' }}>{loremText}</p>
            </div>
        </div>
    );
};

// Top Section Component - Main interface (100vh)
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
                {/* Simple panel without tabs */}
                <div className="bg-black text-white flex flex-col h-full">
                    {/* Buttons */}
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
                    {/* Content */}
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
    const { isLoading, trajectoryArray } = useTrajectoryStore();
    console.log("[DashboardPage] isLoading:", isLoading, "trajectoryArray length:", trajectoryArray.length);
    
    return (
        <MainLayout>
            <TopSection />
            <AnalysisSection />
        </MainLayout>
    );
};
