import { InfoPanel } from "./InfoPanel";
import { MapView } from "../map/MapView";

export const TabbedInfoPanel = () => {

    const handleAnalysisScroll = () => {
        const analysisSection = document.getElementById('analysis-section');
        if (analysisSection) {
            analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="bg-black text-white flex flex-col h-full">
            <div className="flex border-b border-gray-700">
                <button
                    className="flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer opacity-70 border-b-2 border-white hover:opacity-80"
                >
                    Points info
                </button>
                <button
                    onClick={handleAnalysisScroll}
                    className="flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer opacity-100 hover:opacity-60"
                >
                    Analysis
                </button>
            </div>

            <div className="flex-1">
                <div className="animate-fadeIn">
                    <InfoPanel />
                    <MapView />
                </div>
            </div>

            <div 
                id="analysis-section"
                className="w-full min-h-screen bg-black text-white p-8 flex flex-col"
            >
                <h2 className="text-3xl font-bold mb-6">Analysis</h2>
                <div className="space-y-4 text-base leading-relaxed">

                </div>
            </div>
        </div>
    );
};
