import pandas as pd
import numpy as np
import json
import matplotlib

matplotlib.use('macosx')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from backend.services.parsing_service import ParsingService
from backend.services.navigation.fusion import NavigationFusion


class TempGeo:
    def convert(self, df):
        if df.empty: return df
        lat0, lon0, alt0 = df.iloc[0]['Lat'], df.iloc[0]['Lon'], df.iloc[0]['Alt']
        df['x_enu'] = (df['Lon'] - lon0) * 111320 * np.cos(np.radians(lat0))
        df['y_enu'] = (df['Lat'] - lat0) * 111320
        df['z_enu'] = df['Alt'] - alt0
        return df


def run():
    log_name = "00000019.BIN"
    parser = ParsingService()
    imu_raw, gps_raw = parser.parse_file_by_path(log_name)
    gps_df = TempGeo().convert(gps_raw)

    imu_raw['TimeUS'] = imu_raw['TimeUS'].astype(np.int64)
    gps_df['TimeUS'] = gps_df['TimeUS'].astype(np.int64)

    traj_data = NavigationFusion().process_flight_data(imu_raw, gps_df)

    with open("trajectory_output.json", "w") as f:
        json.dump(traj_data, f, indent=4)

    res = pd.DataFrame(traj_data)
    fig = plt.figure(figsize=(10, 8))
    ax = fig.add_subplot(111, projection='3d')
    ax.plot(res['x'], res['y'], res['z'], label='Fusion (Merge)', color='blue', zorder=5)
    gps_pts = res[res['is_gps_step']]
    ax.scatter(gps_pts['x'], gps_pts['y'], gps_pts['z'], color='red', s=5, label='GPS', zorder=10)
    ax.set_box_aspect([1, 1, 1])
    plt.legend()
    plt.show()


if __name__ == "__main__":
    run()