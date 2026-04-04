import math

class FlightProcessor:
    @staticmethod
    def convert_to_local_system(gps_points):
        if not gps_points:
            return []

        start_alt = gps_points[0].get('alt', 0.0)
        takeoff_index = 0
        for i, p in enumerate(gps_points):
            if abs(p.get('alt', 0.0) - start_alt) > 1.0:
                takeoff_index = i
                break

        flight_points = gps_points[takeoff_index:]
        if not flight_points:
            flight_points = gps_points

        origin_pt = flight_points[0]
        origin_lat = origin_pt['lat']
        origin_lng = origin_pt['lng']
        origin_alt = origin_pt.get('alt', 0.0)
        origin_time = origin_pt['timestamp']

        lat_rad = math.radians(origin_lat)
        meters_per_degree_lat = 111320.0
        meters_per_degree_lng = 111320.0 * math.cos(lat_rad)

        processed = []
        for p in flight_points:
            d_lat = p['lat'] - origin_lat
            d_lng = p['lng'] - origin_lng

            x_meters = d_lng * meters_per_degree_lng
            y_meters = d_lat * meters_per_degree_lat
            z_meters = p.get('alt', 0.0) - origin_alt

            time_s = (p['timestamp'] - origin_time) / 1_000_000.0

            processed.append({
                "x": round(x_meters, 2),
                "y": round(y_meters, 2),
                "z": round(z_meters, 2),
                "speed": round(p.get('speed', 0.0), 2),
                "time_s": round(time_s, 3),
                "lat": p['lat'],
                "lon": p['lng'],
                "alt_abs": p.get('alt', 0.0)
            })
        return processed