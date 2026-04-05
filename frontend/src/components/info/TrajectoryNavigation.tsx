import { useTrajectoryStore } from "../../stores/useTrajectoryStore";
import { scaleTrajectoryToGrid } from "../../helpers/threeHelpers";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

export const TrajectoryNavigation = () => {
    const { 
        trajectoryArray, 
        activePoint,
        setActivePoint, 
        setCameraPosition, 
        setControlsTarget 
    } = useTrajectoryStore();

    const handleGoToFirstPoint = () => {
        if (trajectoryArray.length === 0) return;
        
        const firstPoint = trajectoryArray[0];
        const { scaledPoints } = scaleTrajectoryToGrid(trajectoryArray);
        const firstScaledPoint = scaledPoints[0];
        
        // Set active point
        setActivePoint(firstPoint);
        
        // Set camera position and target to first point
        if (firstScaledPoint) {
            setCameraPosition({
                x: firstScaledPoint.x + 5,
                y: firstScaledPoint.y + 5,
                z: firstScaledPoint.z + 5
            });
            setControlsTarget({
                x: firstScaledPoint.x,
                y: firstScaledPoint.y,
                z: firstScaledPoint.z
            });
        }
    };

    const handleGoToLastPoint = () => {
        if (trajectoryArray.length === 0) return;
        
        const lastPoint = trajectoryArray[trajectoryArray.length - 1];
        const { scaledPoints } = scaleTrajectoryToGrid(trajectoryArray);
        const lastScaledPoint = scaledPoints[scaledPoints.length - 1];
        
        // Set active point
        setActivePoint(lastPoint);
        
        // Set camera position and target to last point
        if (lastScaledPoint) {
            setCameraPosition({
                x: lastScaledPoint.x + 5,
                y: lastScaledPoint.y + 5,
                z: lastScaledPoint.z + 5
            });
            setControlsTarget({
                x: lastScaledPoint.x,
                y: lastScaledPoint.y,
                z: lastScaledPoint.z
            });
        }
    };

    // Get current point index
    const getCurrentPointIndex = () => {
        if (!activePoint || trajectoryArray.length === 0) return 0;
        return trajectoryArray.findIndex(p => 
            p.x === activePoint.x && 
            p.y === activePoint.y && 
            p.z === activePoint.z && 
            p.time_s === activePoint.time_s
        );
    };

    const currentPointIndex = getCurrentPointIndex();
    const isFirstPoint = currentPointIndex === 0;
    const isLastPoint = currentPointIndex === trajectoryArray.length - 1;

    return (
        <div className="bg-black rounded-lg p-2">
            <div className="flex items-center justify-between">
                <button
                    onClick={handleGoToFirstPoint}
                    className={`font-medium py-1.5 px-2 rounded transition-all duration-150 hover:shadow-md active:scale-95 flex items-center justify-center ${
                        isFirstPoint || trajectoryArray.length === 0
                            ? 'text-gray-300 opacity-50 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-100 active:bg-gray-200 text-black cursor-pointer'
                    }`}
                    disabled={isFirstPoint || trajectoryArray.length === 0}
                >
                    <FaArrowLeft className="w-3 h-3" />
                </button>
                
                <span className="text-gray-500 text-xs">
                    point {currentPointIndex + 1}
                </span>
                
                <button
                    onClick={handleGoToLastPoint}
                    className={`font-medium py-1.5 px-2 rounded transition-all duration-150 hover:shadow-md active:scale-95 flex items-center justify-center ${
                        isLastPoint || trajectoryArray.length === 0
                            ? ' text-gray-300 opacity-50 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-100 active:bg-gray-200 text-black cursor-pointer'
                    }`}
                    disabled={isLastPoint || trajectoryArray.length === 0}
                >
                    <FaArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};
