import { InfoPanel } from "./InfoPanel";
import { MapView } from "../map/MapView";

export const TabbedInfoPanel = () => {
    const loremText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

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
                    <p>{loremText}</p>
                    <p>{loremText}</p>
                    <p>{loremText}</p>
                    <p>{loremText}</p>
                    <p>{loremText}</p>
                </div>
            </div>
        </div>
    );
};
