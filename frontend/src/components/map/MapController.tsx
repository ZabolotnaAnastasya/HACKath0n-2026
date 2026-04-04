import { useMap } from "react-leaflet";
import { useEffect } from "react";
import { useTrajectoryStore } from "../../stores/useTrajectoryStore";
import { getDefaultPoint } from "../../helpers/trajectoryHelpers";

export const MapController = () => {
    const { activePoint, trajectoryArray } = useTrajectoryStore();
    const map = useMap();

    const targetPoint = activePoint || getDefaultPoint(trajectoryArray);

    useEffect(() => {
        if (!targetPoint) return;
        if (targetPoint.lat === undefined || targetPoint.lon === undefined) return;

        // Use setView to maintain current zoom level while centering on point
        map.setView([targetPoint.lat, targetPoint.lon], map.getZoom(), { animate: true });
    }, [activePoint, targetPoint, map]);

    return null;
};
