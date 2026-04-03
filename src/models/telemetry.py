from pydantic import BaseModel

class TelemetryPoint(BaseModel):
    timestamp: int
    lat: float
    lng: float
    alt: float
    speed: float