import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { MapController } from "./MapController";
import { useMapPosition } from "../../hooks/useMapPosition";
import { useTrajectoryStore } from "../../stores/useTrajectoryStore";
import "leaflet/dist/leaflet.css";

export const MapView = () => {
    const position = useMapPosition();
    const { trajectoryArray } = useTrajectoryStore();

    const trajectoryPositions = trajectoryArray
        .filter((point) => point.lat !== undefined && point.lon !== undefined)
        .map((point) => [point.lat, point.lon] as [number, number]);

    return (
        <div className="w-full h-[250px] rounded-[2px] overflow-hidden">
            <MapContainer
                center={position as LatLngExpression}
                zoom={16}
                className="w-full h-full"
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController />
                {trajectoryPositions.length > 1 && (
                    <Polyline 
                        positions={trajectoryPositions} 
                        pathOptions={{ color: "#3b82f6", weight: 3 }} 
                    />
                )}
                <Marker position={position as LatLngExpression} />
            </MapContainer>
        </div>
    );
};
