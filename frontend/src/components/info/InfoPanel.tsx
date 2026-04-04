import { useTrajectoryStore } from "../../stores/useTrajectoryStore";
import { getDefaultPoint, formatCoordinate, formatNumber } from "../../helpers/trajectoryHelpers";
import { InfoRow } from "./InfoRow";
import { TrajectoryNavigation } from "./TrajectoryNavigation";

export const InfoPanel = () => {
    const { activePoint, trajectoryArray } = useTrajectoryStore();
    const point = activePoint || getDefaultPoint(trajectoryArray);

    if (!point) return null;

    return (
        <div className="flex flex-col gap-1">
            {/* Navigation Section */}
            <TrajectoryNavigation />
            
            {/* Point Info Section */}
            <div className="bg-black-900 rounded-[2px] p-2 text-sm flex flex-col gap-0.5">
                <div className="font-bold mb-1 text-xs">Point Info</div>

                <InfoRow label="Lat" value={formatCoordinate(point.lat)} />
                <InfoRow label="Lon" value={formatCoordinate(point.lon)} />

                <div className="border-t border-gray-700 my-0.5" />

                <InfoRow label="X" value={formatNumber(point.x)} />
                <InfoRow label="Y" value={formatNumber(point.y)} />
                <InfoRow label="Z (height)" value={formatNumber(point.z)} />

                <div className="border-t border-gray-700 my-0.5" />

                <InfoRow label="Speed" value={formatNumber(point.speed)} />
                <InfoRow label="Time" value={`${formatNumber(point.time_s)} ms`} />
            </div>
        </div>
    );
};
