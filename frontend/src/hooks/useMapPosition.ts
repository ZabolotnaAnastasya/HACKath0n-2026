import {useTrajectoryStore} from "../stores/useTrajectoryStore";
import {getDefaultPoint} from "../helpers/trajectoryHelpers.ts";


export const useMapPosition = () => {
    const { activePoint, trajectoryArray } = useTrajectoryStore();
    const startPoint = getDefaultPoint(trajectoryArray);

    if (activePoint?.lat !== undefined && activePoint?.lon !== undefined) {
        return [activePoint.lat, activePoint.lon];
    }

    if (startPoint?.lat !== undefined && startPoint?.lon !== undefined) {
        return [startPoint.lat, startPoint.lon];
    }

    return [50.45, 30.52];
};
