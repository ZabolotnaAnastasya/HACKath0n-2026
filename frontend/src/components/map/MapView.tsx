import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { MapController } from "./MapController";
import { useMapPosition } from "../../hooks/useMapPosition";
import "leaflet/dist/leaflet.css";

export const MapView = () => {
    const position = useMapPosition();

    return (
        <div className="w-full h-[250px] rounded-[2px] overflow-hidden">
            <MapContainer
                center={position}
                zoom={16}
                className="w-full h-full"
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapController />
                <Marker position={position} />
            </MapContainer>
        </div>
    );
};
